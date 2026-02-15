"use client";

import { useState, useEffect, useCallback } from "react";
import { loadUnits } from "@/lib/data";
import { generateExamBlanc } from "@/lib/quiz";
import { EXAM_WRITING_PROMPTS } from "@/lib/prompts";
import { Timer } from "@/components/exam-blanc/Timer";
import { ExamBlancForm } from "@/components/exam-blanc/ExamBlancForm";
import { ExamBlancResults } from "@/components/exam-blanc/ExamBlancResults";
import type { Unit, ExamBlancData, ExamBlancResults as ExamBlancResultsType } from "@/lib/types";

const EXAM_DURATION = 3600; // 60 分钟

export default function ExamBlancPage(): React.ReactElement {
  const [units, setUnits] = useState<Unit[]>([]);
  const [phase, setPhase] = useState<"start" | "exam" | "results">("start");
  const [exam, setExam] = useState<ExamBlancData | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [results, setResults] = useState<ExamBlancResultsType | null>(null);

  // 加载 units 数据
  useEffect(() => {
    loadUnits().then(setUnits);
  }, []);

  function handleStart(): void {
    if (units.length === 0) return;
    const generated = generateExamBlanc(units, EXAM_WRITING_PROMPTS);
    setExam(generated);
    setStartTime(Date.now());
    setResults(null);
    setPhase("exam");
  }

  function handleSubmit(res: ExamBlancResultsType): void {
    setResults(res);
    setPhase("results");
  }

  const handleExpire = useCallback((): void => {
    // 超时 — 触发表单 DOM 里的提交按钮
    const submitBtn = document.querySelector("[data-exam-submit]") as HTMLButtonElement | null;
    submitBtn?.click();
  }, []);

  function handleReset(): void {
    setExam(null);
    setResults(null);
    setPhase("start");
  }

  // 数据加载中
  if (units.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
      </div>
    );
  }

  // ── 开始页 ──
  if (phase === "start") {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-apple-text">Examen Blanc</h1>
          <p className="mt-2 text-sm text-apple-secondary">
            Simulation complète — 60 minutes
          </p>
        </div>

        <div className="mx-auto max-w-lg space-y-4 rounded-[14px] bg-apple-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <h2 className="text-base font-bold text-apple-text">Instructions</h2>
          <ul className="space-y-2 text-sm text-apple-secondary">
            <li>• <strong>Partie 1 — Lexique</strong> : 20 questions de vocabulaire (25 pts)</li>
            <li>• <strong>Partie 2 — Grammaire</strong> : 5 transformations grammaticales (25 pts)</li>
            <li>• <strong>Partie 3 — Production Écrite</strong> : rédaction argumentée (50 pts)</li>
            <li>• Durée totale : <strong>60 minutes</strong></li>
            <li>• Le chronomètre démarre dès que vous cliquez sur le bouton ci-dessous.</li>
            <li>• L&apos;examen sera soumis automatiquement à la fin du temps.</li>
          </ul>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleStart}
            className="rounded-[14px] bg-apple-blue px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Démarrer l&apos;examen
          </button>
        </div>
      </div>
    );
  }

  // ── 考试中 ──
  if (phase === "exam" && exam) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-apple-text">Examen Blanc</h1>

        {/* 计时器（sticky） */}
        <div className="sticky top-0 z-10 rounded-[14px] bg-apple-card p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <Timer startTime={startTime} duration={EXAM_DURATION} onExpire={handleExpire} />
        </div>

        <ExamBlancForm exam={exam} onSubmit={handleSubmit} />
      </div>
    );
  }

  // ── 结果 ──
  if (phase === "results" && results && exam) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-apple-text">Résultats — Examen Blanc</h1>
        </div>

        <ExamBlancResults results={results} writingPrompt={exam.writing_prompt} />

        <div className="text-center">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-[14px] bg-apple-blue px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Nouvel examen
          </button>
        </div>
      </div>
    );
  }

  return <></>;
}
