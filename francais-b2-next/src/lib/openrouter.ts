import "server-only";

import OpenAI from "openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");
  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": "https://vibe-francais.app",
      "X-Title": "Francais-B2",
    },
  });
}

/** 调用 OpenRouter LLM，返回纯文本响应 */
export async function callLLM(
  system: string,
  user: string,
  options?: { model?: string; temperature?: number },
): Promise<string> {
  const client = getClient();
  const resp = await client.chat.completions.create({
    model: options?.model ?? DEFAULT_MODEL,
    temperature: options?.temperature ?? 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return resp.choices[0]?.message?.content ?? "";
}

/** 解析 LLM 返回的 JSON（自动去除 markdown 代码围栏） */
export function parseJsonResponse(raw: string): unknown {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.split("\n").slice(1).join("\n");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, cleaned.lastIndexOf("```"));
  }
  return JSON.parse(cleaned.trim());
}
