/**
 * LegalPageLayout - Two-column professional layout for legal documents.
 * Sticky TOC on desktop, auto-generated from section headings via ref scanning.
 */

import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { SEO } from "@/components/SEO";

interface LegalPageLayoutProps {
  icon: React.ReactNode;
  title: string;
  lastUpdated: string;
  seo: Parameters<typeof SEO>[0];
  children: React.ReactNode;
}

interface TocEntry {
  id: string;
  label: string;
}

export default function LegalPageLayout({
  icon,
  title,
  lastUpdated,
  seo,
  children,
}: LegalPageLayoutProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Build TOC from h2 elements after render
  useEffect(() => {
    if (!contentRef.current) return;
    const headings = Array.from(contentRef.current.querySelectorAll("h2"));
    const entries: TocEntry[] = headings.map((h, i) => {
      const id = h.id || `section-${i}`;
      h.id = id;
      return { id, label: h.textContent || "" };
    });
    setToc(entries);
  }, [children]);

  // Highlight active section on scroll
  useEffect(() => {
    if (toc.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [toc]);

  return (
    <div className="min-h-screen bg-[#0d2818] text-white">
      <SEO {...seo} />

      {/* Header */}
      <div className="bg-gradient-to-b from-[#1a472a] to-[#0d2818] py-8 px-4 border-b border-[#7dd87d]/20">
        <div className="container mx-auto max-w-6xl">
          <BackButton />
          <div className="flex items-center gap-3 mt-4 mb-2">
            {icon}
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h1>
          </div>
          <p className="text-white/50 text-sm">
            Last Updated:{" "}
            <span className="text-[#7dd87d] font-medium">{lastUpdated}</span>
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex gap-10">
          {/* Sticky TOC  -  desktop only */}
          {toc.length > 0 && (
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-24">
                <p className="text-xs uppercase tracking-widest text-[#7dd87d]/60 font-semibold mb-3">
                  Contents
                </p>
                <nav className="flex flex-col gap-1">
                  {toc.map(({ id, label }) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      className={`text-xs leading-snug py-1 px-2 rounded transition-colors border-l-2 ${
                        activeId === id
                          ? "border-[#7dd87d] text-white bg-white/5"
                          : "border-transparent text-white/40 hover:text-white/70 hover:border-[#7dd87d]/40"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Main content */}
          <div
            ref={contentRef}
            className="flex-1 min-w-0 prose prose-invert max-w-none text-white/80 text-sm leading-relaxed"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
