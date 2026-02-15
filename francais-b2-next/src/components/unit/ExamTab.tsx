"use client";

import { useState } from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { ExamCO } from "@/components/unit/ExamCO";
import { ExamCE } from "@/components/unit/ExamCE";
import { ExamPE } from "@/components/unit/ExamPE";
import { ExamPO } from "@/components/unit/ExamPO";
import type { Unit } from "@/lib/types";

function scoreColor(score: number, max: number): string {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 80) return "var(--color-apple-green)";
  if (pct >= 50) return "var(--color-apple-orange)";
  return "var(--color-apple-red)";
}

interface ExamTabProps {
  unit: Unit;
}

export function ExamTab({ unit }: ExamTabProps): React.ReactElement {
  const [coScore, setCoScore] = useState<number | null>(null);
  const [ceScore, setCeScore] = useState<number | null>(null);
  const [peScore, setPeScore] = useState<number | null>(null);
  const [poScore, setPoScore] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-apple-text">Examen DELF B2 — Unité {unit.unit_number}</h2>

      {/* 4 MetricCard */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="CO (/25)"
          value={coScore !== null ? coScore : "—"}
          color={coScore !== null ? scoreColor(coScore, 25) : undefined}
        />
        <MetricCard
          label="CE (/25)"
          value={ceScore !== null ? ceScore : "—"}
          color={ceScore !== null ? scoreColor(ceScore, 25) : undefined}
        />
        <MetricCard
          label="PE (/25)"
          value={peScore !== null ? peScore : "—"}
          color={peScore !== null ? scoreColor(peScore, 25) : undefined}
        />
        <MetricCard
          label="PO (/25)"
          value={poScore !== null ? poScore : "—"}
          color={poScore !== null ? scoreColor(poScore, 25) : undefined}
        />
      </div>

      {/* CO */}
      <div>
        <ExamCO unit={unit} onScore={setCoScore} />
      </div>

      <hr className="border-apple-border" />

      {/* CE */}
      <div>
        <ExamCE unit={unit} onScore={setCeScore} />
      </div>

      <hr className="border-apple-border" />

      {/* PE */}
      <div>
        <ExamPE unit={unit} onScore={setPeScore} />
      </div>

      <hr className="border-apple-border" />

      {/* PO */}
      <div>
        <ExamPO unit={unit} onScore={setPoScore} />
      </div>
    </div>
  );
}
