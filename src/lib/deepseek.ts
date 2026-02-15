import OpenAI from "openai";

let _deepseek: OpenAI | null = null;

export function getDeepSeek(): OpenAI {
  if (!_deepseek) {
    _deepseek = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY!,
    });
  }
  return _deepseek;
}

export const deepseek = new Proxy({} as OpenAI, {
  get(_, prop) {
    return (getDeepSeek() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
