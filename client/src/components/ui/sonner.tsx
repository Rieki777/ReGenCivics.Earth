import type React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      // Push toast above iOS home-indicator so it doesn't collide with the
      // safe-area inset on phones with rounded corners.
      style={{
        ['--offset-bottom' as string]: 'max(1rem, env(safe-area-inset-bottom))',
      } as React.CSSProperties}
      {...props}
    />
  );
};

export { Toaster };
