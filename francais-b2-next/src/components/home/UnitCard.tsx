"use client";

import Link from "next/link";

interface UnitCardProps {
  unitNumber: number;
  theme: string;
  grammarFocus: string[];
  bestScore?: number;
}

export function UnitCard({
  unitNumber,
  theme,
  grammarFocus,
  bestScore,
}: UnitCardProps): React.ReactElement {
  return (
    <Link
      href={`/unit/${unitNumber}`}
      className="group flex flex-col justify-between rounded-[14px] bg-apple-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
    >
      {/* 标题区 */}
      <div>
        <h3 className="text-base font-bold text-apple-text">
          Unit&eacute; {unitNumber}
        </h3>
        <p className="mt-0.5 text-sm italic text-apple-secondary">{theme}</p>

        {/* 语法标签 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {grammarFocus.slice(0, 2).map((g) => (
            <span
              key={g}
              className="rounded-full bg-apple-blue/10 px-2.5 py-0.5 text-xs font-medium text-apple-blue"
            >
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* 底部区 */}
      <div className="mt-4 flex items-center justify-between">
        {bestScore !== undefined ? (
          <span className="text-sm font-medium text-apple-blue">
            Meilleur : {bestScore}%
          </span>
        ) : (
          <span />
        )}
        <span className="text-sm font-medium text-apple-secondary transition-colors group-hover:text-apple-blue">
          Ouvrir &rarr;
        </span>
      </div>
    </Link>
  );
}
