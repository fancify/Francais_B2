"use client";

interface GaugeChartProps {
  value: number;
}

// 半圆仪表盘：起始角 180 度（左），终止角 0 度（右）
const RADIUS = 80;
const STROKE_WIDTH = 14;
const CX = 100;
const CY = 95;
const START_ANGLE = 180;
const END_ANGLE = 0;

// 根据角度（度）计算弧线上的点坐标
function polarToCartesian(angle: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return {
    x: CX + RADIUS * Math.cos(rad),
    y: CY - RADIUS * Math.sin(rad),
  };
}

// 生成 SVG 弧线路径
function describeArc(startAngle: number, endAngle: number): string {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const sweep = startAngle - endAngle;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function getColor(value: number): string {
  if (value >= 75) return "var(--color-apple-green)";
  if (value >= 55) return "var(--color-apple-blue)";
  return "var(--color-apple-orange)";
}

export function GaugeChart({ value }: GaugeChartProps): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, value));

  // value 百分比映射到角度：0% → 180 度，100% → 0 度
  const valueAngle = START_ANGLE - (clamped / 100) * (START_ANGLE - END_ANGLE);
  const valuePath = describeArc(START_ANGLE, valueAngle);

  return (
    <div className="flex w-full flex-col items-center">
      <p className="mb-2 text-sm font-semibold text-apple-secondary">B2 Readiness</p>
      <svg viewBox="0 0 200 120" className="w-full max-w-[280px]">
        {/* 数值弧 */}
        {clamped > 0 && (
          <path
            d={valuePath}
            fill="none"
            stroke={getColor(clamped)}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
        )}
        {/* 中心数值 */}
        <text
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          fill={getColor(clamped)}
          fontSize="28"
          fontWeight="700"
          fontFamily="var(--font-sans)"
        >
          {Math.round(clamped)}%
        </text>
      </svg>
    </div>
  );
}
