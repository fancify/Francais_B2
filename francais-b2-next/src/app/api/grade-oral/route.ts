import { NextRequest, NextResponse } from "next/server";

import { callLLM } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { text, theme } = body as { text?: string; theme?: string };

    if (!text || !theme) {
      return NextResponse.json(
        { error: "Missing required fields: text, theme" },
        { status: 400 },
      );
    }

    const system = `You are a DELF B2 oral examiner. The student was asked to present an oral argument on the theme: "${theme}".

The following text was transcribed from speech via speech-to-text (STT):
"""${text}"""

IMPORTANT — STT tolerance rules (do NOT penalize these):
- Missing accents (e.g. "ecole" instead of "école", "a" instead of "à") — STT often drops diacritics. Ignore accent errors entirely.
- Repeated words or stuttering (e.g. "je je pense que", "le le problème") — this is normal in spoken French and also a common STT artifact. Do not count repetitions as errors.
- Minor punctuation or capitalization issues — STT output has unreliable punctuation.

Focus your evaluation ONLY on:
- The quality of ideas, argumentation, and relevance to the theme
- Vocabulary richness and appropriateness (judge the word choices, not the spelling)
- Grammatical structures used (tenses, agreement, syntax) — but forgive accent-related spelling

Grade out of 25 points:
1. Fluency and Coherence — logical flow, discourse structure, use of connectors (out of 8)
2. Range of Vocabulary — richness, precision, idiomatic usage relevant to the theme (out of 8)
3. Grammatical Accuracy — syntax, verb tenses, agreement, sentence complexity (out of 9)

Provide:
- A score for each criterion
- A TOTAL score out of 25
- Specific feedback in French with concrete examples from the text
- Corrected sentences where real grammatical errors (not STT artifacts) are found
- 2-3 actionable suggestions for improvement

Format your response clearly with headers.`;

    const grade = await callLLM(system, text);
    return NextResponse.json({ grade });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
