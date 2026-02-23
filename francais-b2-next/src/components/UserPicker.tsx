"use client";

import { useState, useEffect } from "react";

interface UserPickerProps {
  onSelect: (name: string) => void;
  lastUser: string | null;
}

interface UserItem {
  name: string;
  created_at: string;
}

export function UserPicker({ onSelect, lastUser }: UserPickerProps): React.ReactElement {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [secondConfirm, setSecondConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        const list: UserItem[] = data.users ?? [];
        // 上次使用的用户排到最前
        if (lastUser) {
          list.sort((a, b) => {
            if (a.name === lastUser) return -1;
            if (b.name === lastUser) return 1;
            return 0;
          });
        }
        setUsers(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lastUser]);

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

  function handleDeleteClick(name: string, e: React.MouseEvent): void {
    e.stopPropagation();
    setConfirmDelete(name);
    setSecondConfirm(false);
  }

  function handleCancelDelete(): void {
    setConfirmDelete(null);
    setSecondConfirm(false);
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!secondConfirm) {
      setSecondConfirm(true);
      return;
    }

    // 第二次确认 → 执行删除
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/users?name=${encodeURIComponent(confirmDelete)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.name !== confirmDelete));
      }
    } catch {
      // 静默
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
      setSecondConfirm(false);
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

        {/* 删除确认弹窗 */}
        {confirmDelete && (
          <div className="mb-4 rounded-[14px] border border-apple-red/30 bg-apple-red/5 p-4">
            <p className="mb-3 text-sm text-apple-text">
              {secondConfirm
                ? "Êtes-vous sûr(e) ? Cette action est irréversible."
                : `Supprimer « ${confirmDelete} » ? Toute la progression sera définitivement effacée.`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={deleting}
                className="flex-1 rounded-[10px] border border-apple-border px-3 py-2 text-sm font-medium text-apple-text transition-colors hover:bg-apple-bg disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 rounded-[10px] bg-apple-red px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "..." : "Supprimer"}
              </button>
            </div>
          </div>
        )}

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
              <div key={u.name} className="relative">
                <button
                  type="button"
                  onClick={() => onSelect(u.name)}
                  className={`flex w-full items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition-colors hover:bg-apple-bg ${
                    u.name === lastUser
                      ? "border-apple-blue/40 bg-apple-blue/5"
                      : "border-apple-border"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-apple-blue/10 text-sm font-semibold text-apple-blue">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm font-medium text-apple-text">
                    {u.name}
                  </span>
                </button>
                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(u.name, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-apple-secondary opacity-0 transition-opacity hover:text-apple-red [div:hover>&]:opacity-100"
                  aria-label={`Supprimer ${u.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3l8 8M11 3l-8 8" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
