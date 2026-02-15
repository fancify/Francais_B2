import { NextRequest, NextResponse } from "next/server";

import { callLLM, parseJsonResponse } from "@/lib/openrouter";
import type { ExamCEData } from "@/lib/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { theme } = body as { theme?: string };

    if (!theme) {
      return NextResponse.json(
        { error: "Missing required field: theme" },
        { status: 400 },
      );
    }

    const system = `You are a DELF B2 exam creator. Generate a "Compréhension des écrits" section for the theme: "${theme}".

Create a realistic French article or opinion piece (~300 words) related to the theme, then generate 6 comprehension questions.

JSON format:
{
  "article": "<the full article text in French>",
  "source_description": "<e.g. 'Article paru dans Le Monde, 2024'>",
  "questions": [
    {
      "id": 1,
      "question": "<question in French>",
      "options": ["A. <answer>", "B. <answer>", "C. <answer>", "D. <answer>"],
      "correct": "B"
    }
  ]
}

Requirements:
- The article should read like a real newspaper/magazine piece with a clear argumentative structure
- Questions should test: main idea (1), detail retrieval (2), vocabulary in context (1), author's opinion/tone (1), inference (1)
- All in French. Difficulty: DELF B2
- Return ONLY valid JSON, no markdown fences.`;

    const raw = await callLLM(system, theme, { temperature: 0.8 });
    const data = parseJsonResponse(raw) as ExamCEData;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
