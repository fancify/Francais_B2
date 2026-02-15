"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/Logo";

interface SidebarProps {
  units: { unit_number: number; theme: string }[];
}

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Accueil", href: "/home" },
  { label: "Progrès", href: "/progress" },
  { label: "Examen Blanc", href: "/exam-blanc" },
];

export function Sidebar({ units }: SidebarProps): React.ReactElement {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* 移动端汉堡按钮 */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-[14px] bg-apple-card p-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 侧边栏主体 */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-[260px] flex-col border-r border-apple-border bg-apple-card transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo 区域 */}
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-apple-secondary hover:bg-apple-bg lg:hidden"
            aria-label="Fermer le menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>

        {/* 主导航 */}
        <nav className="px-3 pt-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`mb-0.5 flex items-center rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-apple-blue/10 text-apple-blue"
                  : "text-apple-text hover:bg-apple-bg"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 分割线 */}
        <div className="mx-5 my-3 border-t border-apple-border" />

        {/* 单元列表 */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-apple-secondary">
            Unités
          </p>
          {units.map((u) => {
            const href = `/unit/${u.unit_number}`;
            return (
              <Link
                key={u.unit_number}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`mb-0.5 flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition-colors ${
                  isActive(href)
                    ? "bg-apple-blue/10 text-apple-blue"
                    : "text-apple-text hover:bg-apple-bg"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-apple-bg text-xs font-semibold text-apple-secondary">
                  {u.unit_number}
                </span>
                <span className="truncate">{u.theme}</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
