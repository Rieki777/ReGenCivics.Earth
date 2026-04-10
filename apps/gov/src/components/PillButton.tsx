import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger";

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-[#7dd87d] text-[#0d2818] font-bold hover:bg-[#6bc86b]",
  secondary: "border border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10",
  danger: "bg-red-500 text-white hover:bg-red-600",
};

export function PillButton({ variant = "primary", className, children, ...props }: PillButtonProps) {
  return (
    <button
      className={cn(
        "rounded-full px-6 py-3 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
