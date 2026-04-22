/**
 * MobilePlaylistPanel — mobile music sheet. Now a thin wrapper around
 * SoundPlayer so the mobile experience matches desktop: album art / title,
 * progress bar, skip controls, volume slider, full playlist with tap-to-jump.
 */

import { SoundPlayer } from "@/components/SoundPlayer";

type Props = { onSelect?: () => void };

export function MobilePlaylistPanel({ onSelect }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <SoundPlayer variant="mobile" onNavigate={onSelect} />
    </div>
  );
}
