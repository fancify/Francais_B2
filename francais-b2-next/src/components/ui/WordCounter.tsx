"use client";

interface WordCounterProps {
  text: string;
  minWords?: number;
}

export function WordCounter({ text, minWords = 250 }: WordCounterProps): React.ReactElement {
  const count = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  function getColor(): string {
    if (count < 100) return "var(--color-apple-red)";
    if (count < minWords) return "var(--color-apple-orange)";
    return "var(--color-apple-green)";
  }

  return (
    <p className="text-sm font-medium" style={{ color: getColor() }}>
      {count} / {minWords} mots
    </p>
  );
}
