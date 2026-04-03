import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_3px_10px_rgba(0,0,0,0.15),0_1px_0_rgba(255,255,255,0.08)_inset] hover:-translate-y-[1px] hover:shadow-[0_5px_16px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.1)_inset] active:translate-y-[1px] active:shadow-[0_1px_4px_rgba(0,0,0,0.15)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 shadow-[0_3px_10px_rgba(0,0,0,0.15),0_1px_0_rgba(255,255,255,0.08)_inset] hover:-translate-y-[1px] hover:shadow-[0_5px_16px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.1)_inset] active:translate-y-[1px] active:shadow-[0_1px_4px_rgba(0,0,0,0.15)]",
        outline:
          "border bg-transparent shadow-[0_3px_10px_rgba(0,0,0,0.1)] hover:bg-accent hover:-translate-y-[1px] hover:shadow-[0_5px_16px_rgba(0,0,0,0.15)] active:translate-y-[1px] active:shadow-[0_1px_4px_rgba(0,0,0,0.1)] dark:bg-transparent dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[0_3px_10px_rgba(0,0,0,0.12),0_1px_0_rgba(255,255,255,0.06)_inset] hover:-translate-y-[1px] hover:shadow-[0_5px_16px_rgba(0,0,0,0.18)] active:translate-y-[1px] active:shadow-[0_1px_4px_rgba(0,0,0,0.12)]",
        ghost:
          "hover:bg-accent dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };