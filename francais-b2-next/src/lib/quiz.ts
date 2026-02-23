/**
 * Quiz 生成器 — 单元练习（含间隔重复）与模拟考试。
 *
 * 从 data.json 中按比例抽取题目，支持弱点优先。
 */

import type {
  Unit,
  VocabItem,
  ExpressionItem,
  ConjugationItem,
  GrammarTransform,
  QuizQuestion,
  QuizData,
  WeakPoint,
  ExamBlancData,
  ExamBlancVocabQ,
  ExamBlancGrammarQ,
} from "./types";

// ── 题目 _key 生成 ──

function vocabKey(v: VocabItem): string {
  return v.word;
}

function exprKey(e: ExpressionItem): string {
  return e.expression;
}

function conjKey(c: ConjugationItem): string {
  return `${c.verb}_${c.tense}_${c.person}`;
}

function transKey(t: GrammarTransform): string {
  return `${t.type}|${t.source.slice(0, 30)}`;
}

// ── 工具函数 ──

/** 从数组中随机抽取 n 个元素（Fisher-Yates 洗牌取前 n 个）。 */
function sample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const count = Math.min(n, copy.length);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

/** Fisher-Yates 原地洗牌。 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── 按比例分配题目数量 ──

/**
 * 根据各题库大小按比例分配 target 道题。
 *
 * poolSizes: { vocab: 50, expr: 20, ... }
 * 返回: { vocab: 16, expr: 7, ... }
 */
function allocate(poolSizes: Record<string, number>, target: number): Record<string, number> {
  const totalPool = Object.values(poolSizes).reduce((a, b) => a + b, 0);
  if (totalPool === 0) {
    return Object.fromEntries(Object.keys(poolSizes).map((k) => [k, 0]));
  }

  // 初始按比例分配，不超过题库上限
  const alloc: Record<string, number> = {};
  for (const [k, size] of Object.entries(poolSizes)) {
    alloc[k] = Math.min(Math.round((size / totalPool) * target), size);
  }

  // 补足到 target
  let current = Object.values(alloc).reduce((a, b) => a + b, 0);
  while (current < target) {
    const best = Object.keys(alloc).reduce((a, b) =>
      poolSizes[a] - alloc[a] > poolSizes[b] - alloc[b] ? a : b,
    );
    if (alloc[best] < poolSizes[best]) {
      alloc[best] += 1;
      current += 1;
    } else {
      break;
    }
  }

  // 削减到 target
  while (current > target) {
    const best = Object.keys(alloc).reduce((a, b) => (alloc[a] > alloc[b] ? a : b));
    if (alloc[best] > 1) {
      alloc[best] -= 1;
      current -= 1;
    } else {
      break;
    }
  }

  return alloc;
}

// ── 弱点筛选 ──

/**
 * 从 items 中优先选出弱点题目（最多 weakQuota 道），
 * 其余从正常题库随机补到 quota。
 */
function splitWeakAndNormal<T>(
  items: readonly T[],
  keyFn: (item: T) => string,
  weakKeys: Set<string>,
  quota: number,
  weakQuota: number,
): T[] {
  const weakItems = items.filter((it) => weakKeys.has(keyFn(it)));
  const normalItems = items.filter((it) => !weakKeys.has(keyFn(it)));

  // 弱点部分
  const nWeak = Math.min(weakQuota, weakItems.length, quota);
  const selectedWeak = nWeak > 0 ? sample(weakItems, nWeak) : [];

  // 正常部分补满 quota
  const nNormal = Math.min(quota - nWeak, normalItems.length);
  const selectedNormal = nNormal > 0 ? sample(normalItems, nNormal) : [];

  const result = [...selectedWeak, ...selectedNormal];
  shuffle(result);
  return result;
}

// ── 生成单元 Quiz（含间隔重复）──

/**
 * 从 data.json 的单元数据中按比例分配 40 道题。
 *
 * 4 类题目：vocab（填空+MCQ）, expr（填空）, conj（填空）, trans（改写）。
 */
export function generateUnitQuiz(
  unit: Unit,
  allUnits: Unit[],
  weakPoints?: WeakPoint[],
): QuizData {
  const vocab = unit.vocabulary ?? [];
  const expr = unit.expressions ?? [];
  const conj = unit.conjugation_list ?? [];
  const transforms = unit.grammar_transforms ?? [];

  const totalPool = vocab.length + expr.length + conj.length + transforms.length;
  if (totalPool === 0) {
    return { vocab: [], expr: [], conj: [], trans: [] };
  }

  // 表达题全部纳入（题库小且每题都有价值），其余类别分配剩余配额
  const nExpr = expr.length;
  const TARGET = 40;
  const remainingTarget = Math.max(TARGET - nExpr, 0);

  const alloc = allocate(
    {
      vocab: vocab.length,
      conj: conj.length,
      trans: transforms.length,
    },
    remainingTarget,
  );
  const nVocab = alloc.vocab;
  const nConj = alloc.conj;
  const nTrans = alloc.trans;

  // ── 收集当前单元的弱点 key ──
  const wp = weakPoints ?? [];
  const unitNum = unit.unit_number;
  const unitWeak = wp.filter((w) => w.unit === unitNum);

  const weakKeysByType: Record<string, Set<string>> = {
    vocabulary: new Set(),
    expression: new Set(),
    conjugation: new Set(),
    grammar: new Set(),
  };
  for (const w of unitWeak) {
    if (w.type in weakKeysByType) {
      weakKeysByType[w.type].add(w.key);
    }
  }

  // 弱点配额：每类占 40%（向上取整）
  function weakQuota(n: number): number {
    return Math.ceil(n * 0.4);
  }

  // ── 抽取题目（弱点优先）──
  const vocabQs = splitWeakAndNormal(
    vocab,
    vocabKey,
    weakKeysByType.vocabulary,
    nVocab,
    weakQuota(nVocab),
  );
  // 表达题：全部纳入，weakQuota 设为 nExpr 确保不截断
  const exprQs = splitWeakAndNormal(
    expr,
    exprKey,
    weakKeysByType.expression,
    nExpr,
    nExpr,
  );
  const conjQs = splitWeakAndNormal(
    conj,
    conjKey,
    weakKeysByType.conjugation,
    nConj,
    weakQuota(nConj),
  );
  const transQs = splitWeakAndNormal(
    transforms,
    transKey,
    weakKeysByType.grammar,
    nTrans,
    weakQuota(nTrans),
  );

  // ── 词汇题：~25% 选择题 + 其余填空 ──
  const allDefs: string[] = [];
  for (const u of allUnits) {
    for (const v of u.vocabulary ?? []) {
      allDefs.push(v.definition);
    }
  }

  const vocabQuestions: QuizQuestion[] = [];
  const nMcq = Math.max(1, Math.floor(nVocab / 4));
  for (let i = 0; i < vocabQs.length; i++) {
    const v = vocabQs[i];
    const key = vocabKey(v);
    if (i < nMcq) {
      const correctDef = v.definition;
      const pool = allDefs.filter((d) => d !== correctDef);
      const distractors = sample(pool, Math.min(3, pool.length));
      const options = shuffle([correctDef, ...distractors]);
      vocabQuestions.push({
        qtype: "mcq",
        prompt: `Quelle est la définition de « ${v.word} » ?`,
        options,
        answer: correctDef,
        _key: key,
      });
    } else {
      vocabQuestions.push({
        qtype: "fill",
        prompt: v.definition,
        answer: v.answer,
        article: v.article || "",
        _key: key,
      });
    }
  }

  // ── 表达题：填空 ──
  const exprQuestions: QuizQuestion[] = exprQs.map((e) => ({
    qtype: "fill" as const,
    prompt: e.usage,
    hint: e.example || undefined,
    answer: e.expression,
    _key: exprKey(e),
  }));

  // ── 变位题：填空 ──
  const conjQuestions: QuizQuestion[] = conjQs.map((c) => ({
    qtype: "fill" as const,
    prompt: `${c.verb} — ${c.tense} — ${c.person}`,
    answer: c.answer,
    person: c.person,
    _key: conjKey(c),
  }));

  // ── 句式转换题：改写 ──
  const transQuestions: QuizQuestion[] = transQs.map((t) => ({
    qtype: "rewrite" as const,
    transform_type: t.type,
    source: t.source,
    prompt: t.source,
    answer: t.answer,
    _key: transKey(t),
  }));

  return {
    vocab: vocabQuestions,
    expr: exprQuestions,
    conj: conjQuestions,
    trans: transQuestions,
  };
}

// ── 模拟考试 ──

/**
 * 从全部 12 个单元中随机抽取题目组成模拟考试。
 *
 * 20 道词汇 + 5 道语法（优先覆盖不同单元）+ 1 道写作
 */
export function generateExamBlanc(
  allUnits: Unit[],
  examWritingPrompts: Record<number, string>,
): ExamBlancData {
  const allVocab: ExamBlancVocabQ[] = [];
  const allTransforms: (GrammarTransform & { _unit: number })[] = [];

  for (const u of allUnits) {
    for (const v of u.vocabulary ?? []) {
      allVocab.push({
        definition: v.definition,
        answer: v.answer,
        article: v.article || "",
        _unit: u.unit_number,
      });
    }
    for (const t of u.grammar_transforms ?? []) {
      allTransforms.push({ ...t, _unit: u.unit_number });
    }
  }

  const vocabQs = sample(allVocab, Math.min(20, allVocab.length));

  // 从不同单元抽取语法变换题（优先覆盖不同单元）
  shuffle(allTransforms);
  const grammarQs: ExamBlancGrammarQ[] = [];
  const unitsUsed = new Set<number>();

  for (const t of allTransforms) {
    if (grammarQs.length >= 5) break;
    if (!unitsUsed.has(t._unit)) {
      grammarQs.push({
        type: t.type,
        source: t.source,
        answer: t.answer,
        _unit: t._unit,
      });
      unitsUsed.add(t._unit);
    }
  }
  // 不够 5 道则从剩余中补齐
  for (const t of allTransforms) {
    if (grammarQs.length >= 5) break;
    const alreadyIncluded = grammarQs.some(
      (q) => q.type === t.type && q.source === t.source && q._unit === t._unit,
    );
    if (!alreadyIncluded) {
      grammarQs.push({
        type: t.type,
        source: t.source,
        answer: t.answer,
        _unit: t._unit,
      });
    }
  }

  const promptValues = Object.values(examWritingPrompts);
  const writingPrompt = promptValues[Math.floor(Math.random() * promptValues.length)];

  return {
    vocabulary: vocabQs,
    grammar: grammarQs,
    writing_prompt: writingPrompt,
  };
}
