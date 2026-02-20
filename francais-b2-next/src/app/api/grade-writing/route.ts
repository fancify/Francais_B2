import { NextRequest, NextResponse } from "next/server";

import { callLLM } from "@/lib/openrouter";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { text, theme } = body as { text?: string; theme?: string };

    if (!text || !theme) {
      return NextResponse.json(
        { error: "Missing required fields: text, theme" },
        { status: 400 },
      );
    }

    const system = `You are a DELF B2 written production examiner. The writing task theme is: "${theme}".

Here is the student's text:
"""${text}"""

Grade this written production out of 25 points using the official DELF B2 rubric:
1. Task Fulfillment / Respect de la consigne (out of 5)
2. Argumentation / Capacité à argumenter (out of 5)
3. Coherence and Cohesion / Cohérence et cohésion (out of 5)
4. Vocabulary Range / Compétence lexicale (out of 5)
5. Grammatical Accuracy / Compétence grammaticale (out of 5)

CRITICAL: For criterion 1 (Respect de la consigne), you MUST check whether the text actually addresses the assigned theme "${theme}". If the text is off-topic or completely unrelated to the theme, score criterion 1 as 0/5 and cap the total at a maximum of 10/25 regardless of language quality. A well-written text on the wrong topic is still a failure.

Provide:
- A score for each criterion
- A TOTAL score out of 25
- Detailed feedback in French with specific examples
- Corrected sentences where errors are found
- 2-3 suggestions for improvement

Format your response clearly with headers.`;

    const grade = await callLLM(system, text, apiKey);
    return NextResponse.json({ grade });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
