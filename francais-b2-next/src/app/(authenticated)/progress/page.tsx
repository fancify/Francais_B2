"use client";

import { useApp } from "@/contexts/AppContext";
import { MetricCard } from "@/components/ui/MetricCard";
import { GaugeChart } from "@/components/progress/GaugeChart";
import { RadarChart } from "@/components/progress/RadarChart";
import { WeakPointsList } from "@/components/progress/WeakPointsList";

// 限制值在 [min, max] 范围
function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function ProgressPage(): React.ReactElement {
  const { scores, weakPoints } = useApp();

  // ── 基础统计 ──
  const allScores = Object.values(scores).flat();
  const totalQuizzes = allScores.length;
  const avgScore = totalQuizzes > 0
    ? allScores.reduce((a, b) => a + b, 0) / totalQuizzes
    : 0;
  const unitsDone = Object.keys(scores).length;

  // ── B2 Readiness 计算 ──
  const currentB2Progress = totalQuizzes > 0
    ? (unitsDone / 12) * 50 + (avgScore / 100) * 50
    : 0;
  const readinessPct = 20 + currentB2Progress * 0.8;

  // ── 雷达图维度 (0-10) ──
  const vocabWps = weakPoints.filter((w) => w.type === "vocabulary").length;
  const gramWps = weakPoints.filter((w) => w.type === "grammar").length;

  let vocabScore = 0;
  let grammarScore = 0;
  let oralScore = 0;
  let writingScore = 0;

  if (totalQuizzes > 0) {
    const base = avgScore / 10;
    vocabScore = clamp(0, 10, base + 1 - vocabWps * 1.5);
    grammarScore = clamp(0, 10, base + 0.5 - gramWps * 1.5);
    oralScore = clamp(0, 10, base - 0.5);
    writingScore = clamp(0, 10, base - 0.3);
  }

  // 显示用的四舍五入平均分
  const displayAvg = totalQuizzes > 0 ? `${Math.round(avgScore)}%` : "--";

  return (
    <div>
      {/* 标题 */}
      <h1 className="mb-6 text-2xl font-bold text-apple-text">
        Tableau de Bord
      </h1>

      {/* 指标卡片 */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Quiz compl&eacute;t&eacute;s" value={totalQuizzes} />
        <MetricCard
          label="Score moyen"
          value={displayAvg}
          color={totalQuizzes > 0 ? "#007AFF" : undefined}
        />
        <MetricCard label="Unit&eacute;s" value={`${unitsDone}/12`} />
        <MetricCard
          label="Points faibles"
          value={weakPoints.length}
          color={weakPoints.length > 0 ? "#FF9F0A" : "#34C759"}
        />
      </div>

      {/* 图表区域 */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex items-center justify-center rounded-[14px] bg-apple-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <GaugeChart value={readinessPct} />
        </div>
        <div className="flex items-center justify-center rounded-[14px] bg-apple-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <RadarChart
            vocabScore={vocabScore}
            grammarScore={grammarScore}
            oralScore={oralScore}
            writingScore={writingScore}
          />
        </div>
      </div>

      {/* 分割线 */}
      <div className="mb-6 border-t border-apple-border" />

      {/* 弱点列表 */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-apple-text">
          Points Faibles
        </h2>
        <WeakPointsList weakPoints={weakPoints} />
      </div>
    </div>
  );
}
