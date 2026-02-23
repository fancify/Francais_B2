"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Logo } from "@/components/layout/Logo";
import { UserPicker } from "@/components/UserPicker";
import { loadUnits } from "@/lib/data";
import type { Unit } from "@/lib/types";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement | null {
  const { authenticated, currentUser, lastUser, selectUser, switchUser } = useApp();
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      router.push("/");
      return;
    }
    loadUnits().then(setUnits);
  }, [authenticated, router]);

  if (!authenticated) return null;

  // 已认证但未选择用户 → 显示 UserPicker
  if (!currentUser) {
    return <UserPicker onSelect={selectUser} lastUser={lastUser} />;
  }

  return (
    <div className="min-h-screen bg-apple-bg">
      <Sidebar
        units={units.map((u) => ({ unit_number: u.unit_number, theme: u.theme }))}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        currentUser={currentUser}
        onSwitchUser={switchUser}
      />
      <main
        className={`transition-[padding] duration-300 ease-in-out ${
          sidebarCollapsed ? "" : "lg:pl-[260px]"
        }`}
      >
        <div className="mx-auto max-w-5xl px-6 py-8 pt-16 lg:pt-8">
          <div className="mb-6">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
