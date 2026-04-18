/**
 * PageWrapper. Wraps page content with a mount-fade transition to prevent
 * flash-of-unstyled-content (FOUC) during hydration.
 * Also serves as a natural slot for per-page Suspense boundaries.
 */
import { useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ReadingProgressBar } from "./ReadingProgressBar";

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <ReadingProgressBar />
      <div
        className={cn(
          "transition-opacity duration-150",
          mounted ? "opacity-100" : "opacity-0",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}
