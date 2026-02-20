import { NextRequest, NextResponse } from "next/server";

import { callLLM, parseJsonResponse } from "@/lib/openrouter";
import type { ExamCOData } from "@/lib/types";

export const dynamic = "force-dynamic";

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

    const system = `You are a DELF B2 exam creator. Generate a "Compréhension de l'oral" section for the theme: "${theme}".

Since this is a digital app without audio, simulate the listening by providing a WRITTEN TRANSCRIPT of a realistic French radio interview or debate (~200 words) related to the theme.

Then generate 6 comprehension questions in this JSON format:
{
  "transcript": "<the full transcript text in French>",
  "source_description": "<e.g. 'Extrait d'une émission de radio France Inter'>",
  "questions": [
    {
      "id": 1,
      "question": "<question in French>",
      "options": ["A. <answer>", "B. <answer>", "C. <answer>", "D. <answer>"],
      "correct": "A"
    }
  ]
}

Requirements:
- The transcript should sound natural, like a real radio broadcast or interview
- Questions should test: general understanding (2), detailed comprehension (2), implicit meaning/opinion (2)
- All in French. Difficulty: DELF B2
- Return ONLY valid JSON, no markdown fences.`;

    const raw = await callLLM(system, theme, { temperature: 0.8 });
    const data = parseJsonResponse(raw) as ExamCOData;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
