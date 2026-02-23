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

// ── Supabase 同步（客户端通过 API routes） ──

/** 从 Supabase 获取用户进度 */
export async function fetchSupabaseProgress(
  userName: string,
): Promise<ProgressData | null> {
  try {
    const res = await fetch(
      `/api/progress?user=${encodeURIComponent(userName)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      scores: data.scores ?? {},
      weak_points: data.weak_points ?? [],
    };
  } catch {
    return null;
  }
}

/** 异步同步到 Supabase（fire-and-forget，失败静默） */
export async function syncToSupabase(
  userName: string,
  scores: Scores,
  weakPoints: WeakPoint[],
): Promise<void> {
  try {
    await fetch("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: userName,
        scores,
        weak_points: weakPoints,
      }),
    });
  } catch {
    // 静默失败，不影响用户体验
  }
}
