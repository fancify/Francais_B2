"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { generateUnitQuiz } from "@/lib/quiz";
import { matchAnswer, matchVocabAnswer, matchConjAnswer } from "@/lib/matching";
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

// ── 工具：转义正则特殊字符 ──

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── 工具：在例句中将表达式替换为 ___ ──
// 处理两种情况：
//   1. 普通表达式：整词匹配，不匹配部分词（如 "Malgré le" 不匹配 "Malgré les"）
//   2. 含 "..." 的表达式（如 "Certes... mais"）：拆分后分别替换每个部分

function blankExpression(sentence: string, expression: string): string {
  if (!sentence) return "";
  // 整词边界：匹配后不能紧跟字母或数字
  const boundary = "(?![a-zA-ZÀ-ÿ0-9])";

  if (expression.includes("...")) {
    const parts = expression
      .split("...")
      .map((p) => p.replace(/\s*\([^)]*\)\s*$/, "").trim()) // strip "(mise en relief)" etc.
      .filter(Boolean);
    let result = sentence;
    for (const part of parts) {
      result = result.replace(
        new RegExp(escapeRegex(part) + boundary, "gi"),
        "___",
      );
    }
    return result;
  }

  return sentence.replace(
    new RegExp(escapeRegex(expression) + boundary, "gi"),
    "___",
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

// ── Expressions 区块（参考列表 + 填空 + 下拉选择） ──

interface ExprSectionProps {
  questions: QuizQuestion[];
  answers: Record<string, string>;
  onAnswer: (index: number, value: string) => void;
}

function ExprSection({ questions, answers, onAnswer }: ExprSectionProps): React.ReactElement {
  const allExpressions = questions.map((q) => q.answer);

  return (
    <Collapsible title={`Expressions (${questions.length})`} defaultOpen>
      {/* Référence */}
      <div className="mb-4 border-b border-apple-border pb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-apple-secondary">
          Expressions à utiliser
        </p>
        <div className="flex flex-wrap gap-2">
          {allExpressions.map((expr) => (
            <span
              key={expr}
              className="rounded-full bg-apple-blue/10 px-2.5 py-1 text-xs font-medium text-apple-blue"
            >
              {expr}
            </span>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {questions.map((q, i) => {
          const hint = q.hint ?? "";
          const blanked = hint ? blankExpression(hint, q.answer) : "";
          // 如果 blanking 失败（句子未变化），不显示原句——避免答案暴露
          const showSentence = blanked && blanked !== hint;

          return (
            <div key={i} className="space-y-2">
              <p className="text-xs italic text-apple-secondary">{q.prompt}</p>
              {showSentence && (
                <p className="rounded-[10px] bg-apple-bg px-3 py-2 text-sm text-apple-text">
                  {blanked}
                </p>
              )}
              <select
                value={answers[`expr-${i}`] ?? ""}
                onChange={(e) => onAnswer(i, e.target.value)}
                className="w-full rounded-[10px] border border-apple-border bg-apple-bg px-3 py-2 text-sm text-apple-text outline-none transition-colors focus:border-apple-blue"
              >
                <option value="">— Choisissez une expression —</option>
                {allExpressions.map((expr) => (
                  <option key={expr} value={expr}>
                    {expr}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </Collapsible>
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
        <div className="pl-6 space-y-0.5">
          <p className="text-sm">
            <span className="text-apple-secondary">Expression :</span>{" "}
            <span className="font-medium text-apple-text">{result.answer}</span>
          </p>
          {result.hint && (
            <p className="text-sm text-apple-secondary italic">{result.hint}</p>
          )}
        </div>
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

  // 状态：idle → quiz → grading → results
  const [phase, setPhase] = useState<"idle" | "quiz" | "grading" | "results">("idle");
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

  // 提交评分（异步：表达题用 AI）
  async function handleSubmit(): Promise<void> {
    if (!quiz) return;

    setPhase("grading");

    const graded: QuizResults = { vocab: [], expr: [], conj: [], trans: [] };
    let totalCorrect = 0;
    let totalCount = 0;

    // 先评分非 expr 部分（客户端）
    for (const section of SECTIONS) {
      if (section.key === "expr") continue;

      const questions = quiz[section.key];
      const sectionResults: QuizResult[] = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const userAnswer = answers[`${section.key}-${i}`] ?? "";

        let correct: boolean;
        let hint: string;

        if (section.key === "vocab" && q.qtype === "fill") {
          [correct, hint] = matchVocabAnswer(userAnswer, q.answer, q.article || "");
        } else if (section.key === "conj") {
          [correct, hint] = matchConjAnswer(userAnswer, q.answer, q.person || "");
        } else {
          [correct, hint] = matchAnswer(userAnswer, q.answer);
        }

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

    // 表达题：下拉选择，直接精确匹配
    const exprQuestions = quiz.expr;
    if (exprQuestions.length > 0) {
      const exprResults: QuizResult[] = exprQuestions.map((q, i) => {
        const userAnswer = answers[`expr-${i}`] ?? "";
        const correct = userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();
        totalCount++;
        if (correct) {
          totalCorrect++;
          reduceWeakPoint("expression", unit.unit_number, q._key);
        } else {
          addWeakPoint("expression", unit.unit_number, q._key, q.prompt);
        }
        return { ...q, user_answer: userAnswer, correct, feedback_hint: "" };
      });
      graded.expr = exprResults;
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

  // ── 评分中 ──
  if (phase === "grading") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-apple-blue border-t-transparent" />
        <p className="text-sm font-medium text-apple-secondary">
          Évaluation des expressions en cours...
        </p>
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

          // Expressions: custom layout
          if (section.key === "expr") {
            return (
              <ExprSection
                key="expr"
                questions={questions}
                answers={answers}
                onAnswer={(i, val) => updateAnswer("expr", i, val)}
              />
            );
          }

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
