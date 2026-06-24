/**
 * Alliance Organizations Path - Biofi-style continuous background
 * Teal/cyan accent color throughout
 * Sections: Hero, Why Join, Categories, How to Join, Bottom CTA
 */

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Play,
  Plus,
  ChevronDown,
  ChevronUp,
  Users,
  Handshake,
  Globe,
  Network,
  Building,
  Shield,
  Leaf,
  Calendar,
  FileText,
  Zap,
  Heart,
  Target,
  Lightbulb,
  Wrench,
  GraduationCap,
  MessageCircle,
  BarChart3,
  Stethoscope,
  Printer,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PageBackground from "@/components/PageBackground";
import { HeroPageLoader } from "@/components/HeroPageLoader";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SocialLinks } from "@/components/SocialLinks";
import { SEO } from "@/components/SEO";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { cdnImg } from "@/lib/utils";

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="glass-panel overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-400/15 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-cyan-400" />
          </div>
          <h3
            className="text-lg md:text-xl font-bold text-white flex-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h3>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-0">
          <div className="ml-13 pl-4 border-l-2 border-cyan-400/20">
            <div className="text-white/70 text-base leading-relaxed space-y-3 safe-prose">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const allianceCategories = [
  {
    icon: Leaf,
    title: "Regenerative Design",
    desc: "Permaculture, landscape architecture, ecological restoration, food forest design",
  },
  {
    icon: Shield,
    title: "Legal and Governance",
    desc: "Community land trusts, cooperative law, DAO frameworks, land tenure, private associations and 508s",
  },
  {
    icon: Target,
    title: "Financial Services",
    desc: "Impact investing, community currencies, financial modeling, accounting",
  },
  {
    icon: Lightbulb,
    title: "Technology",
    desc: "Software, blockchain, data systems, mapping, monitoring tools, governance, and other village support tech",
  },
  {
    icon: Wrench,
    title: "Infrastructure",
    desc: "Construction, renewable energy, water systems, waste management, food systems, etc",
  },
  {
    icon: GraduationCap,
    title: "Education and Training",
    desc: "Permaculture education, community facilitation, skill building",
  },
  {
    icon: Stethoscope,
    title: "Health and Wellness",
    desc: "Holistic health, mental health, spiritual health, community wellness programs",
  },
  {
    icon: MessageCircle,
    title: "Communications",
    desc: "Media, storytelling, marketing, community engagement",
  },
  {
    icon: BarChart3,
    title: "Research and Impact",
    desc: "Impact measurement, academic research, data analysis",
  },
];

export default function Ally() {
  const heroImages = [cdnImg("https://assets.regencivics.earth/eXNPGpLcSCSGimHX.webp", 1920), cdnImg("https://assets.regencivics.earth/koFosXIQDWqRuiaq.webp", 900)];

  return (
    <HeroPageLoader images={heroImages}>
    <PageBackground
      backgroundImage={cdnImg("https://assets.regencivics.earth/eXNPGpLcSCSGimHX.webp", 1920)}
      mobileBackgroundImage={cdnImg("https://assets.regencivics.earth/koFosXIQDWqRuiaq.webp", 900)}
      blurPlaceholder={cdnImg("https://assets.regencivics.earth/rUMeusROmsGTXuQF.webp")}
      mobileBlurPlaceholder={cdnImg("https://assets.regencivics.earth/oFcGbAHWTvIUIFjk.webp")}
      overlayOpacity={0.65}
      theme="sky"
      blendColor="15, 40, 45"
      overlayColor="15, 40, 45"
      scrollWithPage={true}
      sectionOverlays={[
        { id: "hero", opacity: 0.30 },             // Hero - let image detail show through
        { id: "roles", opacity: 0.55 },             // Alliance roles
        { id: "benefits", opacity: 0.50 },           // Benefits - let network art show
        { id: "process", opacity: 0.55 },            // How it works
        { id: "cta", opacity: 0.60 },                // Call to action
      ]}
    >
      <SEO
        title="Alliance Network - Amplify Your Impact"
        description="Join organizations supporting regenerative land projects. Amplify your impact, connect to clients, and fundraise together through the ReGen Civics Alliance."
        url="/ally"
      />

      {/* Hero */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">

          <AnimatedSection animation="fade-in">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full glass-panel-light text-cyan-400 text-base"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              <Handshake className="w-5 h-5" />
              <span>Alliance Path</span>
            </div>
          </AnimatedSection>


          <AnimatedSection animation="slide-up" delay={200}>
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-white leading-tight text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Alliance <span className="text-cyan-400">Network</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection animation="slide-up" delay={400}>
            <p
              className="text-lg md:text-xl lg:text-2xl text-white/80 mb-8 leading-relaxed max-w-3xl mx-auto text-shadow-subtle safe-prose"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Your organization already does important work. Together, we can do what none of us
              can do alone. Join a growing alliance weaving a support network for regenerative land
              projects worldwide.
            </p>
          </AnimatedSection>

          {/* CTAs */}
          <AnimatedSection animation="slide-up" delay={600}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/connect?path=alliance">
                <Button
                  className="bg-cyan-400 text-[#1a472a] hover:bg-cyan-300 font-bold px-8 py-4 text-lg w-full sm:w-auto h-auto"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Handshake className="w-5 h-5 mr-2" />
                  Apply as Alliance Partner
                </Button>
              </Link>
              <Link href="/tools">
                <Button
                  variant="outline"
                  className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 font-bold px-8 py-4 text-lg w-full sm:w-auto h-auto"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your Tool
                </Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Why Join the Alliance */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up">
            <h2
              className="text-3xl md:text-5xl font-bold text-white mb-3 text-center text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Why Join the <span className="text-cyan-400">Alliance</span>
            </h2>
            <p
              className="text-white/60 text-center mb-8 max-w-xl mx-auto text-lg text-shadow-subtle"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Each org brings something the others can't. Pooled, that becomes real capacity for land projects.
            </p>
          </AnimatedSection>

          <div className="space-y-3">
            <AnimatedSection animation="slide-up" delay={100}>
              <CollapsibleSection title="Amplify Your Impact" icon={Zap} defaultOpen={true}>
                <p>
                  As part of the ReGen Civics Alliance, your work reaches more projects, more
                  communities, and more land. Instead of searching for clients one by one, you gain
                  access to a pipeline of regenerative land projects that need exactly what you offer.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={200}>
              <CollapsibleSection title="Connect to Land Projects" icon={Network}>
                <p>
                  Every season, we onboard new land projects through our accelerator program. These
                  projects need legal support, regenerative design, financial modeling, governance
                  frameworks, technology infrastructure, community building, and more. Alliance
                  partners are matched to projects based on their specific needs.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={300}>
              <CollapsibleSection title="Fundraise Together" icon={Target}>
                <p>
                  Through the alliance, we pursue collaborative funding opportunities, pool resources
                  for shared infrastructure, and create collective impact reports that attract larger
                  funders. Your fundraising capacity grows because you are part of something bigger.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={400}>
              <CollapsibleSection title="Shared Infrastructure" icon={Building}>
                <p>
                  Alliance partners share tools, templates, methodologies, and platforms. From
                  frameworks and technology to legal document libraries to communication channels,
                  the alliance provides infrastructure that would be expensive to build alone.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={500}>
              <CollapsibleSection title="Governance and Voice" icon={Globe}>
                <p>
                  Alliance partners have a voice in how ReGen Civics evolves. Participate in
                  governance decisions, shape the direction of the fund, influence which projects get
                  supported, and help design the systems that serve the broader movement.
                </p>
              </CollapsibleSection>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Alliance Categories - Collapsible */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up">
            <h2
              className="text-3xl md:text-5xl font-bold text-white mb-3 text-center text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Who We Are <span className="text-cyan-400">Looking For</span>
            </h2>
            <p
              className="text-white/60 text-center mb-8 max-w-xl mx-auto text-lg text-shadow-subtle"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Organizations across every domain needed to support regenerative land projects.
            </p>
          </AnimatedSection>

          <AnimatedSection animation="slide-up" delay={100}>
            <CollapsibleSection title="Explore Alliance Categories" icon={Users} defaultOpen={false}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {allianceCategories.map((cat, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <cat.icon className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                      <h3
                        className="text-base font-bold text-white"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {cat.title}
                      </h3>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">{cat.desc}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </AnimatedSection>
        </div>
      </section>

      {/* How to Join */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up">
            <h2
              className="text-3xl md:text-5xl font-bold text-white mb-8 text-center text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How to <span className="text-cyan-400">Join</span>
            </h2>
          </AnimatedSection>

          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Apply",
                desc: "Submit your organization's profile, areas of expertise, and how you want to contribute. We review applications on a rolling basis.",
                icon: FileText,
              },
              {
                step: "02",
                title: "Onboard",
                desc: "Meet the network, understand the current projects and their needs, and identify where your organization fits. We match you with projects and fellow alliance partners.",
                icon: Users,
              },
              {
                step: "03",
                title: "Collaborate",
                desc: "Begin working with land projects, contributing your expertise, and collaborating with other alliance partners. 3 days a season minimum time demand.",
                icon: Handshake,
              },
              {
                step: "04",
                title: "Equity, Service and/or Token Swap",
                desc: "Swap products, services, equity and/or tokens with ReGen Civics so that you're co-invested with everyone else in the network. Every alliance organisation is invested in ReGen Civics, which is invested in every alliance organisation and land project. This way we tie all our interests together and create a single vehicle to fundraise for us all.",
                icon: Network,
              },
              {
                step: "05",
                title: "Grow Together",
                desc: "As the network grows, so does your reach and impact. New projects, new funding opportunities, and new partnerships emerge each season.",
                icon: Heart,
              },
            ].map((item, i) => {
              const [isOpen, setIsOpen] = useState(false);
              return (
                <AnimatedSection key={i} animation="slide-up" delay={i * 100}>
                  <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-start gap-4 p-5 md:p-6 glass-panel cursor-pointer hover:bg-white/5 transition-all">
                        <div className="w-12 h-12 rounded-full bg-cyan-400/20 flex items-center justify-center flex-shrink-0">
                          <span
                            className="text-cyan-400 font-bold text-base"
                            style={{ fontFamily: "var(--font-accent)" }}
                          >
                            {item.step}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3
                              className="text-lg md:text-xl font-bold text-cyan-400"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {item.title}
                            </h3>
                            {isOpen ? (
                              <ChevronUp className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0 glass-panel border-t-0 rounded-t-none">
                        <div className="ml-16">
                          <p
                            className="text-white/70 text-base leading-relaxed safe-prose"
                            style={{ fontFamily: "var(--font-body)" }}
                          >
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection animation="scale-in">
            <div className="glass-panel p-8 md:p-12 border-cyan-400/20">
              <SeedOfLifeIcon className="w-12 h-12 text-cyan-400/40 mx-auto mb-6" />
              <h2
                className="text-2xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Join the <span className="text-cyan-400">Alliance</span>
              </h2>
              <p className="text-white/60 text-base md:text-lg mb-6 max-w-xl mx-auto safe-prose">
                Or reach out to explore collaboration.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/connect?path=alliance">
                  <Button
                    className="bg-cyan-400 text-[#1a472a] hover:bg-cyan-300 font-bold px-8 py-4 text-lg h-auto"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    Apply as Alliance Partner
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/tools">
                  <Button
                    variant="outline"
                    className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 font-bold px-8 py-4 text-lg h-auto"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your Tool
                  </Button>
                </Link>
              </div>
            </div>
          </AnimatedSection>

      {/* Related Content */}
      <RelatedContent pages={relatedContentMap.ally.pages} blog={relatedContentMap.ally.blog} />
        </div>
      </section>
    </PageBackground>
    </HeroPageLoader>
  );
}
