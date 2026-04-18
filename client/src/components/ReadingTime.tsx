import { Clock } from "lucide-react";
export function ReadingTime({ words }: { words: number }) {
  const mins = Math.max(1, Math.ceil(words / 250));
  return (
    <span className="inline-flex items-center gap-1.5 text-white/50 text-sm">
      <Clock className="w-3.5 h-3.5" />
      {mins} min read
    </span>
  );
}
