"use client";

import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface RadarChartProps {
  vocabScore: number;
  grammarScore: number;
  oralScore: number;
  writingScore: number;
}

interface RadarDataPoint {
  subject: string;
  b1: number;
  b2: number;
}

export function RadarChart({
  vocabScore,
  grammarScore,
  oralScore,
  writingScore,
}: RadarChartProps): React.ReactElement {
  const data: RadarDataPoint[] = [
    { subject: "Vocabulaire", b1: 4, b2: vocabScore },
    { subject: "Grammaire", b1: 4, b2: grammarScore },
    { subject: "Oral", b1: 4, b2: oralScore },
    { subject: "Écriture", b1: 4, b2: writingScore },
  ];

  return (
    <div className="flex w-full flex-col items-center">
      <p className="mb-2 text-sm font-semibold text-apple-secondary">Compétences</p>
      <ResponsiveContainer width="100%" aspect={1.1}>
        <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#D2D2D7" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#1D1D1F", fontSize: 12, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: "#86868B", fontSize: 10 }}
            tickCount={6}
          />
          {/* B1 基线层 */}
          <Radar
            name="B1 Acquis"
            dataKey="b1"
            stroke="#5AC8FA"
            fill="#5AC8FA"
            fillOpacity={0.15}
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          {/* B2 动态层 */}
          <Radar
            name="B2 Progrès"
            dataKey="b2"
            stroke="#007AFF"
            fill="#007AFF"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="line"
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
