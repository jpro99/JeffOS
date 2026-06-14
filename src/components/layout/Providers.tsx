import { MissionControlProvider } from "@/lib/store/context";

import { CommandPaletteProvider } from "@/components/os/CommandPalette";

import { VoiceProvider } from "@/components/voice/VoiceProvider";

import { VoiceCommandPanel } from "@/components/voice/VoiceCommandPanel";

import { FloatingVoiceButton } from "@/components/voice/FloatingVoiceButton";

import { ShellRouter } from "@/components/layout/ShellRouter";



export function Providers({ children }: { children: React.ReactNode }) {

  return (

    <MissionControlProvider>

      <CommandPaletteProvider>

        <VoiceProvider>

          <ShellRouter>{children}</ShellRouter>

          <VoiceCommandPanel />

          <FloatingVoiceButton />

        </VoiceProvider>

      </CommandPaletteProvider>

    </MissionControlProvider>

  );

}

