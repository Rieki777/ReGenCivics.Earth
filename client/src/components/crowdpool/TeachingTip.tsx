/**
 * TeachingTip: a small, calm one-line tip used across the campaign creator.
 * Shown at the top of each wizard step and next to the capital balance meter.
 * Plain language, no urgency. It teaches, it never nags.
 */

import { Lightbulb } from 'lucide-react';

export function TeachingTip({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg bg-[#f0f7f0] border border-[#7dd87d]/30 px-3 py-2 ${className}`}
    >
      <Lightbulb className="w-4 h-4 text-[#4a7c59] flex-shrink-0 mt-0.5" />
      <p className="text-xs text-[#1a472a]/80 leading-relaxed">{text}</p>
    </div>
  );
}
