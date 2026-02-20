"use client";

import { useState } from "react";
import { speakFrench, stopSpeaking } from "@/lib/tts";
import type { Unit, ExamCOData, ExamScoreDetail } from "@/lib/types";

interface ExamCOProps {
  unit: Unit;
  onScore?: (score: number) => void;
}

export function ExamCO({ unit, onScore }: ExamCOProps): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState<ExamCOData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [playing, setPlaying] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [detail, setDetail] = useState<ExamScoreDetail[]>([]);

  async function handleGenerate(): Promise<void> {
    setLoading(true);
    setExam(null);
    setError(null);
    setAnswers({});
    setSubmitted(false);

    try {
      const res = await fetch("/api/generate-exam-co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: unit.theme }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || `Erreur serveur (${res.status})`);
      }

      const data = (await res.json()) as ExamCOData;
      if (!data.questions) throw new Error("Réponse invalide du serveur");
      setExam(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  function handlePlay(): void {
    if (!exam) return;
    if (playing) {
      stopSpeaking();
      setPlaying(false);
    } else {
      setPlaying(true);
      speakFrench(exam.transcript);
      // Speech API 无回调，用 setTimeout 近似结束
      const estimatedMs = exam.transcript.length * 80;
      setTimeout(() => setPlaying(false), estimatedMs);
    }
  }

  function handleSubmit(): void {
    if (!exam) return;

    let correct = 0;
    const details: ExamScoreDetail[] = [];

    for (const q of exam.questions) {
      const userAns = answers[q.id] ?? null;
      // correct 以字母开头匹配，如 "A" 匹配 "A. ..."
      const correctLetter = q.correct.charAt(0).toUpperCase();
      const userLetter = userAns ? userAns.charAt(0).toUpperCase() : "";
      const ok = userLetter === correctLetter;
      if (ok) correct++;

      details.push({
        q: q.question,
        ans: userAns,
        correct: q.correct,
        ok,
      });
    }

    const total = exam.questions.length;
    const finalScore = total > 0 ? Math.round((correct / total) * 25 * 10) / 10 : 0;
    setScore(finalScore);
    setDetail(details);
    setSubmitted(true);
    onScore?.(finalScore);
  }

  function handleReset(): void {
    setExam(null);
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setDetail([]);
  }

  // 初始状态
  if (!exam && !loading) {
    return (
      <div className="space-y-4 text-center">
        <h3 className="text-base font-bold text-apple-text">Compréhension de l&apos;oral</h3>
        <p className="text-sm text-apple-secondary">
          Écoutez le document sonore et répondez aux questions.
        </p>
        {error && (
          <div className="rounded-[14px] border border-red-200 bg-red-50 p-4 text-left">
            <p className="text-sm font-medium text-red-800">Erreur : {error}</p>
            <p className="mt-1 text-xs text-red-600">Veuillez réessayer.</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-[14px] bg-apple-blue px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Générer l&apos;épreuve CO
        </button>
      </div>
    );
  }

  // loading
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
        <p className="text-sm text-apple-secondary">Génération de l&apos;épreuve...</p>
      </div>
    );
  }

  if (!exam) return <></>;

  // 结果
  if (submitted) {
    return (
      <div className="space-y-5">
        <div
          className="rounded-[14px] p-5 text-center text-white"
          style={{
            backgroundColor: score >= 20 ? "var(--color-apple-green)" : score >= 12.5 ? "var(--color-apple-orange)" : "var(--color-apple-red)",
          }}
        >
          <p className="text-2xl font-bold">{score} / 25</p>
          <p className="text-sm opacity-90">Compréhension de l&apos;oral</p>
        </div>

        <div className="space-y-3">
          {detail.map((d, i) => (
            <div key={i} className="rounded-[10px] border border-apple-border p-3">
              <p className="text-sm text-apple-text">
                <span className={d.ok ? "text-correct" : "text-wrong"}>
                  {d.ok ? "✅" : "❌"}
                </span>{" "}
                {d.q}
              </p>
              {!d.ok && (
                <p className="mt-1 pl-6 text-sm">
                  <span className="text-apple-secondary">Votre réponse :</span>{" "}
                  <span className="text-wrong">{d.ans ?? "(vide)"}</span>{" "}
                  <span className="text-apple-secondary">|</span>{" "}
                  <span className="text-apple-secondary">Correct :</span>{" "}
                  <span className="font-medium text-apple-text">{d.correct}</span>
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-[14px] bg-apple-blue px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Nouvelle épreuve
          </button>
        </div>
      </div>
    );
  }

  // 答题状态
  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-apple-text">Compréhension de l&apos;oral</h3>
      {exam.source_description && (
        <p className="text-sm italic text-apple-secondary">{exam.source_description}</p>
      )}

      {/* TTS 播放 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlay}
          className="rounded-[14px] bg-apple-blue px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {playing ? "⏹ Arrêter" : "▶ Écouter"}
        </button>
        <span className="text-xs text-apple-secondary">Cliquez pour écouter le document sonore</span>
      </div>

      {/* Transcript 折叠 */}
      <div className="rounded-[14px] border border-apple-border bg-apple-card">
        <button
          type="button"
          onClick={() => setTranscriptOpen(!transcriptOpen)}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          <span className="text-sm font-semibold text-apple-text">Transcription</span>
          <span className="text-apple-secondary">{transcriptOpen ? "−" : "+"}</span>
        </button>
        {transcriptOpen && (
          <div className="border-t border-apple-border px-5 py-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-apple-text">
              {exam.transcript}
            </p>
          </div>
        )}
      </div>

      {/* 题目 */}
      <div className="space-y-4">
        {exam.questions.map((q) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm font-medium text-apple-text">{q.id}. {q.question}</p>
            <div className="space-y-1.5 pl-4">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-apple-text">
                  <input
                    type="radio"
                    name={`co-q-${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    className="accent-apple-blue"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 提交 */}
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
