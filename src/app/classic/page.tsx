"use client";

import { OsHome } from "@/components/os/OsHome";
import { useCommandPalette } from "@/components/os/CommandPalette";

/** Classic Jeff OS home — full dashboard. Easy Mode is the default at `/`. */
export default function ClassicHomePage() {
  const { setOpen } = useCommandPalette();
  return <OsHome onCommand={() => setOpen(true)} />;
}
