import { db } from "@/lib/db";
import type { AgentResult } from "./types";

// ============================================
// ALERT MATCHER AGENT
// ============================================
// Matches new RegulatoryAlerts to CompanyProfiles based on
// country overlap, industry match, and compliance domain match.
// Pure DB logic — no DeepSeek calls needed.

interface AlertMatchResult {
  alertsProcessed: number;
  matchesCreated: number;
  errors: string[];
}

export async function runAlertMatcher(): Promise<AgentResult<AlertMatchResult>> {
  const errors: string[] = [];
  let alertsProcessed = 0;
  let matchesCreated = 0;

  try {
    // ── 1. Find alerts from last 6 hours with no CompanyAlert records yet ──
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const unmatchedAlerts = await db.regulatoryAlert.findMany({
      where: {
        createdAt: { gte: sixHoursAgo },
        isActive: true,
        companies: { none: {} },
      },
    });

    console.log(
      `[AlertMatcher] Found ${unmatchedAlerts.length} unmatched alerts from last 6 hours`,
    );

    if (unmatchedAlerts.length === 0) {
      return {
        success: true,
        data: { alertsProcessed: 0, matchesCreated: 0, errors: [] },
        tokensUsed: 0,
        costUsd: 0,
      };
    }

    // ── 2. Load all company profiles once (more efficient than per-alert queries) ──
    const companyProfiles = await db.companyProfile.findMany({
      where: { onboardingComplete: true },
    });

    console.log(
      `[AlertMatcher] Loaded ${companyProfiles.length} onboarded company profiles`,
    );

    if (companyProfiles.length === 0) {
      console.log("[AlertMatcher] No onboarded companies — nothing to match");
      return {
        success: true,
        data: {
          alertsProcessed: unmatchedAlerts.length,
          matchesCreated: 0,
          errors: [],
        },
        tokensUsed: 0,
        costUsd: 0,
      };
    }

    // ── 3. Match each alert to relevant companies ──────────────────────
    for (const alert of unmatchedAlerts) {
      try {
        alertsProcessed++;

        const matchingCompanies = companyProfiles.filter((company) => {
          // Country match: company operatingCountries overlaps with alert affectedCountries
          // If affectedCountries is empty, the alert affects all countries
          const countryMatch =
            alert.affectedCountries.length === 0 ||
            company.operatingCountries.some((cc) =>
              alert.affectedCountries.includes(cc),
            );

          if (!countryMatch) return false;

          // Industry match: company industry is in affectedIndustries
          // If affectedIndustries is empty, the alert affects all industries
          const industryMatch =
            alert.affectedIndustries.length === 0 ||
            alert.affectedIndustries.some(
              (ind) =>
                ind.toLowerCase() === company.industry.toLowerCase() ||
                company.industry.toLowerCase().includes(ind.toLowerCase()) ||
                ind.toLowerCase().includes(company.industry.toLowerCase()),
            );

          if (!industryMatch) return false;

          // Domain match: company complianceDomains includes alert domain
          // If complianceDomains is empty, the company is interested in all domains
          const domainMatch =
            company.complianceDomains.length === 0 ||
            company.complianceDomains.includes(alert.domain);

          return domainMatch;
        });

        if (matchingCompanies.length === 0) {
          console.log(
            `[AlertMatcher] Alert "${alert.title.slice(0, 50)}..." matched 0 companies`,
          );
          continue;
        }

        // ── 4. Create CompanyAlert junction records ──────────────────
        // Use createMany with skipDuplicates to handle the unique constraint
        const createData = matchingCompanies.map((company) => ({
          companyId: company.id,
          alertId: alert.id,
        }));

        const result = await db.companyAlert.createMany({
          data: createData,
          skipDuplicates: true,
        });

        matchesCreated += result.count;

        console.log(
          `[AlertMatcher] Alert "${alert.title.slice(0, 50)}..." matched ${result.count} companies`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Alert "${alert.title.slice(0, 60)}": ${message}`);
        console.log(
          `[AlertMatcher] Error matching alert "${alert.title.slice(0, 50)}...": ${message}`,
        );
      }
    }

    console.log(
      `[AlertMatcher] Complete — processed ${alertsProcessed} alerts, created ${matchesCreated} matches`,
    );

    return {
      success: errors.length === 0,
      data: {
        alertsProcessed,
        matchesCreated,
        errors,
      },
      error: errors.length > 0 ? errors.join("; ") : undefined,
      tokensUsed: 0,
      costUsd: 0,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[AlertMatcher] Fatal error: ${message}`);
    return {
      success: false,
      data: { alertsProcessed, matchesCreated, errors: [message] },
      error: message,
      tokensUsed: 0,
      costUsd: 0,
    };
  }
}
