"use client";

import { useState, useEffect, useRef } from "react";

interface TimerProps {
  startTime: number;
  duration: number;
  onExpire: () => void;
}

export function Timer({ startTime, duration, onExpire }: TimerProps): React.ReactElement {
  const [remaining, setRemaining] = useState(duration);
  const expiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);

      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, duration, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = duration > 0 ? remaining / duration : 0;

  // 颜色逻辑
  let color: string;
  if (remaining > 20 * 60) {
    color = "var(--color-apple-green)";
  } else if (remaining > 5 * 60) {
    color = "var(--color-apple-orange)";
  } else {
    color = "var(--color-apple-red)";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold" style={{ color }}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </p>
        <p className="text-xs text-apple-secondary">
          {remaining > 0 ? "Temps restant" : "Temps écoulé !"}
        </p>
      </div>
      {/* 进度条 */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-apple-bg">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
