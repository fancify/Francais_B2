"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";

export default function LoginPage(): React.ReactElement | null {
  const { authenticated, login } = useApp();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  // 已登录直接跳转
  useEffect(() => {
    if (authenticated) {
      router.push("/home");
    }
  }, [authenticated, router]);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const success = login(password);
    if (success) {
      router.push("/home");
    } else {
      setError(true);
      setLoading(false);
    }
  }

  if (authenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-apple-bg px-4">
      <div className="w-full max-w-sm rounded-[20px] bg-apple-card p-8 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        {/* 标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-apple-text">
            Vibe Français B2
          </h1>
          <p className="mt-2 text-sm text-apple-secondary">
            Édito B2 — Cahier d&#39;exercices dynamique
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Mot de passe"
            className="w-full rounded-[14px] border border-apple-border bg-apple-bg px-4 py-3 text-sm text-apple-text outline-none transition-colors placeholder:text-apple-secondary focus:border-apple-blue"
            autoFocus
          />

          {error && (
            <p className="text-center text-sm text-apple-red">
              Mot de passe incorrect
            </p>
          )}

          <button
            type="submit"
            disabled={loading || password.length === 0}
            className="w-full rounded-[14px] bg-apple-blue py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : "Entrer"}
          </button>
        </form>
      </div>
    </div>
  );
}
