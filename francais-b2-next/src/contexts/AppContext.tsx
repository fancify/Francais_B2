"use client";

/**
 * 全局状态 — 管理 auth（密码验证）、scores、weak_points、currentUser。
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { Scores, WeakPoint, WeakPointType } from "@/lib/types";
import {
  loadProgress,
  saveProgress,
  fetchSupabaseProgress,
  syncToSupabase,
} from "@/lib/storage";

const USER_KEY = "vibe-francais-current-user";

interface AppState {
  authenticated: boolean;
  scores: Scores;
  weakPoints: WeakPoint[];
  currentUser: string | null;
  lastUser: string | null;
  login: (password: string) => boolean;
  logout: () => void;
  addScore: (unit: number, pct: number) => void;
  addWeakPoint: (type: WeakPointType, unit: number, key: string, item: string) => void;
  reduceWeakPoint: (type: WeakPointType, unit: number, key: string) => void;
  selectUser: (name: string) => void;
  switchUser: () => void;
}

const AppContext = createContext<AppState | null>(null);

const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD ?? "3644";

export function AppProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [authenticated, setAuthenticated] = useState(false);
  const [scores, setScores] = useState<Scores>({});
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  // 上次使用的用户名（仅用于 UserPicker 高亮，不自动登录）
  const [lastUser, setLastUser] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // 防止 Supabase sync 的 debounce timer
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化：读 lastUser 用于高亮，但不自动选择
  useEffect(() => {
    const savedUser =
      typeof window !== "undefined"
        ? localStorage.getItem(USER_KEY)
        : null;
    setLastUser(savedUser);
    setInitialized(true);
  }, []);

  // scores 或 weakPoints 变更时自动持久化
  useEffect(() => {
    if (!initialized) return;

    // 始终写 localStorage（即时）
    saveProgress(scores, weakPoints);

    // 有用户时异步同步到 Supabase（debounce 1s）
    if (currentUser) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        syncToSupabase(currentUser, scores, weakPoints);
      }, 1000);
    }
  }, [scores, weakPoints, initialized, currentUser]);

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

  /** 选择用户后从 Supabase 加载进度 */
  const selectUser = useCallback((name: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(USER_KEY, name);
    }
    setCurrentUser(name);
    setLastUser(name);

    // 从 Supabase 拉取该用户的进度
    fetchSupabaseProgress(name).then((remote) => {
      if (remote) {
        setScores(remote.scores);
        setWeakPoints(remote.weak_points);
      } else {
        setScores({});
        setWeakPoints([]);
      }
    });
  }, []);

  /** 切换用户：回到 UserPicker（保留 lastUser 用于高亮） */
  const switchUser = useCallback((): void => {
    setCurrentUser(null);
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
    currentUser,
    lastUser,
    login,
    logout,
    addScore,
    addWeakPoint,
    reduceWeakPoint,
    selectUser,
    switchUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
