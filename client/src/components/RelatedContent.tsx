/**
 * RelatedContent - "Continue Exploring" section for page bottoms
 * Shows 2-3 contextually relevant page links + a related blog post
 */
import { Link } from "wouter";
import { ArrowRight, BookOpen } from "lucide-react";

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
    <section className={`py-12 md:py-16 px-4 bg-[#0d2614] ${className}`}>
      <div className="max-w-4xl mx-auto">
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
                      <p className="text-white/50 text-xs leading-relaxed line-clamp-2">
                        {page.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-[#7dd87d] transition-colors flex-shrink-0 mt-0.5" />
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
                      <p className="text-[#7dd87d]/60 text-[10px] uppercase tracking-wider font-bold mb-1">
                        Related Read
                      </p>
                      <h4 className="text-white font-semibold text-sm mb-1 group-hover:text-[#7dd87d] transition-colors line-clamp-2" style={{ fontFamily: "var(--font-display)" }}>
                        {blog.title}
                      </h4>
                      <p className="text-white/50 text-xs leading-relaxed line-clamp-2">
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
  fund: {
    pages: [
      { href: "/opportunity", title: "Investment Thesis", description: "Read the full investment memorandum and fund structure details." },
      { href: "/land", title: "Land Projects", description: "Explore the regenerative land projects in our portfolio pipeline." },
      { href: "/showcase", title: "Project Showcase", description: "See approved projects and their progress." },
    ],
    blog: { slug: "what-makes-land-project-good-investment", title: "What Makes a Land Project a Good Investment", excerpt: "The four pillars we evaluate when selecting regenerative land projects for the fund." },
  },
  land: {
    pages: [
      { href: "/fund", title: "For Investors", description: "Learn how the fund supports land projects with capital and resources." },
      { href: "/game", title: "Play the Game", description: "Earn tokens and complete quests to support land projects." },
      { href: "/showcase", title: "Project Showcase", description: "See approved projects and their regenerative impact." },
    ],
    blog: { slug: "getting-investment-through-regen-civics", title: "Getting Investment Into Your Land Project", excerpt: "A step-by-step guide to accessing capital through the ReGen Civics fund." },
  },
  ally: {
    pages: [
      { href: "/land", title: "Land Projects", description: "See the regenerative land projects your organization can support." },
      { href: "/crowd-pooling", title: "Crowd Pooling", description: "Contribute resources and expertise to active campaigns." },
      { href: "/team", title: "Our Team", description: "Meet the people building the regenerative renaissance." },
    ],
    blog: { slug: "what-if-organizations-met-needs", title: "What If Organizations Met Human Needs?", excerpt: "Reimagining organizational design through the lens of regenerative systems." },
  },
  game: {
    pages: [
      { href: "/quest", title: "Start Questing", description: "Browse available quests and start earning tokens today." },
      { href: "/crowd-pooling", title: "Crowd Pooling", description: "Pool resources with other players to fund regenerative projects." },
      { href: "/calculator", title: "Contribution Calculator", description: "Measure your full value across 8 forms of capital." },
    ],
    blog: { slug: "introducing-games-and-quests", title: "Introducing Games and Quests", excerpt: "Play your way to regeneration with our infinite game mechanics." },
  },
  opportunity: {
    pages: [
      { href: "/fund", title: "Fund Overview", description: "See the full fund structure, treasury, and impact metrics." },
      { href: "/risk-disclosure", title: "Risk Disclosure", description: "Review our full risk disclosures before investing." },
      { href: "/schedule", title: "Book a Session", description: "Join an open session to ask questions and meet the team." },
    ],
    blog: { slug: "what-makes-regen-civics-different", title: "What Makes ReGen Civics Different", excerpt: "7 unique features that set our regenerative platform apart." },
  },
  seasons: {
    pages: [
      { href: "/apply", title: "Apply Now", description: "Submit your application for the next season of the incubator." },
      { href: "/schedule", title: "Open Sessions", description: "Attend a community session to learn more before applying." },
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
    blog: { slug: "remembering-season-1", title: "Remembering Season 1", excerpt: "A look back at the first 16 regenerative land projects in our program." },
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
