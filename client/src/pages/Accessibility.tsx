import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { Check, Keyboard, Eye } from "lucide-react";

export default function Accessibility() {
  return (
    <div className="min-h-screen bg-[#0d2818] text-white pb-24 md:pb-0">
      <SEO title="Accessibility | ReGen Civics" description="Our commitment to making ReGen Civics accessible to everyone." />
      <BackButton />
      <main id="main-content" className="container max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-6" style={{ fontFamily: "var(--font-display)" }}>
          Accessibility
        </h1>
        <p className="text-white/70 text-lg mb-8 safe-prose">
          ReGen Civics is built for everyone. We work toward WCAG 2.1 AA conformance across all pages. Here is what we have done and what we are working on.
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold text-[#7dd87d] mb-4 flex items-center gap-2">
              <Check className="w-5 h-5" /> What works today
            </h2>
            <ul className="space-y-2 text-white/80 safe-prose">
              <li>Skip-to-content link on every page</li>
              <li>Keyboard navigation with visible focus rings</li>
              <li>Screen reader landmarks (header, main, nav, footer)</li>
              <li>Alt text on all meaningful images</li>
              <li>44px minimum touch targets on mobile</li>
              <li>Color contrast meeting AA on body text</li>
              <li>Reduced motion support (all animations pause)</li>
              <li>Semantic heading hierarchy (h1 through h4)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#d4a574] mb-4 flex items-center gap-2">
              <Keyboard className="w-5 h-5" /> Keyboard shortcuts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { keys: "Ctrl + K", action: "Open search" },
                { keys: "Tab", action: "Move focus forward" },
                { keys: "Shift + Tab", action: "Move focus backward" },
                { keys: "Escape", action: "Close overlays" },
                { keys: "Enter / Space", action: "Activate buttons" },
              ].map((s) => (
                <div key={s.keys} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                  <kbd className="bg-[#1a472a] text-[#7dd87d] px-2 py-1 rounded text-xs font-mono">{s.keys}</kbd>
                  <span className="text-white/70 text-sm">{s.action}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white/90 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" /> Try it yourself
            </h2>
            <div className="space-y-3 text-white/70 safe-prose">
              <p>Navigate this page using only your keyboard. Every interactive element should receive a visible green focus ring.</p>
              <p>Zoom your browser to 200%. All content should remain readable and usable without horizontal scrolling.</p>
              <p>Enable your operating system's reduced motion setting. All animations on the site should stop.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white/90 mb-4">Feedback</h2>
            <p className="text-white/70 safe-prose">
              If you encounter a barrier on any page, tell us. Post in the community forum or reach out through the contact page. We treat accessibility issues as high priority.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
