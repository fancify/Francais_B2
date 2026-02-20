"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EXAM_WRITING_PROMPTS } from "@/lib/prompts";
import { WordCounter } from "@/components/ui/WordCounter";
import { AccentBar } from "@/components/ui/AccentBar";
import type { Unit } from "@/lib/types";

const DEFAULT_PROMPT =
  "Rédigez un essai argumenté sur un sujet lié au thème de cette unité. (250 mots min.)";

interface ExamPEProps {
  unit: Unit;
  onScore?: (score: number) => void;
}

export function ExamPE({ unit, onScore }: ExamPEProps): React.ReactElement {
  const prompt = EXAM_WRITING_PROMPTS[unit.unit_number] ?? DEFAULT_PROMPT;

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function wordCount(): number {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  }

  async function handleEvaluate(): Promise<void> {
    if (text.trim().length === 0) return;

    if (wordCount() < 50) {
      setWarning("Attention : votre texte est très court (moins de 50 mots).");
    } else {
      setWarning(null);
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/grade-exam-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, prompt }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || `Erreur serveur (${res.status})`);
      }

      const data = (await res.json()) as { grade: string };
      if (!data.grade) throw new Error("Réponse vide du serveur");
      setResult(data.grade);

      // 提取分数（从 AI 回复中提取 SCORE_TOTAL: N/25 或 N/50）
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
      <h3 className="text-base font-bold text-apple-text">Production écrite (Examen)</h3>

      {/* 题目 */}
      <div className="rounded-[14px] bg-apple-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <p className="text-sm text-apple-text">{prompt}</p>
      </div>

      {/* 输入区 */}
      <div className="space-y-3">
        <AccentBar />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Rédigez votre texte ici..."
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

      {warning && (
        <p className="text-sm font-medium text-apple-orange">{warning}</p>
      )}

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
