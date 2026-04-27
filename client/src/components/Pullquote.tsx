export function Pullquote({ children }: { children: string }) {
  // Wraps the quote in a contrasting scrim so it stays readable against the
  // colorful illustration backgrounds (e.g. /fund's regen-island art) where
  // the previous translucent-green text washed into the underlying image
  // and pushed the eye to a smear of color rather than the words.
  return (
    <blockquote className="my-12 mx-auto max-w-2xl text-center px-4">
      <div className="relative px-6 sm:px-10 py-6 sm:py-8 rounded-2xl bg-[#0d2818]/70 backdrop-blur-md border border-[#7dd87d]/25 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
        <p
          className="text-2xl md:text-3xl italic text-[#7dd87d] leading-relaxed"
          style={{ fontFamily: "var(--font-display)", textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
        >
          &ldquo;{children}&rdquo;
        </p>
      </div>
    </blockquote>
  );
}
