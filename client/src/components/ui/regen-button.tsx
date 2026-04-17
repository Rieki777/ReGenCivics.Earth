import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface RegenButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

export const PrimaryButton = forwardRef<HTMLButtonElement, RegenButtonProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    const sizeClasses = {
      sm: "px-4 py-2 text-sm min-h-[36px]",
      md: "px-6 py-3 text-base min-h-[44px]",
      lg: "px-8 py-4 text-lg min-h-[48px]",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold rounded-xl",
          "bg-[#7dd87d] text-[#0d2818] hover:bg-[#9de89d] active:bg-[#6bc86b]",
          "shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd87d]/50",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
PrimaryButton.displayName = "PrimaryButton";

export const SecondaryButton = forwardRef<HTMLButtonElement, RegenButtonProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    const sizeClasses = {
      sm: "px-4 py-2 text-sm min-h-[36px]",
      md: "px-6 py-3 text-base min-h-[44px]",
      lg: "px-8 py-4 text-lg min-h-[48px]",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold rounded-xl",
          "bg-transparent text-[#7dd87d] border-2 border-[#7dd87d]/40 hover:bg-[#7dd87d]/10 active:bg-[#7dd87d]/20",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd87d]/50",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
SecondaryButton.displayName = "SecondaryButton";

export const GhostButton = forwardRef<HTMLButtonElement, RegenButtonProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm min-h-[32px]",
      md: "px-4 py-2 text-base min-h-[36px]",
      lg: "px-6 py-3 text-lg min-h-[44px]",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium rounded-lg",
          "text-[#7dd87d] hover:bg-[#7dd87d]/10 active:bg-[#7dd87d]/20",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd87d]/50",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
GhostButton.displayName = "GhostButton";
