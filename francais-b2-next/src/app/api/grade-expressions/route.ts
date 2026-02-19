import { NextRequest, NextResponse } from "next/server";

import { callLLM, parseJsonResponse } from "@/lib/openrouter";

interface ExprItem {
  usage: string;
  userAnswer: string;
}

interface GradedItem {
  correct: boolean;
  feedback: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { items } = body as { items?: ExprItem[] };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items to grade" }, { status: 400 });
    }

    // 构建 prompt，让 AI 批量判断
    const questionsBlock = items
      .map(
        (item, i) =>
          `${i + 1}. Usage requise : "${item.usage}"\n   Réponse de l'élève : "${item.userAnswer}"`,
      )
      .join("\n\n");

    const system = `Tu es un examinateur DELF B2 spécialisé en expressions idiomatiques françaises.

L'élève doit écrire une phrase ou une expression qui correspond à l'usage linguistique demandé.
Il peut utiliser N'IMPORTE QUELLE expression valide en français qui remplit la fonction demandée — il n'est PAS limité à une expression spécifique.

Par exemple, si l'usage demandé est "exprimer la concession", toutes ces réponses sont valides :
- "bien que", "même si", "quoi qu'il en soit", "malgré tout", "toutefois", etc.
- ou une phrase complète contenant l'une de ces expressions.

Règles de correction :
- Accepte toute expression ou phrase qui remplit correctement la fonction linguistique demandée.
- Sois tolérant sur l'orthographe et les accents (erreurs mineures acceptées).
- Si l'élève écrit une phrase complète, vérifie que l'expression utilisée correspond bien à la fonction.
- Si l'élève écrit juste l'expression sans phrase, c'est aussi accepté.
- Si la réponse est vide ou totalement hors sujet, marque comme incorrect.

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backticks) :
[
  { "correct": true/false, "feedback": "bref commentaire en français" },
  ...
]

Le tableau doit avoir exactement ${items.length} éléments, un par question.`;

    const raw = await callLLM(system, questionsBlock, { temperature: 0.3 });
    const parsed = parseJsonResponse(raw) as GradedItem[];

    // 确保返回数组长度正确
    const results: GradedItem[] = items.map((_, i) => ({
      correct: parsed[i]?.correct ?? false,
      feedback: parsed[i]?.feedback ?? "",
    }));

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
