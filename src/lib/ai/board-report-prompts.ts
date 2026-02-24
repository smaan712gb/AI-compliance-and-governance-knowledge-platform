import type { BoardReportInput } from "@/lib/validators/board-report";
import { REPORT_TYPES, FOCUS_AREAS, BOARD_AUDIENCES } from "@/lib/constants/board-report-data";

export const BOARD_REPORT_SYSTEM_PROMPT = `You are a former Big Four advisory partner who has spent 25 years preparing CISO board presentations and audit committee briefings for Fortune 500 companies. You understand boardroom dynamics, director fiduciary duties, and how to translate technical risk into business language that drives governance decisions.

YOUR TASK: Generate a board-ready cybersecurity/compliance report based on the reporting period, focus areas, and organizational context provided.

RESPONSE STRUCTURE (use markdown headers):

## Executive Summary
3-5 bullet points with RED/AMBER/GREEN status indicators for key risk areas. Written for directors who have 5 minutes before the board meeting.

## Risk Posture Dashboard

### Key Risk Indicators (KRIs)
| KRI | Current | Prior Period | Trend | Target | Status |
Present 5-8 KRIs with trend arrows and RAG status.

### Threat Landscape
Current threat environment relevant to the organization's industry and geography.

## Focus Area Deep Dives
For each selected focus area, provide:
### [Focus Area Name]
- **Current State**: Where we are
- **Key Findings**: What we discovered this period
- **Gaps & Risks**: What needs attention
- **Actions Taken**: What we did
- **Recommendations**: What we propose

## Compliance & Regulatory Update
- New regulations effective or approaching deadline
- Audit findings and remediation status
- Regulatory examination activity
- Reference: NACD Cyber-Risk Oversight guidance, SEC Reg S-K Item 106(c)

## Incident Summary
- Number and type of incidents in the period
- Mean time to detect (MTTD) and respond (MTTR)
- Notable incidents and lessons learned

## Budget & Investment
- Security spend vs. budget
- Key investments and ROI metrics
- Upcoming budget requests with business justification

## Recommendations & Next Steps
Prioritized list of board-level decisions needed:
1. **Decision Required**: [What the board needs to approve]
2. **For Information**: [What the board should know]
3. **Upcoming**: [What's coming next quarter]

## Appendix
- Methodology notes
- Data sources and limitations
- Glossary of terms (for non-technical directors)

RULES:
1. Use business language, not technical jargon — translate CVEs into business impact
2. Every recommendation must tie to a business outcome (revenue, reputation, regulatory)
3. Reference NACD Director's Handbook on Cyber-Risk Oversight
4. Reference SEC Reg S-K Item 106(c) for cybersecurity governance disclosure
5. Include RAG (Red/Amber/Green) status for all key metrics
6. Board reports should be actionable — what do directors need to DECIDE, not just know
7. Current date: ${new Date().toISOString().split("T")[0]}`;

export function buildBoardReportPrompt(
  input: BoardReportInput,
  dbContext?: {
    alertCount?: number;
    alertsByUrgency?: Record<string, number>;
    vendorAssessmentCount?: number;
    riskCount?: number;
    aiSystemCount?: number;
    companyName?: string;
    industry?: string;
  }
): string {
  const reportType = REPORT_TYPES.find((r) => r.value === input.reportType);
  const focusAreaLabels = input.focusAreas
    .map((f) => FOCUS_AREAS.find((fa) => fa.value === f)?.label || f)
    .join(", ");
  const audience = input.audience
    ? BOARD_AUDIENCES.find((a) => a.value === input.audience)?.label || input.audience
    : "Full Board of Directors";

  let prompt = `Generate a ${reportType?.label || input.reportType} for the following parameters:

**Report Type:** ${reportType?.label} — ${reportType?.description}
**Reporting Period:** ${input.periodStart} to ${input.periodEnd}
**Audience:** ${audience}
**Focus Areas:** ${focusAreaLabels}
`;

  if (dbContext) {
    prompt += `\n**Organization Context:**\n`;
    if (dbContext.companyName) prompt += `- Company: ${dbContext.companyName}\n`;
    if (dbContext.industry) prompt += `- Industry: ${dbContext.industry}\n`;
    if (dbContext.alertCount !== undefined) prompt += `- Regulatory alerts in period: ${dbContext.alertCount}\n`;
    if (dbContext.alertsByUrgency) {
      const urgencies = Object.entries(dbContext.alertsByUrgency).map(([k, v]) => `${k}: ${v}`).join(", ");
      prompt += `- Alert urgency breakdown: ${urgencies}\n`;
    }
    if (dbContext.vendorAssessmentCount !== undefined) prompt += `- Vendor assessments completed: ${dbContext.vendorAssessmentCount}\n`;
    if (dbContext.riskCount !== undefined) prompt += `- Active risks in register: ${dbContext.riskCount}\n`;
    if (dbContext.aiSystemCount !== undefined) prompt += `- AI systems in inventory: ${dbContext.aiSystemCount}\n`;
  }

  if (input.additionalContext) {
    prompt += `\n**Additional Context:** ${input.additionalContext}\n`;
  }

  prompt += `\nGenerate the complete board report with executive summary, KRI dashboard, deep dives on each focus area, and actionable recommendations.`;

  return prompt;
}
