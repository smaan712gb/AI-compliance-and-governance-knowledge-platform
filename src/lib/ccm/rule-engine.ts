import { db } from "@/lib/db";
import type { MonitoringRule, ERPDataPoint } from "@prisma/client";

/**
 * Evaluates a monitoring rule against data points.
 * Returns IDs of data points that violate the rule.
 */
export async function evaluateRule(
  rule: MonitoringRule,
  dataPoints: ERPDataPoint[]
): Promise<{
  violations: ERPDataPoint[];
  scanned: number;
}> {
  const definition = rule.ruleDefinition as {
    type: string;
    conditions: Record<string, unknown>;
  };

  if (!definition?.type || !definition?.conditions) {
    return { violations: [], scanned: dataPoints.length };
  }

  const violations: ERPDataPoint[] = [];

  for (const dp of dataPoints) {
    const data = dp.data as Record<string, unknown>;
    if (!data) continue;

    let violated = false;

    switch (definition.type) {
      case "threshold":
        violated = evaluateThreshold(data, definition.conditions);
        break;
      case "pattern":
        violated = evaluatePattern(data, definition.conditions);
        break;
      case "missing_control":
        violated = evaluateMissingControl(data, definition.conditions);
        break;
      case "sod":
        violated = evaluateSoD(data, definition.conditions);
        break;
      case "access":
        violated = evaluateAccess(data, definition.conditions);
        break;
    }

    if (violated) {
      violations.push(dp);
    }
  }

  return { violations, scanned: dataPoints.length };
}

function evaluateThreshold(
  data: Record<string, unknown>,
  conditions: Record<string, unknown>
): boolean {
  const field = conditions.field as string;
  const operator = conditions.operator as string;
  const value = conditions.value as number;

  if (!field || !operator || value === undefined) return false;

  const fieldValue = getNestedValue(data, field);
  if (fieldValue === undefined || fieldValue === null) return false;

  const numValue = Number(fieldValue);
  if (isNaN(numValue)) return false;

  switch (operator) {
    case ">": return numValue > value;
    case ">=": return numValue >= value;
    case "<": return numValue < value;
    case "<=": return numValue <= value;
    case "==": return numValue === value;
    case "!=": return numValue !== value;
    default: return false;
  }
}

function evaluatePattern(
  data: Record<string, unknown>,
  conditions: Record<string, unknown>
): boolean {
  const field = conditions.field as string;
  const pattern = conditions.pattern as string;
  const negate = conditions.negate as boolean;

  if (!field || !pattern) return false;

  const fieldValue = String(getNestedValue(data, field) || "");
  try {
    const regex = new RegExp(pattern, "i");
    const matches = regex.test(fieldValue);
    return negate ? !matches : matches;
  } catch {
    return false;
  }
}

function evaluateMissingControl(
  data: Record<string, unknown>,
  conditions: Record<string, unknown>
): boolean {
  const requiredFields = conditions.requiredFields as string[];
  if (!requiredFields?.length) return false;

  return requiredFields.some((field) => {
    const value = getNestedValue(data, field);
    return value === undefined || value === null || value === "";
  });
}

function evaluateSoD(
  data: Record<string, unknown>,
  conditions: Record<string, unknown>
): boolean {
  const conflictingRoles = conditions.conflictingRoles as string[][];
  if (!conflictingRoles?.length) return false;

  const userRoles = (data.roles || data.roleAssignments || []) as {
    role?: string;
    name?: string;
    validFrom?: string;
    validTo?: string;
  }[];

  // Only consider roles that are currently active (validFrom <= now <= validTo).
  // If a role has no validity dates, treat it as always active.
  const now = new Date();
  const activeRoles = userRoles
    .filter((r) => {
      const from = r.validFrom ? new Date(r.validFrom) : null;
      const to = r.validTo ? new Date(r.validTo) : null;
      if (from && from > now) return false;
      if (to && to < now) return false;
      return true;
    })
    .map((r) => (r.role || r.name || "").toUpperCase());

  return conflictingRoles.some((conflict) => {
    return conflict.every((role) => activeRoles.includes(role.toUpperCase()));
  });
}

function evaluateAccess(
  data: Record<string, unknown>,
  conditions: Record<string, unknown>
): boolean {
  const blockedValues = conditions.blockedValues as string[];
  const field = conditions.field as string;

  if (!field || !blockedValues?.length) return false;

  const fieldValue = String(getNestedValue(data, field) || "").toUpperCase();
  return blockedValues.some((blocked) => blocked.toUpperCase() === fieldValue);
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Runs all active rules for an organization against recent data points.
 */
export async function runMonitoringCycle(organizationId: string): Promise<{
  rulesEvaluated: number;
  findingsCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let rulesEvaluated = 0;
  let findingsCreated = 0;

  const rules = await db.monitoringRule.findMany({
    where: { organizationId, isActive: true },
  });

  for (const rule of rules) {
    try {
      // Look back at least 24h, or longer if the rule syncs infrequently.
      // e.g. a rule with syncFrequencyHours=168 (weekly) needs a 7-day window.
      const syncFrequencyHours = (rule as unknown as { syncFrequencyHours?: number }).syncFrequencyHours ?? 24;
      const lookbackMs = Math.max(syncFrequencyHours, 24) * 60 * 60 * 1000;
      // Scale record limit with lookback to avoid blind spots on high-volume systems.
      const recordLimit = Math.min(50000, Math.max(5000, syncFrequencyHours * 200));

      // Get data points matching the rule's domain from the last sync window
      const dataPoints = await db.eRPDataPoint.findMany({
        where: {
          connector: { organizationId },
          domain: rule.domain === "ALL" ? undefined : rule.domain,
          pulledAt: { gte: new Date(Date.now() - lookbackMs) },
        },
        take: recordLimit,
      });

      if (dataPoints.length === 0) continue;

      // Create monitoring run
      const run = await db.monitoringRun.create({
        data: {
          ruleId: rule.id,
          status: "MON_RUNNING",
          startedAt: new Date(),
          dataPointsScanned: dataPoints.length,
        },
      });

      const { violations, scanned } = await evaluateRule(rule, dataPoints);

      // Create findings for violations — skip if finding already exists for
      // this rule + data point to prevent duplicates across monitoring cycles.
      for (const dp of violations) {
        const existing = await db.finding.findFirst({
          where: {
            ruleId: rule.id,
            dataPoints: { some: { dataPointId: dp.id } },
            status: "OPEN",
          },
          select: { id: true },
        });

        if (existing) continue; // Already flagged — don't duplicate

        await db.finding.create({
          data: {
            organizationId,
            ruleId: rule.id,
            title: `${rule.name} violation detected`,
            description: `Rule "${rule.name}" flagged a ${dp.dataType} record.`,
            severity: rule.severity,
            status: "OPEN",
            framework: rule.framework,
            controlId: rule.controlId,
            dataPoints: {
              create: { dataPointId: dp.id },
            },
          },
        });
        findingsCreated++;

        // Flag the data point
        await db.eRPDataPoint.update({
          where: { id: dp.id },
          data: {
            flagged: true,
            severity: rule.severity,
          },
        });
      }

      // Complete the monitoring run
      await db.monitoringRun.update({
        where: { id: run.id },
        data: {
          status: "MON_COMPLETED",
          completedAt: new Date(),
          dataPointsScanned: scanned,
          findingsCreated: violations.length,
        },
      });

      rulesEvaluated++;
    } catch (err) {
      errors.push(`Rule ${rule.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { rulesEvaluated, findingsCreated, errors };
}
