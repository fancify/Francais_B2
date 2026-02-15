"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MetricCard } from "@/components/ui/MetricCard";
import type { ExamBlancResults as ExamBlancResultsType } from "@/lib/types";

function scoreColor(score: number, max: number): string {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 80) return "var(--color-apple-green)";
  if (pct >= 50) return "var(--color-apple-orange)";
  return "var(--color-apple-red)";
}

interface ExamBlancResultsProps {
  results: ExamBlancResultsType;
  writingPrompt: string;
}

export function ExamBlancResults({
  results,
  writingPrompt,
}: ExamBlancResultsProps): React.ReactElement {
  const [writingScore, setWritingScore] = useState<number | null>(null);
  const [writingGrade, setWritingGrade] = useState<string | null>(null);
  const [writingLoading, setWritingLoading] = useState(false);
  const [vocabOpen, setVocabOpen] = useState(false);
  const [grammarOpen, setGrammarOpen] = useState(false);

  // 自动调 API 评分写作
  useEffect(() => {
    if (results.writing_text.trim().length === 0) {
      setWritingScore(0);
      return;
    }

    setWritingLoading(true);
    fetch("/api/grade-exam-writing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: results.writing_text, prompt: writingPrompt }),
    })
      .then((res) => res.json())
      .then((data: { grade: string }) => {
        setWritingGrade(data.grade);
        // 提取 SCORE_TOTAL: N/50
        const match = data.grade.match(/SCORE_TOTAL\s*:\s*(\d+(?:\.\d+)?)/);
        setWritingScore(match ? parseFloat(match[1]) : 0);
      })
      .finally(() => setWritingLoading(false));
  }, [results.writing_text, writingPrompt]);

  const totalScore =
    results.vocab_score +
    results.grammar_score +
    (writingScore ?? 0);

  return (
    <div className="space-y-6">
      {/* 4 MetricCard */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Lexique (/25)"
          value={results.vocab_score}
          color={scoreColor(results.vocab_score, 25)}
        />
        <MetricCard
          label="Grammaire (/25)"
          value={results.grammar_score}
          color={scoreColor(results.grammar_score, 25)}
        />
        <MetricCard
          label="Écriture (/50)"
          value={writingScore !== null ? writingScore : "..."}
          color={writingScore !== null ? scoreColor(writingScore, 50) : undefined}
        />
        <MetricCard
          label="TOTAL (/100)"
          value={writingScore !== null ? totalScore : "..."}
          color={writingScore !== null ? scoreColor(totalScore, 100) : undefined}
        />
      </div>

      {/* 词汇详情 */}
      <div className="rounded-[14px] border border-apple-border bg-apple-card">
        <button
          type="button"
          onClick={() => setVocabOpen(!vocabOpen)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-apple-text">Détail Lexique</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: scoreColor(results.vocab_score, 25) }}
            >
              {results.vocab.filter((r) => r.correct).length}/{results.vocab.length}
            </span>
          </div>
          <span className="text-apple-secondary">{vocabOpen ? "−" : "+"}</span>
        </button>
        {vocabOpen && (
          <div className="space-y-3 border-t border-apple-border px-5 py-4">
            {results.vocab.map((r, i) => (
              <div key={i} className="space-y-1">
                <p className="text-sm text-apple-text">
                  <span className={r.correct ? "text-correct" : "text-wrong"}>
                    {r.correct ? "✅" : "❌"}
                  </span>{" "}
                  <span className="font-medium text-apple-secondary">{i + 1}.</span>{" "}
                  {r.definition}
                </p>
                {!r.correct && (
                  <p className="pl-6 text-sm">
                    <span className="text-apple-secondary">Réponse :</span>{" "}
                    <span className="text-wrong">{r.user_answer || "(vide)"}</span>{" "}
                    <span className="text-apple-secondary">→</span>{" "}
                    <span className="font-medium text-apple-text">{r.expected}</span>
                    {r.hint && (
                      <span className="ml-2 text-xs italic text-apple-orange">{r.hint}</span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 语法详情 */}
      <div className="rounded-[14px] border border-apple-border bg-apple-card">
        <button
          type="button"
          onClick={() => setGrammarOpen(!grammarOpen)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-apple-text">Détail Grammaire</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: scoreColor(results.grammar_score, 25) }}
            >
              {results.grammar.filter((r) => r.correct).length}/{results.grammar.length}
            </span>
          </div>
          <span className="text-apple-secondary">{grammarOpen ? "−" : "+"}</span>
        </button>
        {grammarOpen && (
          <div className="space-y-3 border-t border-apple-border px-5 py-4">
            {results.grammar.map((r, i) => (
              <div key={i} className="space-y-1">
                <p className="text-sm text-apple-text">
                  <span className={r.correct ? "text-correct" : "text-wrong"}>
                    {r.correct ? "✅" : "❌"}
                  </span>{" "}
                  <span className="font-medium text-apple-secondary">{i + 1}.</span>{" "}
                  <span className="mr-1 rounded bg-apple-blue/10 px-1.5 py-0.5 text-xs font-medium text-apple-blue">
                    {r.type}
                  </span>
                  {r.source}
                </p>
                {!r.correct && (
                  <p className="pl-6 text-sm">
                    <span className="text-apple-secondary">Réponse :</span>{" "}
                    <span className="text-wrong">{r.user_answer || "(vide)"}</span>{" "}
                    <span className="text-apple-secondary">→</span>{" "}
                    <span className="font-medium text-apple-text">{r.expected}</span>
                    {r.hint && (
                      <span className="ml-2 text-xs italic text-apple-orange">{r.hint}</span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 写作评分 */}
      <div className="rounded-[14px] bg-apple-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <h3 className="mb-3 text-base font-bold text-apple-text">Évaluation de la production écrite</h3>
        {writingLoading && (
          <div className="flex items-center gap-3 py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
            <p className="text-sm text-apple-secondary">Évaluation en cours...</p>
          </div>
        )}
        {writingGrade && (
          <div className="prose prose-sm max-w-none text-apple-text">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{writingGrade}</ReactMarkdown>
          </div>
        )}
        {!writingLoading && !writingGrade && results.writing_text.trim().length === 0 && (
          <p className="text-sm text-apple-secondary">Aucun texte soumis.</p>
        )}
      </div>
    </div>
  );
}
