/**
 * AI Image Generator for Blog Articles
 *
 * Generates professional hero images for articles using free AI image APIs.
 * Primary: Together.ai (FLUX.1-schnell, free tier — high quality)
 * Fallback: Pollinations.ai (unlimited, no API key needed)
 */

// ============================================
// DOMAIN → VISUAL STYLE MAPPING
// ============================================

const DOMAIN_STYLES: Record<string, string> = {
  "ai-governance":
    "futuristic digital brain with glowing neural pathways, deep blue and teal tones, abstract data visualization",
  "cybersecurity":
    "digital shield with flowing data streams, dark background with neon cyan accents, cyber defense visualization",
  "data-privacy":
    "abstract lock composed of data particles, purple and indigo gradient, privacy protection concept",
  "e-invoicing":
    "modern digital document flow with connected nodes, clean green and white palette, electronic transaction",
  "esg":
    "sustainable earth with digital overlay, green and gold tones, environmental data visualization",
  "fintech":
    "abstract financial network with glowing connections, dark blue with gold accents, modern banking technology",
  "hr-compliance":
    "professional workplace with digital overlay, warm orange and blue tones, human resources technology",
  "tax-compliance":
    "structured digital ledger with flowing numbers, deep navy and silver, regulatory data grid",
};

const DEFAULT_STYLE =
  "abstract professional technology visualization, deep blue gradient with glowing accent lines, modern enterprise";

// ============================================
// PROMPT BUILDER
// ============================================

/**
 * Build an image generation prompt from article metadata.
 * Produces clean, professional, abstract visuals (no text, no people).
 */
function buildImagePrompt(
  title: string,
  category: string,
  tags: string[],
): string {
  const domainStyle = DOMAIN_STYLES[category] || DEFAULT_STYLE;

  // Extract key concepts from title for visual relevance
  const titleConcepts = title
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 3)
    .join(", ");

  return [
    `Professional editorial illustration for a compliance technology article.`,
    `Visual theme: ${domainStyle}.`,
    titleConcepts ? `Conceptual elements related to: ${titleConcepts}.` : "",
    `Style: Ultra-modern, abstract, cinematic lighting, 4K quality.`,
    `Clean composition with dark gradient background.`,
    `No text, no letters, no words, no people, no faces, no hands.`,
    `Suitable for a professional business blog header image.`,
  ]
    .filter(Boolean)
    .join(" ");
}

// ============================================
// TOGETHER.AI (FLUX.1-SCHNELL) — PRIMARY
// ============================================

interface TogetherImageResponse {
  data: Array<{
    b64_json?: string;
    url?: string;
  }>;
}

/**
 * Generate image via Together.ai FLUX.1-schnell (free tier).
 * Requires TOGETHER_API_KEY env var.
 * Returns a base64 data URL or null on failure.
 */
async function generateWithTogether(prompt: string): Promise<string | null> {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      "https://api.together.xyz/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/FLUX.1-schnell-Free",
          prompt,
          width: 1200,
          height: 630,
          steps: 4,
          n: 1,
          response_format: "b64_json",
        }),
      },
    );

    if (!response.ok) {
      console.error(
        `[ImageGenerator] Together.ai returned ${response.status}: ${await response.text()}`,
      );
      return null;
    }

    const data = (await response.json()) as TogetherImageResponse;
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return null;

    // Upload to imgbb for permanent hosting (free, no expiry)
    const hostedUrl = await uploadToImgbb(b64);
    if (hostedUrl) return hostedUrl;

    // Fallback: return as data URL (works but not ideal for SEO)
    return `data:image/png;base64,${b64}`;
  } catch (err) {
    console.error(
      "[ImageGenerator] Together.ai failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

// ============================================
// IMGBB — FREE IMAGE HOSTING
// ============================================

interface ImgbbResponse {
  success: boolean;
  data?: {
    url: string;
    display_url: string;
  };
}

/**
 * Upload base64 image to imgbb.com for permanent free hosting.
 * Requires IMGBB_API_KEY env var (free at api.imgbb.com).
 */
async function uploadToImgbb(base64Image: string): Promise<string | null> {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) return null;

  try {
    const formData = new FormData();
    formData.append("key", apiKey);
    formData.append("image", base64Image);

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as ImgbbResponse;
    return data.data?.display_url || null;
  } catch {
    return null;
  }
}

// ============================================
// POLLINATIONS.AI — FALLBACK (NO API KEY)
// ============================================

/**
 * Generate image URL via Pollinations.ai (completely free, no API key).
 * Uses Flux model. URL is the hosted image — no upload needed.
 * Adding a seed based on the prompt hash ensures deterministic results.
 */
function generateWithPollinations(prompt: string): string {
  // Create a simple numeric hash from the prompt for deterministic seed
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const seed = Math.abs(hash);

  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=630&seed=${seed}&model=flux&nologo=true`;
}

// ============================================
// PUBLIC API
// ============================================

export interface ImageGenerationResult {
  url: string;
  provider: "together" | "pollinations";
  prompt: string;
}

/**
 * Generate a hero image for a blog article.
 * Tries Together.ai first (better quality), falls back to Pollinations.ai.
 */
export async function generateArticleImage(
  title: string,
  category: string,
  tags: string[] = [],
): Promise<ImageGenerationResult> {
  const prompt = buildImagePrompt(title, category, tags);

  console.log(
    `[ImageGenerator] Generating image for "${title.slice(0, 50)}..." (${category})`,
  );

  // Try Together.ai first (higher quality)
  const togetherUrl = await generateWithTogether(prompt);
  if (togetherUrl) {
    console.log(`[ImageGenerator] Generated via Together.ai`);
    return { url: togetherUrl, provider: "together", prompt };
  }

  // Fallback to Pollinations.ai (always works, no API key)
  const pollinationsUrl = generateWithPollinations(prompt);
  console.log(`[ImageGenerator] Generated via Pollinations.ai (fallback)`);
  return { url: pollinationsUrl, provider: "pollinations", prompt };
}

/**
 * Generate images for multiple articles in batch.
 * Processes sequentially to respect rate limits.
 */
export async function generateArticleImages(
  articles: Array<{
    taskId: string;
    title: string;
    category: string;
    tags: string[];
  }>,
): Promise<Map<string, ImageGenerationResult>> {
  const results = new Map<string, ImageGenerationResult>();

  for (const article of articles) {
    try {
      const result = await generateArticleImage(
        article.title,
        article.category,
        article.tags,
      );
      results.set(article.taskId, result);
    } catch (err) {
      console.error(
        `[ImageGenerator] Failed for task ${article.taskId}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return results;
}
