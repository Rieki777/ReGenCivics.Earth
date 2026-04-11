import { capitalFormColors } from "@/lib/tierConfig";
import { cn } from "@/lib/cn";

export function CapitalFormChip({ form, className }: { form: string; className?: string }) {
  const color = capitalFormColors[form] ?? "#7dd87d";
  const label = form.charAt(0).toUpperCase() + form.slice(1);
  return (
    <span
      className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide", className)}
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {label}
    </span>
  );
}
