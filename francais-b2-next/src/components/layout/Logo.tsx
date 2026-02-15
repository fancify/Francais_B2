"use client";

interface LogoProps {
  compact?: boolean;
}

export function Logo({ compact = false }: LogoProps): React.ReactElement {
  if (compact) {
    return <span className="text-lg font-bold text-apple-text">VF</span>;
  }

  return (
    <div className="leading-tight">
      <span className="text-xl font-bold tracking-tight text-apple-text">
        🇫🇷 Vibe Français
      </span>
      <p className="text-[10px] text-apple-secondary tracking-wide">
        Crafted by Fan &amp; Fan
      </p>
    </div>
  );
}
