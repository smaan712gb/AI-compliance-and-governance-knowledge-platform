import type {
  AgentTaskType,
  ContentType,
  AgentTaskStatus,
} from "@prisma/client";

// ============================================
// AGENT RESULT WRAPPER
// ============================================

export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  tokensUsed: number;
  costUsd: number;
}

// ============================================
// RESEARCH AGENT TYPES
// ============================================

export interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  content?: string;
}

export interface ResearchFinding {
  title: string;
  url: string;
  summary: string;
  keyFindings: string[];
  relevanceScore: number;
  category: string;
  tags: string[];
}

export interface ResearchResult {
  newEvidenceCards: number;
  sourcesProcessed: number;
  errors: string[];
}

// ============================================
// PLANNER AGENT TYPES
// ============================================

export interface ContentBrief {
  type: AgentTaskType;
  title: string;
  slug: string;
  brief: string;
  targetKeywords: string[];
  targetWordCount: number;
  priority: number;
  evidenceCardIds: string[];
  vendorMentions?: string[];
}

export interface PlannerResult {
  tasksCreated: number;
  briefs: ContentBrief[];
}

// ============================================
// WRITER AGENT TYPES
// ============================================

export interface WrittenArticle {
  taskId: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  body: string;
  tags: string[];
  category: string;
}

export interface WriterResult {
  articlesWritten: number;
  articles: WrittenArticle[];
}

// ============================================
// QA AGENT TYPES
// ============================================

export interface QAScores {
  accuracy: number;
  seoOptimization: number;
  readability: number;
  completeness: number;
  originality: number;
  ctaEffectiveness: number;
  complianceExpertise: number;
  professionalTone: number;
}

export interface QAReport {
  taskId: string;
  scores: QAScores;
  averageScore: number;
  approved: boolean;
  feedback: string;
  suggestions: string[];
}

export interface QAResult {
  reviewed: number;
  approved: number;
  sentBack: number;
  rejected: number;
  reports: QAReport[];
}

// ============================================
// PUBLISHER AGENT TYPES
// ============================================

export interface SocialPost {
  platform: "TWITTER" | "LINKEDIN";
  content: string;
  hashtags: string[];
}

export interface PublishResult {
  published: number;
  socialPostsCreated: number;
}

// ============================================
// PIPELINE CONFIG
// ============================================

export interface PipelineConfig {
  enabled: boolean;
  dailyArticleTarget: number;
  maxRewriteAttempts: number;
  minQAScore: number;
  researchSourceLimit: number;
  evidenceExpiryDays: number;
  model: string;
  writerTemperature: number;
  maxTokensPerArticle: number;
  budgetLimitUsd: number;
}

// ============================================
// CONTENT TYPE MAPPING
// ============================================

export const TASK_TYPE_TO_CONTENT_TYPE: Record<AgentTaskType, ContentType> = {
  BLOG_POST: "BLOG_POST",
  BEST_OF: "BEST_OF",
  COMPARISON: "COMPARISON",
  ALTERNATIVES: "ALTERNATIVES",
  GUIDE: "GUIDE",
  NEWS_BRIEF: "BLOG_POST",
  VENDOR_UPDATE: "BLOG_POST",
};

// ============================================
// TOKEN COST TRACKING
// ============================================

// DeepSeek pricing (approximate)
export const DEEPSEEK_COST_PER_1K_INPUT = 0.00014;
export const DEEPSEEK_COST_PER_1K_OUTPUT = 0.00028;

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    (inputTokens / 1000) * DEEPSEEK_COST_PER_1K_INPUT +
    (outputTokens / 1000) * DEEPSEEK_COST_PER_1K_OUTPUT
  );
}
