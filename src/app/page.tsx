"use client";

import { OsHome } from "@/components/os/OsHome";
import { useCommandPalette } from "@/components/os/CommandPalette";

export default function HomePage() {
  const { setOpen } = useCommandPalette();
  return <OsHome onCommand={() => setOpen(true)} />;
}
