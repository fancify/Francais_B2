/**
 * localStorage 持久化 — 替代 Python 的 FileStorage/S3Storage。
 */

import type { Scores, WeakPoint, ProgressData } from "./types";

const STORAGE_KEY = "vibe-francais-progress";

/** 从 localStorage 加载进度数据。SSR 环境下返回空数据。 */
export function loadProgress(): ProgressData {
  if (typeof window === "undefined") return { scores: {}, weak_points: [] };

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { scores: {}, weak_points: [] };

  try {
    const data = JSON.parse(raw) as Partial<ProgressData>;
    return {
      scores: data.scores ?? {},
      weak_points: data.weak_points ?? [],
    };
  } catch {
    return { scores: {}, weak_points: [] };
  }
}

/** 保存进度数据到 localStorage。SSR 环境下静默跳过。 */
export function saveProgress(scores: Scores, weakPoints: WeakPoint[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ scores, weak_points: weakPoints }),
  );
}
