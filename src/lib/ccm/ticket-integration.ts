// ============================================
// EXTERNAL TICKETING SYSTEM INTEGRATION
// Supports Jira, ServiceNow, and generic webhook
// ============================================

export type TicketingProvider = "JIRA" | "SERVICENOW" | "WEBHOOK";

export interface TicketConfig {
  provider: TicketingProvider;
  baseUrl: string;
  apiToken: string;
  projectKey?: string; // Jira
  instanceId?: string; // ServiceNow
  defaultAssignee?: string;
  customFields?: Record<string, string>;
}

export interface TicketResult {
  success: boolean;
  ticketId?: string;
  ticketUrl?: string;
  error?: string;
}

export interface TicketPayload {
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  labels?: string[];
  assignee?: string;
  dueDate?: string;
  customFields?: Record<string, unknown>;
}

const REQUEST_TIMEOUT_MS = 15_000;

// Jira priority name → ID mapping (standard Jira defaults)
const JIRA_PRIORITY_MAP: Record<string, string> = {
  critical: "1",
  high: "2",
  medium: "3",
  low: "4",
};

// ServiceNow impact/urgency mapping (1=High, 2=Medium, 3=Low)
const SERVICENOW_IMPACT_MAP: Record<string, number> = {
  critical: 1,
  high: 1,
  medium: 2,
  low: 3,
};

const SERVICENOW_URGENCY_MAP: Record<string, number> = {
  critical: 1,
  high: 2,
  medium: 2,
  low: 3,
};

/**
 * Create a ticket from a compliance finding. Maps finding fields
 * to the ticketing system's format and creates via the appropriate API.
 */
export async function createTicketFromFinding(
  config: TicketConfig,
  finding: {
    id: string;
    title: string;
    description: string;
    severity: string;
    framework?: string;
    controlId?: string;
    aiAnalysis?: string;
    dueDate?: Date;
  }
): Promise<TicketResult> {
  const priorityMap: Record<string, TicketPayload["priority"]> = {
    CRITICAL: "critical",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
    INFO: "low",
  };

  const description = [
    `**Compliance Finding:** ${finding.title}`,
    "",
    finding.description,
    "",
    finding.framework ? `**Framework:** ${finding.framework}` : "",
    finding.controlId ? `**Control ID:** ${finding.controlId}` : "",
    finding.severity ? `**Severity:** ${finding.severity}` : "",
    "",
    finding.aiAnalysis
      ? `---\n**AI Analysis:**\n${finding.aiAnalysis}`
      : "",
    "",
    `_Created by AIGovHub CCM | Finding ID: ${finding.id}_`,
  ]
    .filter(Boolean)
    .join("\n");

  const payload: TicketPayload = {
    title: `[CCM] ${finding.title}`,
    description,
    priority: priorityMap[finding.severity] || "medium",
    labels: [
      "compliance",
      "ccm-auto",
      finding.framework?.toLowerCase() || "general",
    ].filter(Boolean),
    assignee: config.defaultAssignee,
    dueDate: finding.dueDate?.toISOString().split("T")[0],
    customFields: {
      ccm_finding_id: finding.id,
      ccm_severity: finding.severity,
      ccm_framework: finding.framework,
      ccm_control_id: finding.controlId,
      ...config.customFields,
    },
  };

  switch (config.provider) {
    case "JIRA":
      return createJiraTicket(config, payload);
    case "SERVICENOW":
      return createServiceNowTicket(config, payload);
    case "WEBHOOK":
      return createWebhookTicket(config, payload);
    default:
      return { success: false, error: `Unsupported provider: ${config.provider}` };
  }
}

/**
 * Create a ticket via Jira REST API v3.
 * Auth: Basic (email:apiToken base64 encoded).
 */
async function createJiraTicket(
  config: TicketConfig,
  payload: TicketPayload
): Promise<TicketResult> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/rest/api/3/issue`;

  // Build Atlassian Document Format (ADF) for the description
  const adfDescription = {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: payload.description }],
      },
    ],
  };

  const body: Record<string, unknown> = {
    fields: {
      project: { key: config.projectKey || "COMP" },
      summary: payload.title,
      description: adfDescription,
      issuetype: { name: "Task" },
      priority: { id: JIRA_PRIORITY_MAP[payload.priority] || "3" },
      labels: payload.labels,
    },
  };

  // Add assignee if provided
  if (payload.assignee) {
    (body.fields as Record<string, unknown>).assignee = {
      accountId: payload.assignee,
    };
  }

  // Add due date if provided
  if (payload.dueDate) {
    (body.fields as Record<string, unknown>).duedate = payload.dueDate;
  }

  // Add custom fields
  if (payload.customFields) {
    for (const [key, value] of Object.entries(payload.customFields)) {
      if (key.startsWith("customfield_")) {
        (body.fields as Record<string, unknown>)[key] = value;
      }
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(config.apiToken).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        error: `Jira API error ${response.status}: ${errorText.slice(0, 300)}`,
      };
    }

    const data = (await response.json()) as { id: string; key: string; self: string };
    const ticketUrl = `${config.baseUrl.replace(/\/$/, "")}/browse/${data.key}`;

    return {
      success: true,
      ticketId: data.key,
      ticketUrl,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error
        ? err.name === "AbortError"
          ? "Jira request timed out"
          : err.message
        : String(err),
    };
  }
}

/**
 * Create an incident via ServiceNow REST API.
 * Auth: Bearer token.
 */
async function createServiceNowTicket(
  config: TicketConfig,
  payload: TicketPayload
): Promise<TicketResult> {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const url = `${baseUrl}/api/now/table/incident`;

  const body: Record<string, unknown> = {
    short_description: payload.title,
    description: payload.description,
    impact: SERVICENOW_IMPACT_MAP[payload.priority] || 2,
    urgency: SERVICENOW_URGENCY_MAP[payload.priority] || 2,
    category: "Compliance",
    subcategory: "Automated Finding",
    contact_type: "System",
  };

  if (payload.assignee) {
    body.assigned_to = payload.assignee;
  }

  if (payload.dueDate) {
    body.due_date = payload.dueDate;
  }

  // Add custom fields directly
  if (payload.customFields) {
    for (const [key, value] of Object.entries(payload.customFields)) {
      if (key.startsWith("u_")) {
        body[key] = value;
      }
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        error: `ServiceNow API error ${response.status}: ${errorText.slice(0, 300)}`,
      };
    }

    const data = (await response.json()) as {
      result: { sys_id: string; number: string };
    };
    const ticketId = data.result.number;
    const ticketUrl = `${baseUrl}/nav_to.do?uri=incident.do?sys_id=${data.result.sys_id}`;

    return {
      success: true,
      ticketId,
      ticketUrl,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error
        ? err.name === "AbortError"
          ? "ServiceNow request timed out"
          : err.message
        : String(err),
    };
  }
}

/**
 * Create a ticket via generic webhook POST.
 * Sends the payload as JSON to the configured URL.
 */
async function createWebhookTicket(
  config: TicketConfig,
  payload: TicketPayload
): Promise<TicketResult> {
  const url = config.baseUrl.replace(/\/$/, "");

  const body = {
    source: "aigovhub-ccm",
    timestamp: new Date().toISOString(),
    ...payload,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (config.apiToken) {
      headers.Authorization = `Bearer ${config.apiToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        error: `Webhook error ${response.status}: ${errorText.slice(0, 300)}`,
      };
    }

    // Try to parse a ticket ID from the response
    let ticketId: string | undefined;
    let ticketUrl: string | undefined;
    try {
      const data = (await response.json()) as Record<string, unknown>;
      ticketId =
        (data.ticketId as string) ||
        (data.id as string) ||
        (data.key as string) ||
        undefined;
      ticketUrl = (data.ticketUrl as string) || (data.url as string) || undefined;
    } catch {
      // Response may not be JSON
    }

    return {
      success: true,
      ticketId: ticketId || `webhook-${Date.now()}`,
      ticketUrl,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error
        ? err.name === "AbortError"
          ? "Webhook request timed out"
          : err.message
        : String(err),
    };
  }
}

/**
 * Sync ticket status back from the external ticketing system.
 * Returns the current status and last update time.
 */
export async function syncTicketStatus(
  config: TicketConfig,
  ticketId: string
): Promise<{ status: string; lastUpdated: string } | null> {
  try {
    switch (config.provider) {
      case "JIRA": {
        const url = `${config.baseUrl.replace(/\/$/, "")}/rest/api/3/issue/${ticketId}?fields=status,updated`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(url, {
          headers: {
            Authorization: `Basic ${Buffer.from(config.apiToken).toString("base64")}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);
        if (!response.ok) return null;

        const data = (await response.json()) as {
          fields: {
            status: { name: string };
            updated: string;
          };
        };
        return {
          status: data.fields.status.name,
          lastUpdated: data.fields.updated,
        };
      }

      case "SERVICENOW": {
        const baseUrl = config.baseUrl.replace(/\/$/, "");
        const url = `${baseUrl}/api/now/table/incident?sysparm_query=number=${encodeURIComponent(ticketId)}&sysparm_fields=state,sys_updated_on&sysparm_limit=1`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${config.apiToken}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);
        if (!response.ok) return null;

        const data = (await response.json()) as {
          result: { state: string; sys_updated_on: string }[];
        };

        if (!data.result?.length) return null;

        // Map ServiceNow numeric state to readable status
        const stateMap: Record<string, string> = {
          "1": "New",
          "2": "In Progress",
          "3": "On Hold",
          "6": "Resolved",
          "7": "Closed",
          "8": "Canceled",
        };

        return {
          status: stateMap[data.result[0].state] || data.result[0].state,
          lastUpdated: data.result[0].sys_updated_on,
        };
      }

      case "WEBHOOK":
        // Generic webhooks don't have a standard status query mechanism
        return null;

      default:
        return null;
    }
  } catch (err) {
    console.error(
      `[CCM Tickets] Failed to sync status for ${ticketId}:`,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}
