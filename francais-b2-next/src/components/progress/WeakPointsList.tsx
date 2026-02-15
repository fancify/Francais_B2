"use client";

import type { WeakPoint, WeakPointType } from "@/lib/types";

interface WeakPointsListProps {
  weakPoints: WeakPoint[];
}

// 弱点类型对应的徽章配色
const BADGE_STYLES: Record<WeakPointType, { bg: string; text: string; label: string }> = {
  vocabulary: { bg: "bg-apple-blue/10", text: "text-apple-blue", label: "Vocabulaire" },
  grammar: { bg: "bg-apple-purple/10", text: "text-apple-purple", label: "Grammaire" },
  expression: { bg: "bg-apple-green/10", text: "text-apple-green", label: "Expression" },
  conjugation: { bg: "bg-apple-orange/10", text: "text-apple-orange", label: "Conjugaison" },
};

function WeakPointRow({ wp }: { wp: WeakPoint }): React.ReactElement {
  const badge = BADGE_STYLES[wp.type];

  return (
    <div className="flex items-center gap-3 rounded-xl bg-apple-card px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      {/* 类型徽章 */}
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>

      {/* 内容 */}
      <span className="flex-1 truncate text-sm text-apple-text">{wp.item}</span>

      {/* 单元标记 */}
      <span className="shrink-0 rounded-md bg-apple-bg px-2 py-0.5 text-xs font-semibold text-apple-secondary">
        U{wp.unit}
      </span>

      {/* 失败次数 */}
      {wp.fail_count > 1 && (
        <span className="shrink-0 text-xs font-semibold text-apple-red">
          &times;{wp.fail_count}
        </span>
      )}
    </div>
  );
}

export function WeakPointsList({ weakPoints }: WeakPointsListProps): React.ReactElement {
  // 无弱点：显示成功消息
  if (weakPoints.length === 0) {
    return (
      <div className="rounded-xl bg-apple-green/10 px-5 py-4 text-center">
        <p className="text-sm font-medium text-apple-green">
          Aucun point faible d&eacute;tect&eacute; — Excellent travail !
        </p>
      </div>
    );
  }

  const displayed = weakPoints.slice(0, 3);
  const remaining = weakPoints.length - 3;

  return (
    <div className="space-y-2">
      {displayed.map((wp) => (
        <WeakPointRow key={`${wp.type}-${wp.unit}-${wp.key}`} wp={wp} />
      ))}
      {remaining > 0 && (
        <p className="pt-1 text-center text-sm text-apple-secondary">
          + {remaining} autre{remaining > 1 ? "s" : ""} point{remaining > 1 ? "s" : ""} faible{remaining > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
