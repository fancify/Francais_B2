"use client";

import { useState, useEffect, use } from "react";
import { loadUnits, getUnit } from "@/lib/data";
import { TabGroup } from "@/components/ui/TabGroup";
import { QuizTab } from "@/components/unit/QuizTab";
import { OralTab } from "@/components/unit/OralTab";
import { WritingTab } from "@/components/unit/WritingTab";
import { ExamTab } from "@/components/unit/ExamTab";
import type { Unit } from "@/lib/types";

const TAB_LABELS = ["Quiz", "Oral", "Écriture", "Examen B2"];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UnitPage({ params }: PageProps): React.ReactElement {
  const { id } = use(params);
  const unitId = parseInt(id, 10);

  const [units, setUnits] = useState<Unit[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadUnits().then(setUnits);
  }, []);

  const unit = getUnit(units, unitId);

  // 数据加载中
  if (units.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
      </div>
    );
  }

  // 找不到单元
  if (!unit) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-medium text-apple-text">Unité introuvable</p>
        <p className="mt-2 text-sm text-apple-secondary">L&apos;unité {unitId} n&apos;existe pas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-apple-text">
          Unité {unit.unit_number}
        </h1>
        <p className="mt-1 text-sm italic text-apple-secondary">{unit.theme}</p>
      </div>

      {/* TabGroup */}
      <TabGroup tabs={TAB_LABELS} active={activeTab} onChange={setActiveTab} />

      {/* Tab 内容 */}
      <div>
        {activeTab === 0 && <QuizTab unit={unit} allUnits={units} />}
        {activeTab === 1 && <OralTab unit={unit} />}
        {activeTab === 2 && <WritingTab unit={unit} />}
        {activeTab === 3 && <ExamTab unit={unit} />}
      </div>
    </div>
  );
}
