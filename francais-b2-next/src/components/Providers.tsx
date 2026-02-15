"use client";

import { AppProvider } from "@/contexts/AppContext";

export function Providers({ children }: { children: React.ReactNode }): React.ReactElement {
  return <AppProvider>{children}</AppProvider>;
}
