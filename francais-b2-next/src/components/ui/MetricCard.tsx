"use client";

interface MetricCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function MetricCard({ label, value, color }: MetricCardProps): React.ReactElement {
  return (
    <div className="rounded-[14px] bg-apple-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <p className="text-sm text-apple-secondary">{label}</p>
      <p
        className="mt-1 text-2xl font-semibold"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
