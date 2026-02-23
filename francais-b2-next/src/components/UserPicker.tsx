"use client";

import { useState, useEffect } from "react";

interface UserPickerProps {
  onSelect: (name: string) => void;
}

interface UserItem {
  name: string;
  created_at: string;
}

export function UserPicker({ onSelect }: UserPickerProps): React.ReactElement {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        onSelect(trimmed);
      }
    } catch {
      // 静默
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-apple-bg px-4">
      <div className="w-full max-w-sm rounded-[20px] bg-apple-card p-8 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-apple-text">
            Qui êtes-vous ?
          </h2>
          <p className="mt-1 text-sm text-apple-secondary">
            Choisissez votre profil ou créez-en un nouveau
          </p>
        </div>

        {/* 新用户输入 */}
        <form onSubmit={handleCreate} className="mb-6 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nouveau nom..."
            className="flex-1 rounded-[14px] border border-apple-border bg-apple-bg px-4 py-2.5 text-sm text-apple-text outline-none transition-colors placeholder:text-apple-secondary focus:border-apple-blue"
            autoFocus
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="rounded-[14px] bg-apple-blue px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "..." : "Créer"}
          </button>
        </form>

        {/* 已有用户列表 */}
        {loading ? (
          <p className="text-center text-sm text-apple-secondary">
            Chargement...
          </p>
        ) : users.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-apple-secondary">
              Profils existants
            </p>
            {users.map((u) => (
              <button
                key={u.name}
                type="button"
                onClick={() => onSelect(u.name)}
                className="flex w-full items-center gap-3 rounded-[14px] border border-apple-border px-4 py-3 text-left transition-colors hover:bg-apple-bg"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-apple-blue/10 text-sm font-semibold text-apple-blue">
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-apple-text">
                  {u.name}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
