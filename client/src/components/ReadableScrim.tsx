/**
 * ReadableScrim — a hug-the-content dark-green translucent backing for
 * light text laid over busy background imagery.
 *
 * Replaces the one-off panel patterns scattered across the site so every
 * text-over-image block carries the same contrast. The scrim:
 *   - background rgba(13,40,24,0.72) (matches the brand #0d2818 forest
 *     deep at 72% alpha)
 *   - backdrop-blur-sm for extra legibility over noisy hero photos
 *   - rounded corners + small padding so it hugs the text
 *   - intentionally NOT full-bleed: pass `className` to override width
 *     constraints in special cases, but the default is `inline-block`
 *     so it sizes to its children.
 *
 * Usage:
 *   <ReadableScrim>
 *     <h2 className="text-white">Heading</h2>
 *     <p className="text-white/90">Subhead</p>
 *   </ReadableScrim>
 *
 * Or as a block:
 *   <ReadableScrim as="div" block className="max-w-2xl mx-auto">…</ReadableScrim>
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ReadableScrimProps extends React.HTMLAttributes<HTMLElement> {
  /** Render as a different element. Defaults to <div>. */
  as?: keyof React.JSX.IntrinsicElements;
  /** Use block layout instead of the default inline-block hug. */
  block?: boolean;
}

export function ReadableScrim({
  as = "div",
  block = false,
  className,
  children,
  ...rest
}: ReadableScrimProps) {
  const Tag = as as React.ElementType;
  return (
    <Tag
      className={cn(
        "rounded-xl backdrop-blur-sm",
        block ? "block" : "inline-block",
        // padding kept tight so the panel hugs the text; consumers can
        // override with `className` when they need more room.
        "px-4 py-3 md:px-5 md:py-4",
        className,
      )}
      style={{
        backgroundColor: "rgba(13,40,24,0.72)",
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default ReadableScrim;
