import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DEFAULT_CONFIG } from "@/lib/agents/config";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function updateSetting(formData: FormData) {
  "use server";
  const key = formData.get("key") as string;
  const rawValue = formData.get("value") as string;
  const type = formData.get("type") as string;

  let value: unknown;
  switch (type) {
    case "number":
      value = parseFloat(rawValue);
      break;
    case "boolean":
      value = rawValue === "true";
      break;
    default:
      value = rawValue;
  }

  await db.agentSettings.upsert({
    where: { key },
    update: { value: value as never },
    create: { key, value: value as never },
  });

  revalidatePath("/admin/agents/settings");
}

export default async function AgentSettingsPage() {
  const settings = await db.agentSettings.findMany();
  const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

  const configFields = [
    {
      key: "enabled",
      label: "Pipeline Enabled",
      description: "Master switch — disables all automated runs when off",
      type: "boolean" as const,
      default: DEFAULT_CONFIG.enabled,
    },
    {
      key: "dailyArticleTarget",
      label: "Daily Article Target",
      description: "How many articles the pipeline tries to produce per run",
      type: "number" as const,
      default: DEFAULT_CONFIG.dailyArticleTarget,
    },
    {
      key: "maxRewriteAttempts",
      label: "Max Rewrite Attempts",
      description: "How many times QA can send an article back for revision",
      type: "number" as const,
      default: DEFAULT_CONFIG.maxRewriteAttempts,
    },
    {
      key: "minQAScore",
      label: "Minimum QA Score",
      description: "Articles below this score (out of 10) are sent back or rejected",
      type: "number" as const,
      default: DEFAULT_CONFIG.minQAScore,
    },
    {
      key: "researchSourceLimit",
      label: "Research Source Limit",
      description: "Maximum sources to process per research run",
      type: "number" as const,
      default: DEFAULT_CONFIG.researchSourceLimit,
    },
    {
      key: "evidenceExpiryDays",
      label: "Evidence Expiry (days)",
      description: "How long evidence cards remain before expiring",
      type: "number" as const,
      default: DEFAULT_CONFIG.evidenceExpiryDays,
    },
    {
      key: "model",
      label: "Default Model",
      description: "Default model for Research, Writer, and Publisher agents",
      type: "string" as const,
      default: DEFAULT_CONFIG.model,
    },
    {
      key: "plannerModel",
      label: "Planner Model",
      description: "Model for the Planner agent — deepseek-reasoner enables chain-of-thought reasoning",
      type: "string" as const,
      default: DEFAULT_CONFIG.plannerModel,
    },
    {
      key: "qaModel",
      label: "QA Model",
      description: "Model for the QA agent — deepseek-reasoner enables deep fact-checking and reasoning",
      type: "string" as const,
      default: DEFAULT_CONFIG.qaModel,
    },
    {
      key: "writerTemperature",
      label: "Writer Temperature",
      description: "Higher = more creative writing (0.0-1.0)",
      type: "number" as const,
      default: DEFAULT_CONFIG.writerTemperature,
    },
    {
      key: "maxTokensPerArticle",
      label: "Max Tokens Per Article",
      description: "Maximum output tokens for article generation",
      type: "number" as const,
      default: DEFAULT_CONFIG.maxTokensPerArticle,
    },
    {
      key: "budgetLimitUsd",
      label: "Budget Limit (USD)",
      description: "Pipeline stops if cost exceeds this amount per run",
      type: "number" as const,
      default: DEFAULT_CONFIG.budgetLimitUsd,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pipeline Settings</h1>

      <div className="space-y-4">
        {configFields.map((field) => {
          const currentValue = settingsMap.has(field.key)
            ? settingsMap.get(field.key)
            : field.default;

          return (
            <Card key={field.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{field.label}</CardTitle>
                <CardDescription>{field.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateSetting} className="flex items-center gap-3">
                  <input type="hidden" name="key" value={field.key} />
                  <input type="hidden" name="type" value={field.type} />

                  {field.type === "boolean" ? (
                    <select
                      name="value"
                      defaultValue={String(currentValue)}
                      className="rounded-md border px-3 py-2 text-sm w-32"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : (
                    <input
                      name="value"
                      type={field.type === "number" ? "number" : "text"}
                      step={field.type === "number" ? "0.1" : undefined}
                      defaultValue={String(currentValue)}
                      className="rounded-md border px-3 py-2 text-sm w-48"
                    />
                  )}

                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Save
                  </button>

                  <span className="text-xs text-muted-foreground">
                    Default: {String(field.default)}
                  </span>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
