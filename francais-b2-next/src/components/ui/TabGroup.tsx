"use client";

interface TabGroupProps {
  tabs: string[];
  active: number;
  onChange: (index: number) => void;
}

export function TabGroup({ tabs, active, onChange }: TabGroupProps): React.ReactElement {
  return (
    <div className="inline-flex rounded-[14px] bg-apple-bg p-1">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(i)}
          className={`rounded-[10px] px-4 py-2 text-sm font-medium transition-all ${
            i === active
              ? "bg-apple-card text-apple-text shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
              : "text-apple-secondary hover:text-apple-text"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
