"use client";

import { useState } from "react";
import { matchAnswer } from "@/lib/matching";
import { AccentBar } from "@/components/ui/AccentBar";
import type { ExamBlancData, ExamBlancResults } from "@/lib/types";

interface ExamBlancFormProps {
  exam: ExamBlancData;
  onSubmit: (results: ExamBlancResults) => void;
}

export function ExamBlancForm({ exam, onSubmit }: ExamBlancFormProps): React.ReactElement {
  // 词汇答案
  const [vocabAnswers, setVocabAnswers] = useState<string[]>(
    () => new Array(exam.vocabulary.length).fill(""),
  );
  // 语法答案
  const [grammarAnswers, setGrammarAnswers] = useState<string[]>(
    () => new Array(exam.grammar.length).fill(""),
  );
  // 写作内容
  const [writingText, setWritingText] = useState("");

  function updateVocab(index: number, value: string): void {
    setVocabAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function updateGrammar(index: number, value: string): void {
    setGrammarAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit(): void {
    // 词汇评分
    const vocabResults = exam.vocabulary.map((q, i) => {
      const userAns = vocabAnswers[i];
      const [correct, hint] = matchAnswer(userAns, q.answer);
      return {
        definition: q.definition,
        user_answer: userAns,
        expected: q.answer,
        correct,
        hint,
      };
    });
    const vocabCorrect = vocabResults.filter((r) => r.correct).length;
    const vocabScore =
      exam.vocabulary.length > 0
        ? Math.round((vocabCorrect / exam.vocabulary.length) * 25 * 10) / 10
        : 0;

    // 语法评分
    const grammarResults = exam.grammar.map((q, i) => {
      const userAns = grammarAnswers[i];
      const [correct, hint] = matchAnswer(userAns, q.answer);
      return {
        type: q.type,
        source: q.source,
        user_answer: userAns,
        expected: q.answer,
        correct,
        hint,
      };
    });
    const grammarCorrect = grammarResults.filter((r) => r.correct).length;
    const grammarScore =
      exam.grammar.length > 0
        ? Math.round((grammarCorrect / exam.grammar.length) * 25 * 10) / 10
        : 0;

    onSubmit({
      vocab: vocabResults,
      vocab_score: vocabScore,
      grammar: grammarResults,
      grammar_score: grammarScore,
      writing_text: writingText,
    });
  }

  return (
    <div className="space-y-8">
      <AccentBar />

      {/* Partie 1: Lexique */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-apple-text">
          Partie 1 : Lexique ({exam.vocabulary.length} questions)
        </h3>
        <p className="text-sm text-apple-secondary">
          Donnez le mot correspondant à chaque définition.
        </p>
        <div className="space-y-3">
          {exam.vocabulary.map((q, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm text-apple-text">
                <span className="font-medium text-apple-secondary">{i + 1}.</span> {q.definition}
              </p>
              <input
                type="text"
                value={vocabAnswers[i]}
                onChange={(e) => updateVocab(i, e.target.value)}
                placeholder="Votre réponse..."
                className="w-full rounded-[10px] border border-apple-border bg-apple-bg px-3 py-2 text-sm text-apple-text outline-none transition-colors placeholder:text-apple-secondary focus:border-apple-blue"
              />
            </div>
          ))}
        </div>
      </section>

      <hr className="border-apple-border" />

      {/* Partie 2: Grammaire */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-apple-text">
          Partie 2 : Grammaire ({exam.grammar.length} questions)
        </h3>
        <p className="text-sm text-apple-secondary">
          Transformez chaque phrase selon l&apos;indication donnée.
        </p>
        <div className="space-y-3">
          {exam.grammar.map((q, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm text-apple-text">
                <span className="font-medium text-apple-secondary">{i + 1}.</span>{" "}
                <span className="mr-1 rounded bg-apple-blue/10 px-1.5 py-0.5 text-xs font-medium text-apple-blue">
                  {q.type}
                </span>
                {q.source}
              </p>
              <input
                type="text"
                value={grammarAnswers[i]}
                onChange={(e) => updateGrammar(i, e.target.value)}
                placeholder="Votre réponse..."
                className="w-full rounded-[10px] border border-apple-border bg-apple-bg px-3 py-2 text-sm text-apple-text outline-none transition-colors placeholder:text-apple-secondary focus:border-apple-blue"
              />
            </div>
          ))}
        </div>
      </section>

      <hr className="border-apple-border" />

      {/* Partie 3: Production Écrite */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-apple-text">
          Partie 3 : Production Écrite
        </h3>
        <div className="rounded-[14px] bg-apple-card p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-apple-text">{exam.writing_prompt}</p>
        </div>
        <textarea
          value={writingText}
          onChange={(e) => setWritingText(e.target.value)}
          placeholder="Rédigez votre texte ici..."
          className="w-full resize-none rounded-[14px] border border-apple-border bg-apple-card px-4 py-3 text-sm text-apple-text outline-none transition-colors placeholder:text-apple-secondary focus:border-apple-blue"
          style={{ height: "260px" }}
        />
      </section>

      {/* 提交 */}
      <div className="text-center">
        <button
          type="button"
          data-exam-submit
          onClick={handleSubmit}
          className="rounded-[14px] bg-apple-blue px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Soumettre l&apos;examen
        </button>
      </div>
    </div>
  );
}
