export function Pullquote({ children }: { children: string }) {
  return (
    <blockquote className="my-12 mx-auto max-w-2xl text-center px-8">
      <p className="text-2xl md:text-3xl italic text-[#7dd87d]/80 leading-relaxed" style={{ fontFamily: "var(--font-display)" }}>
        "{children}"
      </p>
    </blockquote>
  );
}
