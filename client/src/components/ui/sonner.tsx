import React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      // Desktop offset. Phones override --offset-bottom in index.css so the
      // toast clears the fixed bottom nav and the home-indicator inset.
      style={{
        ['--offset-bottom' as string]: 'max(1rem, env(safe-area-inset-bottom))',
      } as React.CSSProperties}
      {...props}
    />
  );
};

export { Toaster };
