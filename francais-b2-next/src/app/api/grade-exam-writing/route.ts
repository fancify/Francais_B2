import { NextRequest, NextResponse } from "next/server";

import { callLLM } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { text, prompt } = body as { text?: string; prompt?: string };

    if (!text || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: text, prompt" },
        { status: 400 },
      );
    }

    const system = `You are a DELF B2 written production examiner. Grade this exam essay.

**Sujet :** ${prompt}

**Texte de l'étudiant :**
"""${text}"""

Grade out of 50 points using the DELF B2 rubric (doubled from standard 25):
1. Respect de la consigne (out of 10)
2. Capacité à argumenter (out of 10)
3. Cohérence et cohésion (out of 10)
4. Compétence lexicale (out of 10)
5. Compétence grammaticale (out of 10)

CRITICAL: For criterion 1 (Respect de la consigne), you MUST verify that the text actually answers the given "Sujet". If the text is off-topic or unrelated to the prompt, score criterion 1 as 0/10 and cap the total at a maximum of 20/50. A well-written text on the wrong topic is still a failure.

Provide:
- A score for each criterion
- A TOTAL score out of 50
- Detailed feedback in French with specific examples from the text
- Corrected sentences where errors are found
- 3 concrete suggestions for improvement

Format with clear headers. Be rigorous — this simulates a real DELF B2 exam.
End your response with exactly this line:
SCORE_TOTAL: [number]/50`;

    const grade = await callLLM(system, text);
    return NextResponse.json({ grade });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
