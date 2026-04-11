import { getTierDef } from "@/lib/tierConfig";
import { cn } from "@/lib/cn";

export function TierBadge({ tier, className }: { tier: string | null | undefined; className?: string }) {
  const def = getTierDef(tier);
  if (!def) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", className)}
      style={{ backgroundColor: `${def.color}33`, color: def.color, border: `1px solid ${def.color}66` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: def.color }} />
      {def.label}
    </span>
  );
}
