"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { generateUnitQuiz } from "@/lib/quiz";
import { matchAnswer } from "@/lib/matching";
import { AccentBar } from "@/components/ui/AccentBar";
import { MetricCard } from "@/components/ui/MetricCard";
import type {
  Unit,
  QuizData,
  QuizQuestion,
  QuizResult,
  QuizResults,
  WeakPointType,
} from "@/lib/types";

// ── 分组配置 ──

interface SectionConfig {
  key: keyof QuizData;
  label: string;
  weakType: WeakPointType;
}

const SECTIONS: SectionConfig[] = [
  { key: "vocab", label: "Vocabulaire", weakType: "vocabulary" },
  { key: "expr", label: "Expressions", weakType: "expression" },
  { key: "conj", label: "Conjugaison", weakType: "conjugation" },
  { key: "trans", label: "Réécriture", weakType: "grammar" },
];

// ── 分数颜色 ──

function scoreColor(pct: number): string {
  if (pct >= 80) return "var(--color-apple-green)";
  if (pct >= 50) return "var(--color-apple-orange)";
  return "var(--color-apple-red)";
}

// ── 可折叠区块 ──

interface CollapsibleProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Collapsible({
  title,
  badge,
  badgeColor,
  defaultOpen = false,
  children,
}: CollapsibleProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-[14px] border border-apple-border bg-apple-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-apple-text">{title}</span>
          {badge && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: badgeColor }}
            >
              {badge}
            </span>
          )}
        </div>
        <span className="text-apple-secondary">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-apple-border px-5 py-4">{children}</div>}
    </div>
  );
}

// ── 单题渲染（表单态） ──

interface QuestionFieldProps {
  question: QuizQuestion;
  index: number;
  sectionKey: string;
  value: string;
  onChange: (value: string) => void;
}

function QuestionField({
  question,
  index,
  sectionKey,
  value,
  onChange,
}: QuestionFieldProps): React.ReactElement {
  const id = `${sectionKey}-${index}`;

  return (
    <div className="space-y-2">
      <p className="text-sm text-apple-text">
        <span className="font-medium text-apple-secondary">{index + 1}.</span>{" "}
        {question.qtype === "rewrite" && question.transform_type && (
          <span className="mr-1 rounded bg-apple-blue/10 px-1.5 py-0.5 text-xs font-medium text-apple-blue">
            {question.transform_type}
          </span>
        )}
        {question.prompt}
      </p>
      {question.hint && (
        <p className="text-xs italic text-apple-secondary">Exemple : {question.hint}</p>
      )}

      {question.qtype === "mcq" && question.options ? (
        <div className="space-y-1.5 pl-4">
          {question.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-apple-text">
              <input
                type="radio"
                name={id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="accent-apple-blue"
              />
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Votre réponse..."
          className="w-full rounded-[10px] border border-apple-border bg-apple-bg px-3 py-2 text-sm text-apple-text outline-none transition-colors placeholder:text-apple-secondary focus:border-apple-blue"
        />
      )}
    </div>
  );
}

// ── 单题结果渲染 ──

interface ResultItemProps {
  result: QuizResult;
  index: number;
}

function ResultItem({ result, index }: ResultItemProps): React.ReactElement {
  return (
    <div className="space-y-1">
      <p className="text-sm text-apple-text">
        <span className={result.correct ? "text-correct" : "text-wrong"}>
          {result.correct ? "✅" : "❌"}
        </span>{" "}
        <span className="font-medium text-apple-secondary">{index + 1}.</span>{" "}
        {result.prompt}
      </p>
      <p className="pl-6 text-sm">
        <span className="text-apple-secondary">Réponse :</span>{" "}
        <span className={result.correct ? "text-correct" : "text-wrong"}>
          {result.user_answer || "(vide)"}
        </span>
      </p>
      {!result.correct && (
        <p className="pl-6 text-sm">
          <span className="text-apple-secondary">Attendu :</span>{" "}
          <span className="font-medium text-apple-text">{result.answer}</span>
          {result.feedback_hint && (
            <span className="ml-2 text-xs italic text-apple-orange">
              {result.feedback_hint}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

// ── 主组件 ──

interface QuizTabProps {
  unit: Unit;
  allUnits: Unit[];
}

export function QuizTab({ unit, allUnits }: QuizTabProps): React.ReactElement {
  const { weakPoints, addScore, addWeakPoint, reduceWeakPoint } = useApp();

  // 状态：idle → quiz → results
  const [phase, setPhase] = useState<"idle" | "quiz" | "results">("idle");
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<QuizResults | null>(null);

  // 生成 quiz
  function handleStart(): void {
    const generated = generateUnitQuiz(unit, allUnits, weakPoints);
    setQuiz(generated);
    setAnswers({});
    setResults(null);
    setPhase("quiz");
  }

  // 更新答案
  function updateAnswer(sectionKey: string, index: number, value: string): void {
    setAnswers((prev) => ({ ...prev, [`${sectionKey}-${index}`]: value }));
  }

  // 提交评分
  function handleSubmit(): void {
    if (!quiz) return;

    const graded: QuizResults = { vocab: [], expr: [], conj: [], trans: [] };
    let totalCorrect = 0;
    let totalCount = 0;

    for (const section of SECTIONS) {
      const questions = quiz[section.key];
      const sectionResults: QuizResult[] = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const userAnswer = answers[`${section.key}-${i}`] ?? "";
        const [correct, hint] = matchAnswer(userAnswer, q.answer);

        sectionResults.push({
          ...q,
          user_answer: userAnswer,
          correct,
          feedback_hint: hint,
        });

        totalCount++;
        if (correct) {
          totalCorrect++;
          reduceWeakPoint(section.weakType, unit.unit_number, q._key);
        } else {
          addWeakPoint(section.weakType, unit.unit_number, q._key, q.prompt);
        }
      }

      graded[section.key] = sectionResults;
    }

    // 记录分数
    const pct = totalCount > 0 ? Math.round((totalCorrect / totalCount) * 100) : 0;
    addScore(unit.unit_number, pct);

    setResults(graded);
    setPhase("results");
  }

  // 重置
  function handleReset(): void {
    setQuiz(null);
    setAnswers({});
    setResults(null);
    setPhase("idle");
  }

  // ── 初始状态 ──
  if (phase === "idle") {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-apple-text">Quiz — Unité {unit.unit_number}</h2>
          <p className="text-sm text-apple-secondary">
            40 questions couvrant vocabulaire, expressions, conjugaison et réécriture.
          </p>
          <p className="text-sm text-apple-secondary">
            Les points faibles sont priorisés automatiquement.
          </p>
        </div>
        <button
          type="button"
          onClick={handleStart}
          className="rounded-[14px] bg-apple-blue px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Commencer le quiz
        </button>
      </div>
    );
  }

  // ── 表单状态 ──
  if (phase === "quiz" && quiz) {
    return (
      <div className="space-y-6">
        <AccentBar />

        {SECTIONS.map((section) => {
          const questions = quiz[section.key];
          if (questions.length === 0) return null;

          return (
            <Collapsible key={section.key} title={`${section.label} (${questions.length})`} defaultOpen>
              <div className="space-y-5">
                {questions.map((q, i) => (
                  <QuestionField
                    key={`${section.key}-${i}`}
                    question={q}
                    index={i}
                    sectionKey={section.key}
                    value={answers[`${section.key}-${i}`] ?? ""}
                    onChange={(val) => updateAnswer(section.key, i, val)}
                  />
                ))}
              </div>
            </Collapsible>
          );
        })}

        <div className="text-center">
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-[14px] bg-apple-blue px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Soumettre
          </button>
        </div>
      </div>
    );
  }

  // ── 结果状态 ──
  if (phase === "results" && results) {
    // 计算总分和分类分数
    const allResults = SECTIONS.map((s) => results[s.key]);
    const totalCorrect = allResults.reduce((sum, arr) => sum + arr.filter((r) => r.correct).length, 0);
    const totalCount = allResults.reduce((sum, arr) => sum + arr.length, 0);
    const totalPct = totalCount > 0 ? Math.round((totalCorrect / totalCount) * 100) : 0;

    function sectionPct(key: keyof QuizResults): number {
      const arr = results![key];
      if (arr.length === 0) return 0;
      return Math.round((arr.filter((r) => r.correct).length / arr.length) * 100);
    }

    return (
      <div className="space-y-6">
        {/* 总分 banner */}
        <div
          className="rounded-[14px] p-6 text-center text-white"
          style={{ backgroundColor: scoreColor(totalPct) }}
        >
          <p className="text-3xl font-bold">{totalPct}%</p>
          <p className="text-sm font-medium opacity-90">
            {totalCorrect} / {totalCount} correct
          </p>
        </div>

        {/* 分类 MetricCard */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SECTIONS.map((section) => {
            const pct = sectionPct(section.key);
            return (
              <MetricCard
                key={section.key}
                label={section.label}
                value={`${pct}%`}
                color={scoreColor(pct)}
              />
            );
          })}
        </div>

        {/* 分类详情 */}
        {SECTIONS.map((section) => {
          const sectionResults = results[section.key];
          if (sectionResults.length === 0) return null;
          const correct = sectionResults.filter((r) => r.correct).length;

          return (
            <Collapsible
              key={section.key}
              title={section.label}
              badge={`${correct}/${sectionResults.length}`}
              badgeColor={scoreColor(sectionPct(section.key))}
            >
              <div className="space-y-4">
                {sectionResults.map((r, i) => (
                  <ResultItem key={i} result={r} index={i} />
                ))}
              </div>
            </Collapsible>
          );
        })}

        {/* 重新测试 */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-[14px] bg-apple-blue px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Nouveau quiz
          </button>
        </div>
      </div>
    );
  }

  return <></>;
}
