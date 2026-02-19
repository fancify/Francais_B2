"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { WRITING_PROMPTS } from "@/lib/prompts";
import { WordCounter } from "@/components/ui/WordCounter";
import { AccentBar } from "@/components/ui/AccentBar";
import type { Unit } from "@/lib/types";

const DEFAULT_PROMPT =
  "Rédigez un essai argumenté sur un sujet lié au thème de cette unité. (250 mots minimum)";

// 评分标准
const CRITERIA = [
  "Respect de la consigne (type de texte, longueur)",
  "Organisation et cohérence du texte",
  "Richesse du vocabulaire (niveau B2)",
  "Correction grammaticale et orthographe",
  "Capacité à argumenter avec des exemples",
];

interface WritingTabProps {
  unit: Unit;
}

export function WritingTab({ unit }: WritingTabProps): React.ReactElement {
  const prompt = WRITING_PROMPTS[unit.unit_number] ?? DEFAULT_PROMPT;

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [criteriaOpen, setCriteriaOpen] = useState(false);

  function wordCount(): number {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  }

  async function handleEvaluate(): Promise<void> {
    if (text.trim().length === 0) return;

    // 字数不足警告
    if (wordCount() < 50) {
      setWarning("Attention : votre texte est très court (moins de 50 mots). L'évaluation pourrait être moins pertinente.");
    } else {
      setWarning(null);
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/grade-writing", {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 题目 */}
      <div className="rounded-[14px] bg-apple-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <h3 className="text-base font-bold text-apple-text">Production Écrite</h3>
        <p className="mt-2 text-sm text-apple-text">{prompt}</p>
      </div>

      {/* 评分标准 */}
      <div className="rounded-[14px] border border-apple-border bg-apple-card">
        <button
          type="button"
          onClick={() => setCriteriaOpen(!criteriaOpen)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
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

      {/* AccentBar + 输入区 */}
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

      {/* 警告 */}
      {warning && (
        <p className="text-sm font-medium text-apple-orange">{warning}</p>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="rounded-[14px] border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Erreur : {error}</p>
          <p className="mt-1 text-xs text-red-600">Veuillez réessayer.</p>
        </div>
      )}

      {/* loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
        </div>
      )}

      {/* 结果 */}
      {result && (
        <div className="rounded-[14px] bg-apple-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <h3 className="mb-3 text-base font-bold text-apple-text">Évaluation</h3>
          <div className="prose prose-sm max-w-none text-apple-text">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
