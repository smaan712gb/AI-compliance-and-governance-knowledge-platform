// ============================================
// AI SYSTEM INVENTORY CONSTANTS
// ============================================

export const MODEL_TYPES = [
  { value: "llm", label: "Large Language Model (LLM)" },
  { value: "classification", label: "Classification / Categorization" },
  { value: "regression", label: "Regression / Prediction" },
  { value: "computer_vision", label: "Computer Vision / Image Recognition" },
  { value: "nlp", label: "NLP / Text Analysis" },
  { value: "recommendation", label: "Recommendation System" },
  { value: "generative", label: "Generative AI (Non-LLM)" },
  { value: "reinforcement_learning", label: "Reinforcement Learning / Agent" },
] as const;

export const MODEL_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google (Gemini / Vertex AI)" },
  { value: "meta", label: "Meta (Llama)" },
  { value: "microsoft", label: "Microsoft (Azure AI)" },
  { value: "amazon", label: "Amazon (Bedrock / SageMaker)" },
  { value: "huggingface", label: "Hugging Face (Open Source)" },
  { value: "custom", label: "Custom / In-House" },
  { value: "other", label: "Other" },
] as const;

export const DATA_SENSITIVITY_LEVELS = [
  { value: "public", label: "Public", color: "green" },
  { value: "internal", label: "Internal / Confidential", color: "yellow" },
  { value: "sensitive", label: "Sensitive (PII/PHI/Financial)", color: "orange" },
  { value: "restricted", label: "Restricted / Classified", color: "red" },
] as const;

export const AI_DEPLOYMENT_STATUSES = [
  { value: "DEVELOPMENT", label: "In Development" },
  { value: "TESTING", label: "Testing / Staging" },
  { value: "ACTIVE", label: "Active / Production" },
  { value: "MONITORING", label: "Under Enhanced Monitoring" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "RETIRED", label: "Retired / Decommissioned" },
] as const;

export const AI_RISK_LEVELS = [
  { value: "UNACCEPTABLE", label: "Unacceptable Risk (Prohibited)", color: "red", euAiAct: "Art. 5 — Banned practices" },
  { value: "HIGH", label: "High Risk", color: "orange", euAiAct: "Annex III — Biometrics, critical infrastructure, employment, etc." },
  { value: "LIMITED", label: "Limited Risk (Transparency)", color: "yellow", euAiAct: "Art. 50 — Chatbots, deepfakes, emotion recognition" },
  { value: "MINIMAL", label: "Minimal Risk", color: "green", euAiAct: "No specific obligations, voluntary codes" },
  { value: "GPAI", label: "General Purpose AI", color: "blue", euAiAct: "Art. 51–56 — Technical documentation, copyright, transparency" },
  { value: "GPAI_SYSTEMIC", label: "GPAI with Systemic Risk", color: "purple", euAiAct: "Art. 51–56 + model evaluation, adversarial testing, incident reporting" },
] as const;

export const AFFECTED_PERSON_TYPES = [
  { value: "employees", label: "Employees" },
  { value: "customers", label: "Customers / End Users" },
  { value: "citizens", label: "Citizens / General Public" },
  { value: "patients", label: "Patients" },
  { value: "students", label: "Students" },
  { value: "applicants", label: "Job Applicants" },
  { value: "vendors", label: "Vendors / Partners" },
] as const;

export type ModelTypeValue = (typeof MODEL_TYPES)[number]["value"];
export type ModelProviderValue = (typeof MODEL_PROVIDERS)[number]["value"];
export type DataSensitivityValue = (typeof DATA_SENSITIVITY_LEVELS)[number]["value"];
export type AIDeploymentStatusValue = (typeof AI_DEPLOYMENT_STATUSES)[number]["value"];
