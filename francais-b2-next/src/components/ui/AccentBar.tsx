"use client";

import { ACCENT_CHARS } from "@/lib/prompts";

export function AccentBar(): React.ReactElement {
  function handleCopy(char: string): void {
    navigator.clipboard.writeText(char);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-apple-secondary">Accents</span>
      <div className="flex flex-wrap gap-1.5">
        {ACCENT_CHARS.map((char) => (
          <button
            key={char}
            type="button"
            onClick={() => handleCopy(char)}
            className="rounded-lg border border-apple-border px-2.5 py-1 text-sm font-medium transition-colors hover:bg-apple-blue hover:text-white"
          >
            {char}
          </button>
        ))}
      </div>
    </div>
  );
}
