// ── data.json 结构 ──

export interface VocabItem {
  word: string;
  definition: string;
  answer: string;
}

export interface ExpressionItem {
  expression: string;
  usage: string;
  example: string;
}

export interface ConjugationItem {
  verb: string;
  tense: string;
  person: string;
  answer: string;
}

export interface GrammarTransform {
  type: string;
  source: string;
  answer: string;
}

export interface Unit {
  unit_number: number;
  theme: string;
  grammar_focus: string[];
  vocabulary_list: string[];
  b2_expression_focus: string;
  vocabulary: VocabItem[];
  expressions: ExpressionItem[];
  conjugation_list: ConjugationItem[];
  grammar_transforms: GrammarTransform[];
}

// ── Quiz 系统 ──

export type QuestionType = "mcq" | "fill" | "rewrite";

export interface QuizQuestion {
  qtype: QuestionType;
  prompt: string;
  answer: string;
  _key: string;
  options?: string[];
  hint?: string;
  transform_type?: string;
  source?: string;
}

export interface QuizResult extends QuizQuestion {
  user_answer: string;
  correct: boolean;
  feedback_hint: string;
}

export interface QuizData {
  vocab: QuizQuestion[];
  expr: QuizQuestion[];
  conj: QuizQuestion[];
  trans: QuizQuestion[];
}

export interface QuizResults {
  vocab: QuizResult[];
  expr: QuizResult[];
  conj: QuizResult[];
  trans: QuizResult[];
}

// ── 弱点 ──

export type WeakPointType =
  | "vocabulary"
  | "expression"
  | "conjugation"
  | "grammar";

export interface WeakPoint {
  type: WeakPointType;
  unit: number;
  key: string;
  item: string;
  fail_count: number;
}

// ── Scores ──

export type Scores = Record<number, number[]>;

// ── Exam CO / CE ──

export interface ExamMCQuestion {
  id: number;
  question: string;
  options: string[];
  correct: string;
}

export interface ExamCOData {
  transcript: string;
  source_description: string;
  questions: ExamMCQuestion[];
}

export interface ExamCEData {
  article: string;
  source_description: string;
  questions: ExamMCQuestion[];
}

export interface ExamScoreDetail {
  q: string;
  ans: string | null;
  correct: string;
  ok: boolean;
}

export interface ExamScore {
  score: number;
  detail: ExamScoreDetail[];
}

// ── Exam Blanc ──

export interface ExamBlancVocabQ {
  definition: string;
  answer: string;
  _unit: number;
}

export interface ExamBlancGrammarQ {
  type: string;
  source: string;
  answer: string;
  _unit: number;
}

export interface ExamBlancData {
  vocabulary: ExamBlancVocabQ[];
  grammar: ExamBlancGrammarQ[];
  writing_prompt: string;
}

export interface ExamBlancVocabResult {
  definition: string;
  user_answer: string;
  expected: string;
  correct: boolean;
  hint: string;
}

export interface ExamBlancGrammarResult {
  type: string;
  source: string;
  user_answer: string;
  expected: string;
  correct: boolean;
  hint: string;
}

export interface ExamBlancResults {
  vocab: ExamBlancVocabResult[];
  vocab_score: number;
  grammar: ExamBlancGrammarResult[];
  grammar_score: number;
  writing_text: string;
}

// ── 持久化数据 ──

export interface ProgressData {
  scores: Scores;
  weak_points: WeakPoint[];
}
