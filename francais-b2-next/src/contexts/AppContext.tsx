"use client";

/**
 * 全局状态 — 管理 auth（密码验证）、scores、weak_points。
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Scores, WeakPoint, WeakPointType } from "@/lib/types";
import { loadProgress, saveProgress } from "@/lib/storage";

interface AppState {
  authenticated: boolean;
  scores: Scores;
  weakPoints: WeakPoint[];
  login: (password: string) => boolean;
  logout: () => void;
  addScore: (unit: number, pct: number) => void;
  addWeakPoint: (type: WeakPointType, unit: number, key: string, item: string) => void;
  reduceWeakPoint: (type: WeakPointType, unit: number, key: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD ?? "3644";

export function AppProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [authenticated, setAuthenticated] = useState(false);
  const [scores, setScores] = useState<Scores>({});
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);

  // 初始化：从 localStorage 加载进度
  useEffect(() => {
    const data = loadProgress();
    setScores(data.scores);
    setWeakPoints(data.weak_points);
  }, []);

  // scores 或 weakPoints 变更时自动持久化
  // 用 ref 标记是否已完成初始加载，避免初始化时覆盖 localStorage
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    saveProgress(scores, weakPoints);
  }, [scores, weakPoints, initialized]);

  const login = useCallback((password: string): boolean => {
    if (password === APP_PASSWORD) {
      setAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback((): void => {
    setAuthenticated(false);
  }, []);

  /** 追加百分比到 scores[unit]。 */
  const addScore = useCallback((unit: number, pct: number): void => {
    setScores((prev) => {
      const existing = prev[unit] ?? [];
      return { ...prev, [unit]: [...existing, pct] };
    });
  }, []);

  /** 添加弱点（查重 by type+unit+key，已存在则 fail_count++）。 */
  const addWeakPoint = useCallback(
    (type: WeakPointType, unit: number, key: string, item: string): void => {
      setWeakPoints((prev) => {
        const idx = prev.findIndex(
          (wp) => wp.type === type && wp.unit === unit && wp.key === key,
        );
        if (idx >= 0) {
          // 已存在，fail_count++
          const updated = [...prev];
          updated[idx] = { ...updated[idx], fail_count: updated[idx].fail_count + 1 };
          return updated;
        }
        // 新弱点
        return [...prev, { type, unit, key, item, fail_count: 1 }];
      });
    },
    [],
  );

  /** 弱点 fail_count--，归零则移除。 */
  const reduceWeakPoint = useCallback(
    (type: WeakPointType, unit: number, key: string): void => {
      setWeakPoints((prev) => {
        const idx = prev.findIndex(
          (wp) => wp.type === type && wp.unit === unit && wp.key === key,
        );
        if (idx < 0) return prev;

        const wp = prev[idx];
        if (wp.fail_count <= 1) {
          // 归零，移除
          return prev.filter((_, i) => i !== idx);
        }
        // fail_count--
        const updated = [...prev];
        updated[idx] = { ...updated[idx], fail_count: updated[idx].fail_count - 1 };
        return updated;
      });
    },
    [],
  );

  const value: AppState = {
    authenticated,
    scores,
    weakPoints,
    login,
    logout,
    addScore,
    addWeakPoint,
    reduceWeakPoint,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
