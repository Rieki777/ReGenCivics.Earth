import { cn } from "@/lib/cn";

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-4">
      {Array.from({ length: total }).map((_, i) => {
        const active = i + 1 === current;
        const done = i + 1 < current;
        return (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all",
              active ? "w-5 bg-[#7dd87d]" : done ? "w-1.5 bg-[#7dd87d]/70" : "w-1.5 bg-white/20",
            )}
          />
        );
      })}
    </div>
  );
}
