"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EasyShell } from "@/components/easy/EasyShell";
import { AppShell } from "@/components/layout/AppShell";

export function ShellRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/easy")) {
    return <EasyShell>{children}</EasyShell>;
  }
  return <AppShell>{children}</AppShell>;
}
