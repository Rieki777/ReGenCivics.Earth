/**
 * RelatedContent - "Continue Exploring" section for page bottoms
 * Shows 2-3 contextually relevant page links + a related blog post
 */
import { Link } from "wouter";
import { ArrowRight, BookOpen } from "lucide-react";
import { COOP } from "@shared/fund";
import { APPLICATIONS, APPLICATIONS_SHORT, APPLY_BUTTON_LABEL } from "@shared/applicationWindow";

// The first sentence of the crowdpool lane's binding wording (Phase 0 spec),
// short enough for a two-line card.
const CROWDPOOLING_LINE =
  "Crowdpooling coordinates and accounts for what people bring to land projects: time, things, skills, land and money.";

interface RelatedPage {
  href: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface RelatedBlog {
  slug: string;
  title: string;
  excerpt: string;
}

interface RelatedContentProps {
  pages: RelatedPage[];
  blog?: RelatedBlog;
  className?: string;
}

export function RelatedContent({ pages, blog, className = "" }: RelatedContentProps) {
  return (
    <section className={`py-12 md:py-16 px-4 ${className}`}>
      <div className="max-w-4xl mx-auto bg-[#0d2614] rounded-3xl border border-white/5 p-6 md:p-10 shadow-lg shadow-black/30">
        <h3
          className="text-[#7dd87d] text-sm font-bold uppercase tracking-wider mb-6 text-center"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          Continue Exploring
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page, i) => (
            <div
              key={page.href}
              data-reveal="up"
              data-reveal-delay={String(i * 100)}
            >
              <Link href={page.href}>
                <div className="group p-5 rounded-xl bg-white/5 border border-white/10 hover:border-[#7dd87d]/30 hover:bg-white/8 transition-all cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    {page.icon && (
                      <div className="w-8 h-8 rounded-lg bg-[#7dd87d]/10 flex items-center justify-center flex-shrink-0 text-[#7dd87d]">
                        {page.icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold text-sm mb-1 group-hover:text-[#7dd87d] transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                        {page.title}
                      </h4>
                      <p className="text-white/70 text-xs leading-relaxed line-clamp-2">
                        {page.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/70 group-hover:text-[#7dd87d] transition-colors flex-shrink-0 mt-0.5" />
                  </div>
                </div>
              </Link>
            </div>
          ))}

          {blog && (
            <div
              data-reveal="up"
              data-reveal-delay={String(pages.length * 100)}
            >
              <Link href={`/blog/${blog.slug}`}>
                <div className="group p-5 rounded-xl bg-[#7dd87d]/5 border border-[#7dd87d]/20 hover:border-[#7dd87d]/40 hover:bg-[#7dd87d]/10 transition-all cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-[#7dd87d]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#7dd87d]/80 text-[11px] uppercase tracking-wider font-bold mb-1">
                        Related Read
                      </p>
                      <h4 className="text-white font-semibold text-sm mb-1 group-hover:text-[#7dd87d] transition-colors line-clamp-2" style={{ fontFamily: "var(--font-display)" }}>
                        {blog.title}
                      </h4>
                      <p className="text-white/70 text-xs leading-relaxed line-clamp-2">
                        {blog.excerpt}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Pre-configured related content for each major page
export const relatedContentMap: Record<string, { pages: RelatedPage[]; blog?: RelatedBlog }> = {
  // The fund and land entries used to end on two investment blog posts. They
  // now point at the cooperative pages instead (Phase 0, 2026-09-27).
  fund: {
    pages: [
      { href: "/opportunity", title: "Help Design the Cooperative", description: "How the cooperative is being designed, and the principles we are working from." },
      { href: "/land", title: "Land Projects", description: "Meet the regenerative land projects in the ReGen Civics seasons." },
      { href: "/showcase", title: "Project Showcase", description: "See approved projects and their progress." },
    ],
  },
  land: {
    pages: [
      { href: "/fund", title: "The Cooperative", description: "A member-owned cooperative for land, now in design." },
      { href: "/game", title: "Play the Game", description: "Earn tokens and complete quests to support land projects." },
      { href: "/showcase", title: "Project Showcase", description: "See approved projects and their regenerative impact." },
    ],
  },
  ally: {
    pages: [
      { href: "/land", title: "Land Projects", description: "See the regenerative land projects your organization can support." },
      { href: "/crowd-pooling", title: "Crowd Pooling", description: CROWDPOOLING_LINE },
      { href: "/team", title: "Our Team", description: "Meet the people building the ReGenerative Renaissance." },
    ],
    blog: { slug: "what-if-organizations-met-needs", title: "What If Organizations Met Human Needs?", excerpt: "Reimagining organizational design through the lens of regenerative systems." },
  },
  game: {
    pages: [
      { href: "/quest", title: "Start Questing", description: "Browse available quests and start earning tokens today." },
      { href: "/crowd-pooling", title: "Crowd Pooling", description: CROWDPOOLING_LINE },
      { href: "/calculator", title: "Contribution Calculator", description: "Measure your full value across 9 forms of capital." },
    ],
    blog: { slug: "introducing-games-and-quests", title: "Introducing Games and Quests", excerpt: "Play your way to regeneration with our infinite game mechanics." },
  },
  opportunity: {
    pages: [
      { href: "/fund", title: "The Cooperative", description: "What the cooperative is and where it stands today." },
      { href: "/loi", title: "Tell Us You're Interested", description: COOP.interestPromise },
      { href: "/schedule", title: "Book a Session", description: "Join an open session to ask questions and meet the team." },
    ],
    blog: { slug: "what-makes-regen-civics-different", title: "What Makes ReGen Civics Different", excerpt: "7 unique features that set our regenerative platform apart." },
  },
  seasons: {
    pages: [
      { href: "/schedule#follow-along", title: "Follow Along Live", description: "Watch Season 2 live, and crowdpool with the cohort if your project is ready." },
      { href: "/apply", title: APPLICATIONS.reviewing ? APPLY_BUTTON_LABEL : "Apply Anytime", description: APPLICATIONS.reviewing ? `${APPLICATIONS_SHORT}.` : "Season 2 applications are closed. Apply anytime for the next season of the incubator." },
      { href: "/game", title: "Play the Game", description: "Start contributing as a player while you prepare your application." },
    ],
    blog: { slug: "how-to-apply-for-season-2", title: "How to Apply for Season 2", excerpt: "Complete guide to the application process, requirements, and timeline." },
  },
  blog: {
    pages: [
      { href: "/game", title: "Play the Game", description: "Put what you've learned into practice with quests and contributions." },
      { href: "/schedule", title: "Open Sessions", description: "Join a live session to discuss topics from our blog." },
      { href: "/community", title: "Community Forum", description: "Continue the conversation in The Gathering Grove." },
    ],
  },
  schedule: {
    pages: [
      { href: "/seasons", title: "Seasons", description: "Learn about our seasonal incubator program for land projects." },
      { href: "/team", title: "Meet the Team", description: "Get to know the people you'll be working with." },
      { href: "/apply", title: "Apply", description: "Ready to join? Submit your application." },
    ],
    blog: { slug: "remembering-season-1", title: "Remembering Season 1", excerpt: "A look back at our first cohort: 43 applied, 16 presented, 13 were selected." },
  },
  team: {
    pages: [
      { href: "/connect?path=role", title: "Apply for a Role", description: "Join our self-organizing team and contribute your skills." },
      { href: "/schedule", title: "Open Sessions", description: "Meet the team at our weekly community gatherings." },
      { href: "/governance", title: "Governance", description: "Learn how our decentralized governance works." },
    ],
    blog: { slug: "regen-civics-runs-on-base", title: "ReGen Civics Runs on Base", excerpt: "Why we chose Coinbase's blockchain via Hypha DAO for governance." },
  },
};

export default RelatedContent;
