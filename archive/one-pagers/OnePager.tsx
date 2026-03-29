/**
 * Printable One-Pager Pages
 * Auto-generated branded one-pagers for each path:
 * - Investors
 * - Land Projects
 * - Alliance Partners
 * 
 * Optimized for print (A4/Letter), with a "Download PDF" button
 * that triggers the browser's print dialog.
 */

import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer, Download, ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";

// One-pager content for each path
const onePagerData: Record<string, {
  title: string;
  subtitle: string;
  tagline: string;
  heroColor: string;
  accentColor: string;
  sections: { heading: string; content: string }[];
  cta: { label: string; url: string };
  stats: { label: string; value: string }[];
  keyBenefits: string[];
}> = {
  investors: {
    title: "Investor Path",
    subtitle: "ReGen Civics Alliance",
    tagline: "Systemic change through regenerative investment",
    heroColor: "#1a472a",
    accentColor: "#d4a574",
    sections: [
      {
        heading: "The Opportunity",
        content: "The regenerative economy represents a $12T+ market opportunity. ReGen Civics provides a de-risked vehicle for impact investors seeking both financial returns and measurable ecological and social outcomes. Our fund structure combines traditional venture mechanics with regenerative principles, creating a new asset class that grows value while healing ecosystems."
      },
      {
        heading: "How It Works",
        content: "Investors participate through the ReGen Civics Fund, which deploys capital into a diversified portfolio of regenerative land projects across Latin America, Europe, and beyond. Each project undergoes rigorous due diligence using our HEIST (Holistic Ecosystemic Impact & Sustainability Tracking) framework. Capital is released in milestone-based tranches, reducing risk while ensuring accountability."
      },
      {
        heading: "Fund Structure",
        content: "The fund operates as a blended finance vehicle combining equity, revenue-share, and impact-linked instruments. Target returns of 8-15% IRR over a 7-10 year horizon, with quarterly reporting on both financial and impact metrics. Minimum investment starts at $25,000 with accredited investor verification."
      },
      {
        heading: "Impact Measurement",
        content: "Every dollar invested is tracked through our transparent impact dashboard showing hectares regenerated, carbon sequestered, families housed, biodiversity indices, and community economic multipliers. Investors receive quarterly impact reports alongside financial statements."
      }
    ],
    cta: { label: "Schedule a Discovery Call", url: "https://www.regencivics.earth/opportunity" },
    stats: [
      { label: "Target Fund Size", value: "$50M" },
      { label: "Projects in Pipeline", value: "12+" },
      { label: "Countries", value: "6" },
      { label: "Target IRR", value: "8-15%" }
    ],
    keyBenefits: [
      "Diversified portfolio across geographies and project types",
      "Milestone-based capital deployment reduces risk",
      "Transparent impact tracking via HEIST framework",
      "Quarterly financial and impact reporting",
      "Access to a growing network of regenerative projects",
      "Tax advantages through impact investment structures"
    ]
  },
  "land-projects": {
    title: "Land Projects Path",
    subtitle: "ReGen Civics Alliance",
    tagline: "Launch your regenerative project with community backing",
    heroColor: "#1a472a",
    accentColor: "#7dd87d",
    sections: [
      {
        heading: "Your Project, Amplified",
        content: "ReGen Civics helps regenerative land projects access funding, talent, and community support through our crowd-pooling platform. Whether you're building an ecovillage, restoring degraded land, or launching a permaculture farm, we provide the infrastructure to turn your vision into reality."
      },
      {
        heading: "How Crowd Pooling Works",
        content: "Create a campaign that details your project's vision, team, land, equipment needs, and financial targets. Our platform matches you with contributors who can offer financial support, professional skills, equipment, or volunteer time. Campaigns run for up to 365 days with milestone-based fund releases."
      },
      {
        heading: "What We Provide",
        content: "Beyond funding, you get access to our alliance network of regenerative professionals, governance tools through Hypha DAO, impact measurement frameworks, and a community of like-minded projects. We help you build not just a project, but a thriving regenerative economy."
      },
      {
        heading: "Getting Started",
        content: "Apply through our platform with your project details. Once approved by our review team, your campaign goes live to our community of investors and contributors. We provide templates, guidance, and support throughout the process."
      }
    ],
    cta: { label: "Start Your Campaign", url: "https://www.regencivics.earth/create-campaign" },
    stats: [
      { label: "Active Projects", value: "4+" },
      { label: "Total Contributed", value: "$1.2M+" },
      { label: "Contributors", value: "110+" },
      { label: "Campaign Duration", value: "Up to 365 days" }
    ],
    keyBenefits: [
      "Access financial and non-financial contributions",
      "Connect with skilled professionals and volunteers",
      "Governance tools through Hypha DAO integration",
      "Impact measurement and reporting frameworks",
      "Community of regenerative practitioners",
      "Ongoing support and mentorship from alliance partners"
    ]
  },
  "alliance-partners": {
    title: "Alliance Partners Path",
    subtitle: "ReGen Civics Alliance",
    tagline: "Co-create the regenerative renaissance together",
    heroColor: "#1a472a",
    accentColor: "#e8b86d",
    sections: [
      {
        heading: "Join the Alliance",
        content: "The ReGen Civics Alliance brings together organizations, consultancies, and professionals who share a commitment to regenerative development. As an alliance partner, you contribute your expertise while accessing a growing ecosystem of projects, funding, and collaborative opportunities."
      },
      {
        heading: "Partnership Model",
        content: "Alliance partners operate within our ecosystemic framework, contributing specialized services (design, engineering, legal, ecological assessment, etc.) to land projects in exchange for equity participation, revenue share, or direct compensation. The alliance model creates mutual benefit through shared success."
      },
      {
        heading: "Governance & Voice",
        content: "Partners participate in governance through our Hypha DAO integration, contributing to decisions about fund allocation, project selection, and alliance strategy. Your voice shapes the direction of the regenerative movement."
      },
      {
        heading: "Growth Opportunities",
        content: "Access a pipeline of regenerative projects seeking your expertise. Build your portfolio of impact work. Connect with investors, other professionals, and communities driving systemic change. The alliance is designed to grow your practice while growing the movement."
      }
    ],
    cta: { label: "Apply to Join the Alliance", url: "https://www.regencivics.earth/apply" },
    stats: [
      { label: "Alliance Partners", value: "20+" },
      { label: "Disciplines", value: "15+" },
      { label: "Projects Supported", value: "8+" },
      { label: "Countries Active", value: "6" }
    ],
    keyBenefits: [
      "Access a pipeline of funded regenerative projects",
      "Equity and revenue-share participation options",
      "Governance voice through Hypha DAO",
      "Network with other regenerative professionals",
      "Build your impact portfolio and case studies",
      "Co-create standards for regenerative development"
    ]
  }
};

export default function OnePager() {
  const [, params] = useRoute("/one-pager/:path");
  const pathKey = params?.path || "investors";
  const data = onePagerData[pathKey];

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1a472a] mb-4">One-Pager Not Found</h1>
          <Link href="/">
            <Button variant="outline">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      {/* Print Controls - Hidden in print */}
      <div className="print:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-[#1a472a]/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="text-[#1a472a] gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Site
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button 
              onClick={handlePrint}
              className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white gap-2"
            >
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </Button>
          </div>
        </div>
      </div>

      {/* One-Pager Content - Optimized for A4 print */}
      <div className="max-w-4xl mx-auto px-4 py-8 print:px-0 print:py-0 print:max-w-none">
        <div className="bg-white shadow-lg print:shadow-none rounded-lg print:rounded-none overflow-hidden" style={{ maxWidth: '210mm', margin: '0 auto' }}>
          
          {/* Header */}
          <div 
            className="px-8 py-6 print:px-10 print:py-6 text-white relative overflow-hidden"
            style={{ backgroundColor: data.heroColor }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
              <SeedOfLifeIcon className="w-full h-full text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <SeedOfLifeIcon className="w-8 h-8 text-[#7dd87d]" />
                <span className="text-sm font-medium text-white/70">{data.subtitle}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-display, Quicksand, sans-serif)' }}>
                {data.title}
              </h1>
              <p className="text-lg text-white/90">{data.tagline}</p>
            </div>
          </div>

          {/* Stats Bar */}
          <div 
            className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-[#1a472a]/10"
            style={{ backgroundColor: `${data.accentColor}15` }}
          >
            {data.stats.map((stat, i) => (
              <div 
                key={i} 
                className={`px-4 py-3 text-center ${i < data.stats.length - 1 ? 'border-r border-[#1a472a]/10' : ''}`}
              >
                <p className="text-xl sm:text-2xl font-bold" style={{ color: data.heroColor }}>{stat.value}</p>
                <p className="text-xs text-[#1a472a]/60">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Main Content - 2 column on print/desktop */}
          <div className="px-8 py-6 print:px-10 print:py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
              {data.sections.map((section, i) => (
                <div key={i} className="space-y-2">
                  <h2 
                    className="text-base font-bold flex items-center gap-2"
                    style={{ color: data.heroColor, fontFamily: 'var(--font-display, Quicksand, sans-serif)' }}
                  >
                    <span 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: data.accentColor }}
                    >
                      {i + 1}
                    </span>
                    {section.heading}
                  </h2>
                  <p className="text-sm text-[#1a472a]/80 leading-relaxed print:text-xs print:leading-relaxed">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Benefits */}
          <div className="px-8 py-4 print:px-10 print:py-3 bg-[#f8f5f0] border-t border-[#1a472a]/10">
            <h3 
              className="text-sm font-bold mb-3"
              style={{ color: data.heroColor, fontFamily: 'var(--font-display, Quicksand, sans-serif)' }}
            >
              Key Benefits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 print:grid-cols-2">
              {data.keyBenefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-2 text-sm print:text-xs">
                  <span style={{ color: data.accentColor }} className="mt-0.5 flex-shrink-0">&#10003;</span>
                  <span className="text-[#1a472a]/80">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Footer */}
          <div 
            className="px-8 py-4 print:px-10 print:py-3 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ backgroundColor: data.heroColor }}
          >
            <div className="text-white text-center sm:text-left">
              <p className="font-bold text-sm">Ready to get started?</p>
              <p className="text-xs text-white/70">Visit regencivics.earth or scan the QR code</p>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href={data.cta.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="print:hidden"
              >
                <Button 
                  className="text-sm font-bold gap-2"
                  style={{ backgroundColor: data.accentColor, color: data.heroColor }}
                >
                  {data.cta.label} <ExternalLink className="w-3 h-3" />
                </Button>
              </a>
              <span className="hidden print:block text-white text-xs font-mono">
                regencivics.earth
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-2 print:px-10 print:py-2 bg-[#f0ede8] text-center">
            <p className="text-xs text-[#1a472a]/50">
              Growing the regenerative renaissance: one village, one project, one quest at a time.
            </p>
            <p className="text-xs text-[#1a472a]/40 mt-1">
              regencivics.earth | ReGen Civics Alliance | {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          @page { size: A4; margin: 0; }
          .print\\:hidden { display: none !important; }
          nav, footer, .cookie-consent { display: none !important; }
        }
      `}</style>
    </div>
  );
}
