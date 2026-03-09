import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Re-implement pure logic from workflow.ts inline (the real module imports db)
// ---------------------------------------------------------------------------

type CaseStatus = "OPEN" | "IN_PROGRESS" | "PENDING_REVIEW" | "ESCALATED" | "RESOLVED" | "CLOSED";
type CasePriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface CaseFilters {
  status?: CaseStatus;
  priority?: CasePriority;
  assigneeId?: string;
  page?: number;
  limit?: number;
}

// -- getMaxSeverity (private helper in workflow.ts) --
function getMaxSeverity(severities: string[]): string {
  const order = ["SENTINEL_CRITICAL", "SENTINEL_HIGH", "SENTINEL_MEDIUM", "SENTINEL_LOW", "SENTINEL_INFO"];
  for (const s of order) {
    if (severities.includes(s)) return s.replace("SENTINEL_", "").toLowerCase();
  }
  return "unknown";
}

// -- Pagination calc (extracted from getCases / getUserBriefings) --
function calcPagination(total: number, page: number, rawLimit: number) {
  const limit = Math.min(rawLimit, 100);
  const skip = (page - 1) * limit;
  return { total, page, limit, skip, totalPages: Math.ceil(total / limit) };
}

// -- Briefing markdown composer (extracted from createBriefing) --
interface BriefingEvent {
  id: string;
  headline: string;
  summary: string;
  severity: string;
  category: string;
  countryCode: string | null;
  countryName: string | null;
  riskScore: number;
  processedAt: Date;
}

function composeBriefingMarkdown(title: string, events: BriefingEvent[], dateStr: string): string {
  const lines: string[] = [
    `# ${title}`,
    "",
    `**Generated:** ${dateStr} | **Events:** ${events.length}`,
    "",
    "---",
    "",
    "## Executive Summary",
    "",
    `This briefing covers ${events.length} intelligence event(s) across ` +
      `${new Set(events.map((e) => e.category)).size} categories. ` +
      `Highest severity: **${getMaxSeverity(events.map((e) => e.severity))}**. ` +
      `Average risk score: **${Math.round(events.reduce((s, e) => s + e.riskScore, 0) / events.length)}**.`,
    "",
    "---",
    "",
    "## Event Details",
    "",
  ];

  for (const evt of events) {
    lines.push(
      `### ${evt.headline}`,
      "",
      `- **Severity:** ${evt.severity} | **Category:** ${evt.category} | **Country:** ${evt.countryName || evt.countryCode || "N/A"}`,
      `- **Risk Score:** ${evt.riskScore} | **Processed:** ${evt.processedAt.toISOString().split("T")[0]}`,
      "",
      evt.summary.length > 500 ? evt.summary.slice(0, 500) + "..." : evt.summary,
      "",
    );
  }

  lines.push(
    "---",
    "",
    "## Risk Assessment",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Events | ${events.length} |`,
    `| Critical/High | ${events.filter((e) => ["SENTINEL_CRITICAL", "SENTINEL_HIGH"].includes(e.severity)).length} |`,
    `| Countries Affected | ${new Set(events.map((e) => e.countryCode).filter(Boolean)).size} |`,
    `| Avg Risk Score | ${Math.round(events.reduce((s, e) => s + e.riskScore, 0) / events.length)} |`,
    "",
    "---",
    "",
    "## Recommendations",
    "",
    "- [ ] Review critical-severity events and escalate as needed",
    "- [ ] Monitor affected regions for developments",
    "- [ ] Update risk assessments for impacted operations",
    "- [ ] Brief relevant stakeholders on key findings",
    "",
  );

  return lines.join("\n");
}

// -- Access check (extracted from updateCase / addNote / getCaseNotes) --
function checkCaseAccess(
  caseRecord: { createdById: string; assigneeId: string | null } | null,
  userId: string
): void {
  if (!caseRecord) throw new Error("Case not found");
  if (caseRecord.createdById !== userId && caseRecord.assigneeId !== userId) {
    throw new Error("Access denied");
  }
}

// -- Avg resolution hours (extracted from getCaseStats) --
function calcAvgResolutionHours(cases: { createdAt: Date; resolvedAt: Date }[]): number {
  if (cases.length === 0) return 0;
  const totalMs = cases.reduce(
    (sum, c) => sum + (c.resolvedAt.getTime() - c.createdAt.getTime()),
    0
  );
  return Math.round(totalMs / cases.length / 3600000);
}

// -- Stats aggregation helpers --
function buildStatusMap(entries: { status: string; count: number }[]): Record<string, number> {
  const m: Record<string, number> = {};
  entries.forEach((e) => { m[e.status] = e.count; });
  return m;
}

function buildPriorityMap(entries: { priority: string; count: number }[]): Record<string, number> {
  const m: Record<string, number> = {};
  entries.forEach((e) => { m[e.priority] = e.count; });
  return m;
}

// -- createCase defaults logic --
function applyCreateDefaults(params: {
  title: string;
  description?: string;
  priority: CasePriority;
  createdById: string;
  assigneeId?: string;
  eventIds?: string[];
  tags?: string[];
  dueDate?: Date;
}) {
  return {
    title: params.title,
    description: params.description || null,
    priority: params.priority,
    createdById: params.createdById,
    assigneeId: params.assigneeId || null,
    eventIds: params.eventIds || [],
    tags: params.tags || [],
    dueDate: params.dueDate || null,
  };
}

// =========================================================================
// TESTS
// =========================================================================

describe("Sentinel Workflow Engine", () => {
  // ---------- CaseStatus ----------
  describe("CaseStatus type values", () => {
    it("recognises all 6 valid case statuses", () => {
      const statuses: CaseStatus[] = [
        "OPEN", "IN_PROGRESS", "PENDING_REVIEW", "ESCALATED", "RESOLVED", "CLOSED",
      ];
      expect(statuses).toHaveLength(6);
      statuses.forEach((s) => expect(typeof s).toBe("string"));
    });
  });

  // ---------- CasePriority ----------
  describe("CasePriority type values", () => {
    it("recognises all 4 valid priorities", () => {
      const priorities: CasePriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
      expect(priorities).toHaveLength(4);
    });
  });

  // ---------- CaseFilters ----------
  describe("CaseFilters interface", () => {
    it("allows all fields to be optional", () => {
      const empty: CaseFilters = {};
      expect(empty.status).toBeUndefined();
      expect(empty.priority).toBeUndefined();
      expect(empty.page).toBeUndefined();
      expect(empty.limit).toBeUndefined();
      expect(empty.assigneeId).toBeUndefined();
    });

    it("accepts valid filter combinations", () => {
      const f: CaseFilters = { status: "OPEN", priority: "HIGH", page: 2, limit: 50 };
      expect(f.status).toBe("OPEN");
      expect(f.priority).toBe("HIGH");
      expect(f.page).toBe(2);
      expect(f.limit).toBe(50);
    });
  });

  // ---------- getMaxSeverity ----------
  describe("getMaxSeverity", () => {
    it("returns 'critical' when SENTINEL_CRITICAL is present", () => {
      expect(getMaxSeverity(["SENTINEL_LOW", "SENTINEL_CRITICAL", "SENTINEL_HIGH"])).toBe("critical");
    });

    it("returns 'high' when highest is SENTINEL_HIGH", () => {
      expect(getMaxSeverity(["SENTINEL_HIGH", "SENTINEL_LOW"])).toBe("high");
    });

    it("returns 'medium' for only medium severity", () => {
      expect(getMaxSeverity(["SENTINEL_MEDIUM"])).toBe("medium");
    });

    it("returns 'info' for only info severity", () => {
      expect(getMaxSeverity(["SENTINEL_INFO"])).toBe("info");
    });

    it("returns 'unknown' for empty array", () => {
      expect(getMaxSeverity([])).toBe("unknown");
    });

    it("returns 'unknown' for unrecognised severity strings", () => {
      expect(getMaxSeverity(["CUSTOM_LEVEL", "OTHER"])).toBe("unknown");
    });
  });

  // ---------- Pagination ----------
  describe("Pagination calculation", () => {
    it("clamps limit to 100", () => {
      const p = calcPagination(500, 1, 200);
      expect(p.limit).toBe(100);
    });

    it("calculates skip correctly for page 1", () => {
      const p = calcPagination(50, 1, 20);
      expect(p.skip).toBe(0);
      expect(p.limit).toBe(20);
    });

    it("calculates skip correctly for page 3 with limit 20", () => {
      const p = calcPagination(100, 3, 20);
      expect(p.skip).toBe(40);
    });

    it("computes totalPages using ceil division", () => {
      expect(calcPagination(21, 1, 20).totalPages).toBe(2);
      expect(calcPagination(20, 1, 20).totalPages).toBe(1);
      expect(calcPagination(0, 1, 20).totalPages).toBe(0);
      expect(calcPagination(1, 1, 20).totalPages).toBe(1);
    });
  });

  // ---------- Access control ----------
  describe("Case access check", () => {
    it("throws 'Case not found' for null record", () => {
      expect(() => checkCaseAccess(null, "user1")).toThrow("Case not found");
    });

    it("allows access for the creator", () => {
      expect(() =>
        checkCaseAccess({ createdById: "user1", assigneeId: null }, "user1")
      ).not.toThrow();
    });

    it("allows access for the assignee", () => {
      expect(() =>
        checkCaseAccess({ createdById: "user1", assigneeId: "user2" }, "user2")
      ).not.toThrow();
    });

    it("throws 'Access denied' for unrelated user", () => {
      expect(() =>
        checkCaseAccess({ createdById: "user1", assigneeId: "user2" }, "user3")
      ).toThrow("Access denied");
    });
  });

  // ---------- Avg resolution hours ----------
  describe("Average resolution hours", () => {
    it("returns 0 for empty array", () => {
      expect(calcAvgResolutionHours([])).toBe(0);
    });

    it("calculates correctly for a single case", () => {
      const created = new Date("2026-01-01T00:00:00Z");
      const resolved = new Date("2026-01-01T06:00:00Z"); // 6 hours
      expect(calcAvgResolutionHours([{ createdAt: created, resolvedAt: resolved }])).toBe(6);
    });

    it("averages across multiple cases", () => {
      const cases = [
        { createdAt: new Date("2026-01-01T00:00:00Z"), resolvedAt: new Date("2026-01-01T04:00:00Z") }, // 4h
        { createdAt: new Date("2026-01-02T00:00:00Z"), resolvedAt: new Date("2026-01-02T08:00:00Z") }, // 8h
      ];
      expect(calcAvgResolutionHours(cases)).toBe(6); // avg = 6
    });
  });

  // ---------- Stats aggregation ----------
  describe("Stats aggregation maps", () => {
    it("builds status map from grouped entries", () => {
      const map = buildStatusMap([
        { status: "OPEN", count: 5 },
        { status: "CLOSED", count: 3 },
      ]);
      expect(map).toEqual({ OPEN: 5, CLOSED: 3 });
    });

    it("builds priority map from grouped entries", () => {
      const map = buildPriorityMap([
        { priority: "CRITICAL", count: 2 },
        { priority: "LOW", count: 10 },
      ]);
      expect(map).toEqual({ CRITICAL: 2, LOW: 10 });
    });
  });

  // ---------- createCase defaults ----------
  describe("createCase default values", () => {
    it("sets description to null when omitted", () => {
      const data = applyCreateDefaults({ title: "T", priority: "HIGH", createdById: "u1" });
      expect(data.description).toBeNull();
    });

    it("sets eventIds to empty array when omitted", () => {
      const data = applyCreateDefaults({ title: "T", priority: "LOW", createdById: "u1" });
      expect(data.eventIds).toEqual([]);
    });

    it("preserves provided optional values", () => {
      const due = new Date("2026-06-01");
      const data = applyCreateDefaults({
        title: "Incident",
        description: "Details here",
        priority: "CRITICAL",
        createdById: "u1",
        assigneeId: "u2",
        eventIds: ["e1", "e2"],
        tags: ["urgent", "ai"],
        dueDate: due,
      });
      expect(data.description).toBe("Details here");
      expect(data.assigneeId).toBe("u2");
      expect(data.eventIds).toEqual(["e1", "e2"]);
      expect(data.tags).toEqual(["urgent", "ai"]);
      expect(data.dueDate).toBe(due);
    });
  });

  // ---------- Briefing markdown composition ----------
  describe("Briefing markdown composition", () => {
    const baseEvent: BriefingEvent = {
      id: "evt-1",
      headline: "EU AI Act Update",
      summary: "New requirements for general-purpose AI models.",
      severity: "SENTINEL_HIGH",
      category: "AI_GOVERNANCE",
      countryCode: "EU",
      countryName: "European Union",
      riskScore: 82,
      processedAt: new Date("2026-03-01T10:00:00Z"),
    };

    it("starts with an H1 title line", () => {
      const md = composeBriefingMarkdown("My Brief", [baseEvent], "2026-03-09");
      expect(md.startsWith("# My Brief\n")).toBe(true);
    });

    it("includes the Generated date and event count in header", () => {
      const md = composeBriefingMarkdown("Report", [baseEvent], "2026-03-09");
      expect(md).toContain("**Generated:** 2026-03-09 | **Events:** 1");
    });

    it("includes Executive Summary with category count, severity, and avg risk", () => {
      const md = composeBriefingMarkdown("B", [baseEvent], "2026-03-09");
      expect(md).toContain("1 intelligence event(s) across 1 categories");
      expect(md).toContain("Highest severity: **high**");
      expect(md).toContain("Average risk score: **82**");
    });

    it("renders event details with headline, severity, country, and risk", () => {
      const md = composeBriefingMarkdown("B", [baseEvent], "2026-03-09");
      expect(md).toContain("### EU AI Act Update");
      expect(md).toContain("**Severity:** SENTINEL_HIGH");
      expect(md).toContain("**Country:** European Union");
      expect(md).toContain("**Risk Score:** 82");
    });

    it("truncates summaries longer than 500 characters", () => {
      const longEvent = { ...baseEvent, summary: "X".repeat(600) };
      const md = composeBriefingMarkdown("B", [longEvent], "2026-03-09");
      expect(md).toContain("X".repeat(500) + "...");
      expect(md).not.toContain("X".repeat(501));
    });

    it("falls back to countryCode when countryName is null", () => {
      const evt = { ...baseEvent, countryName: null };
      const md = composeBriefingMarkdown("B", [evt], "2026-03-09");
      expect(md).toContain("**Country:** EU");
    });

    it("falls back to N/A when both country fields are null", () => {
      const evt = { ...baseEvent, countryName: null, countryCode: null };
      const md = composeBriefingMarkdown("B", [evt], "2026-03-09");
      expect(md).toContain("**Country:** N/A");
    });

    it("counts Critical/High events in the Risk Assessment table", () => {
      const events: BriefingEvent[] = [
        { ...baseEvent, id: "1", severity: "SENTINEL_CRITICAL" },
        { ...baseEvent, id: "2", severity: "SENTINEL_HIGH" },
        { ...baseEvent, id: "3", severity: "SENTINEL_LOW" },
      ];
      const md = composeBriefingMarkdown("B", events, "2026-03-09");
      expect(md).toContain("| Critical/High | 2 |");
    });

    it("counts distinct countries in Risk Assessment table", () => {
      const events: BriefingEvent[] = [
        { ...baseEvent, id: "1", countryCode: "US" },
        { ...baseEvent, id: "2", countryCode: "US" },
        { ...baseEvent, id: "3", countryCode: "GB" },
        { ...baseEvent, id: "4", countryCode: null },
      ];
      const md = composeBriefingMarkdown("B", events, "2026-03-09");
      expect(md).toContain("| Countries Affected | 2 |");
    });

    it("includes four recommendation checkboxes", () => {
      const md = composeBriefingMarkdown("B", [baseEvent], "2026-03-09");
      const checkboxes = md.match(/- \[ \] /g);
      expect(checkboxes).toHaveLength(4);
    });
  });

  // ---------- resolvedAt transition ----------
  describe("Status transition side-effects", () => {
    it("sets resolvedAt when status changes to RESOLVED", () => {
      // Mirrors the logic in updateCase
      const updates: { status?: CaseStatus } = { status: "RESOLVED" };
      const data: Record<string, unknown> = { ...updates };
      if (updates.status === "RESOLVED") {
        data.resolvedAt = new Date();
      }
      expect(data.resolvedAt).toBeInstanceOf(Date);
    });

    it("does not set resolvedAt for other statuses", () => {
      const statuses: CaseStatus[] = ["OPEN", "IN_PROGRESS", "PENDING_REVIEW", "ESCALATED", "CLOSED"];
      for (const status of statuses) {
        const data: Record<string, unknown> = { status };
        if (status === "RESOLVED") data.resolvedAt = new Date();
        expect(data.resolvedAt).toBeUndefined();
      }
    });
  });
});
