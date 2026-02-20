"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EXAM_ORAL_PROMPTS } from "@/lib/prompts";
import { WordCounter } from "@/components/ui/WordCounter";
import type { Unit } from "@/lib/types";

const DEFAULT_PROMPT =
  "Présentez et défendez votre point de vue sur un sujet lié au thème de cette unité.";

// 评分标准
const CRITERIA = [
  "Respect de la consigne et du sujet",
  "Organisation et cohérence du discours",
  "Richesse du vocabulaire (niveau B2)",
  "Correction grammaticale",
  "Capacité à argumenter et donner des exemples",
];

interface ExamPOProps {
  unit: Unit;
  onScore?: (score: number) => void;
}

export function ExamPO({ unit, onScore }: ExamPOProps): React.ReactElement {
  const prompt = EXAM_ORAL_PROMPTS[unit.unit_number] ?? DEFAULT_PROMPT;

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [criteriaOpen, setCriteriaOpen] = useState(false);

  async function handleEvaluate(): Promise<void> {
    if (text.trim().length === 0) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/grade-oral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, theme: unit.theme }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || `Erreur serveur (${res.status})`);
      }

      const data = (await res.json()) as { grade: string };
      if (!data.grade) throw new Error("Réponse vide du serveur");
      setResult(data.grade);

      // 提取分数
      const scoreMatch = data.grade.match(/SCORE_TOTAL\s*:\s*(\d+(?:\.\d+)?)/);
      if (scoreMatch) {
        onScore?.(parseFloat(scoreMatch[1]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-apple-text">Production orale (Examen)</h3>

      {/* 题目 */}
      <div className="rounded-[14px] bg-apple-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <p className="text-sm text-apple-text">{prompt}</p>
      </div>

      {/* 评分标准 */}
      <div className="rounded-[14px] border border-apple-border bg-apple-card">
        <button
          type="button"
          onClick={() => setCriteriaOpen(!criteriaOpen)}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          <span className="text-sm font-semibold text-apple-text">Critères d&apos;évaluation</span>
          <span className="text-apple-secondary">{criteriaOpen ? "−" : "+"}</span>
        </button>
        {criteriaOpen && (
          <div className="border-t border-apple-border px-5 py-4">
            <ul className="space-y-1">
              {CRITERIA.map((c) => (
                <li key={c} className="text-sm text-apple-secondary">• {c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Rédigez votre réponse ici..."
          className="w-full resize-none rounded-[14px] border border-apple-border bg-apple-card px-4 py-3 text-sm text-apple-text outline-none transition-colors placeholder:text-apple-secondary focus:border-apple-blue"
          style={{ height: "220px" }}
        />
        <div className="flex items-center justify-between">
          <WordCounter text={text} />
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={loading || text.trim().length === 0}
            className="rounded-[14px] bg-apple-blue px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Évaluation..." : "Évaluer"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[14px] border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Erreur : {error}</p>
          <p className="mt-1 text-xs text-red-600">Veuillez réessayer.</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
        </div>
      )}

      {result && (
        <div className="rounded-[14px] bg-apple-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <h4 className="mb-3 text-base font-bold text-apple-text">Évaluation</h4>
          <div className="prose prose-sm max-w-none text-apple-text">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
