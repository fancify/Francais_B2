"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { loadUnits } from "@/lib/data";
import { MetricCard } from "@/components/ui/MetricCard";
import { UnitCard } from "@/components/home/UnitCard";
import type { Unit } from "@/lib/types";

export default function HomePage(): React.ReactElement {
  const { scores, weakPoints } = useApp();
  const [units, setUnits] = useState<Unit[]>([]);

  useEffect(() => {
    loadUnits().then(setUnits);
  }, []);

  // 统计指标计算
  const allScores = Object.values(scores).flat();
  const totalQuizzes = allScores.length;
  const avgScore = totalQuizzes > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / totalQuizzes)
    : null;
  const unitsDone = Object.keys(scores).length;

  // 每个单元的最高分
  function getBestScore(unitNumber: number): number | undefined {
    const unitScores = scores[unitNumber];
    if (!unitScores || unitScores.length === 0) return undefined;
    return Math.max(...unitScores);
  }

  return (
    <div>
      {/* 顶部标语 */}
      <p className="mb-6 text-sm text-apple-secondary">
        &Eacute;dito B2 &mdash; Cahier d&apos;exercices dynamique
      </p>

      {/* 指标卡片 */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Quiz compl&eacute;t&eacute;s" value={totalQuizzes} />
        <MetricCard
          label="Score moyen"
          value={avgScore !== null ? `${avgScore}%` : "--"}
          color={avgScore !== null ? "#007AFF" : undefined}
        />
        <MetricCard label="Unit&eacute;s" value={`${unitsDone}/12`} />
        <MetricCard
          label="Points faibles"
          value={weakPoints.length}
          color={weakPoints.length > 0 ? "#FF9F0A" : "#34C759"}
        />
      </div>

      {/* 单元选择标题 */}
      <h2 className="mb-4 text-xl font-bold text-apple-text">
        Choisissez une unit&eacute;
      </h2>

      {/* 单元卡片网格 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {units.map((u) => (
          <UnitCard
            key={u.unit_number}
            unitNumber={u.unit_number}
            theme={u.theme}
            grammarFocus={u.grammar_focus}
            bestScore={getBestScore(u.unit_number)}
          />
        ))}
      </div>
    </div>
  );
}
