import { cn } from "@/lib/cn";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-[rgba(26,71,42,0.85)] backdrop-blur-[12px] border border-[rgba(125,216,125,0.15)] rounded-2xl p-5 transition-colors hover:border-[rgba(125,216,125,0.3)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
