/**
 * Seasons Page
 * Design: Fantasy forest theme with 13 standing stones representing weeks
 * Colors: Spring greens, golden highlights, soft earth tones
 */

import { useState } from 'react';
import { Link } from 'wouter';
import { SeasonalRhythmSection } from '@/components/SeasonalRhythmSection';
import { 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  Target, 
  Sprout,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle,
  Sparkles,
  TreeDeciduous,
  Home as HomeIcon,
  Compass,
  MapPin,
  Heart,
  Leaf,
  Building,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AnimatedSection } from '@/components/AnimatedSection';
import { SEO, pageSEO } from '@/components/SEO';
import { BackButton } from "@/components/BackButton";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { cdnImg } from "@/lib/utils";


const weeklyTopics = [
  { week: 1, title: "Selection Day", description: "First steps of the ReGen Civics Incubator. Meet the selected projects, set intentions, and begin mapping your regenerative vision together." },
  { week: 2, title: "Incubator Overview", description: "Starting Season 2! Deep dive into the incubator structure, expectations, and how we'll journey together over the next 13 weeks." },
  { week: 3, title: "Game & Organisation Co-Creation Part 1", description: "Designing the structure of our projects. Introduction to decentralized autonomous organizations and how to structure your community." },
  { week: 4, title: "Game & Organisation Co-Creation Part 2", description: "Continuing to design the structure of our projects. Practical implementation of governance frameworks and community design." },
  { week: 5, title: "Game Guides & Economic Systems", description: "Co-creating project 'Game Guides' and kickstarting our economic systems. How to document your project's unique plays and patterns." },
  { week: 6, title: "Explore the ReGen Civics Ecosystem", description: "Introduction to the ReGen Civics DHO and the first steps in setting up yours. How our alliance operates and how you can participate." },
  { week: 7, title: "Ecosystem Map & Policies", description: "Evolving our culture through ecosystem mapping and policy design. How we co-create the rules of our regenerative game." },
  { week: 8, title: "Tokenomics Part 1", description: "The art and science of our token-assisted land-based economies. Understanding how tokens can support regenerative projects." },
  { week: 9, title: "Tokenomics Part 2", description: "Continuing the art and theory of our token-assisted land-based economies. Practical token design for your project." },
  { week: 10, title: "Legal Structures Part 1", description: "Exploring the expansive world of legal structures. How do our projects relate to nation states and existing legal frameworks?" },
  { week: 11, title: "Legal Structures Part 2", description: "Continuing to explore legal structures. Practical considerations for land ownership, community agreements, and compliance." },
  { week: 12, title: "Coordination & Minimum Viable Economies", description: "Meeting our needs through coordination structures. How do we create minimum viable regenerative economies? How do we thrive?" },
  { week: 13, title: "Crowd Pooling & Resourcing Our Projects", description: "A complete overview of the ReGen Civics Incubator journey. Project stewards share updates on their progress, celebrate achievements, and explore crowd pooling for resources." }
];

export default function Seasons() {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [whoWeAreLookingForOpen, setWhoWeAreLookingForOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a]">
      <BackButton />
      <SEO {...pageSEO.seasons} />
      
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={cdnImg("https://assets.regencivics.earth/dLRruVvEitjLUEgU.jpg")}
            alt="Seasons"
            className="w-full h-full object-cover"
            width="1920"
            height="1080"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a472a]/60 via-[#1a472a]/40 to-[#1a472a]" />
        </div>
        
        <AnimatedSection animation="fade-in" className="relative z-10 container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-[#7dd87d]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#7dd87d]/30">
            <Sprout className="w-5 h-5 text-[#7dd87d]" />
            <span className="text-white font-medium">Season 2 Starting September 2026</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="text-[#7dd87d]">"Spring"</span> Season
          </h1>
          
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-8 safe-prose">
            13 weeks of transformation, learning, and growth to take your regenerative land project from a few core team members to a thriving village and minimum viable economy.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/schedule">
              <Button size="lg" className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] rounded-xl">
                <Calendar className="mr-2 w-5 h-5" />
                View Schedule & RSVP
              </Button>
            </Link>
            <Link href="/apply">
              <Button 
                size="lg" 
                className="relative bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-600 text-[#1a472a] font-bold rounded-xl shadow-lg shadow-amber-400/50 hover:shadow-amber-500/60 hover:scale-105 transition-all duration-300 px-8 py-6 text-lg border-2 border-amber-300"
              >
                <span className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-xl blur opacity-30 animate-pulse"></span>
                <span className="relative flex items-center gap-2">
                  🌱 Apply for Season 2
                  <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* Who We're Looking For - Collapsible */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Collapsible open={whoWeAreLookingForOpen} onOpenChange={setWhoWeAreLookingForOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a9f4a]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/30 hover:border-[#7dd87d]/50 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#7dd87d]/30 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#7dd87d]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-white">Who We're Looking For</h3>
                      <p className="text-white/60 text-sm">Click to learn about ideal candidates for Season 2</p>
                    </div>
                  </div>
                  {whoWeAreLookingForOpen ? (
                    <ChevronUp className="w-6 h-6 text-[#7dd87d]" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-white/50" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="mt-4 bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-[#7dd87d]/20">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Land Projects */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[#7dd87d]/20 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-[#7dd87d]" />
                      </div>
                      <h4 className="text-lg font-bold text-white">Land Projects</h4>
                    </div>
                    <p className="text-white/70 mb-4">
                      Regenerative land projects minimum requirements:
                    </p>
                    <ul className="space-y-2 text-white/60 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                        <span>Land stewardship commitment (owned, leased, or in acquisition)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                        <span>Core team of 3+ committed members</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                        <span>Clear regenerative vision and values alignment</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                        <span>Capacity to participate fully in 13-week program</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                        <span>Willingness to share learnings with the network</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Alliance Partners */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[#7dd87d]/20 rounded-full flex items-center justify-center">
                        <Building className="w-5 h-5 text-[#7dd87d]" />
                      </div>
                      <h4 className="text-lg font-bold text-white">Alliance Partners</h4>
                    </div>
                    <p className="text-white/70 mb-4">
                      Organizations that support land projects and want to join a powerful ecosystem of change-makers.
                    </p>
                    <ul className="space-y-2 text-white/60 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                        <span>Construction, housing, energy, infrastructure providers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                        <span>Organizational, economic, ecological design wisdom</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                        <span>Legal, governance, or technology expertise</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                        <span>Funding, investment, or financial services</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                        <span>Any support for regenerative land projects</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {/* What You Get */}
                <div className="mt-8 pt-8 border-t border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4 text-center">What You'll Receive</h4>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                      <Heart className="w-6 h-6 text-[#7dd87d] mx-auto mb-2" />
                      <p className="text-white/70 text-sm">Mentorship & peer support from experienced projects</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                      <Leaf className="w-6 h-6 text-[#7dd87d] mx-auto mb-2" />
                      <p className="text-white/70 text-sm">Governance & economic tools for your community</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                      <Users className="w-6 h-6 text-[#7dd87d] mx-auto mb-2" />
                      <p className="text-white/70 text-sm">Network of allied projects & organizations</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                      <Target className="w-6 h-6 text-[#7dd87d] mx-auto mb-2" />
                      <p className="text-white/70 text-sm">Path to funding & investment opportunities</p>
                    </div>
                  </div>
                </div>
                
                {/* Apply CTA */}
                <div className="mt-8 text-center">
                  <Link href="/apply">
                    <Button size="lg" className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] rounded-xl">
                      🌱 Apply for Season 2 Now
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      {/* Season Structure */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              The Incubator <span className="text-[#7dd87d]">Structure</span>
            </h2>
            <p className="text-lg text-white/70 max-w-3xl mx-auto safe-prose">
              Each week is designed to bring you down the path of being ready to create and/or expand your Game into a thriving village and "minimum viable economy" designed to meet all your community needs.
            </p>
          </div>

          {/* Key Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 text-center">
              <div className="w-16 h-16 bg-[#7dd87d]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-[#7dd87d]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">2 Hour Sessions</h3>
              <p className="text-white/60">Weekly live sessions with examples, tools, lessons, practical how-to's, and Q&A dialogue.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 text-center">
              <div className="w-16 h-16 bg-[#7dd87d]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-[#7dd87d]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Weekly Deliverables</h3>
              <p className="text-white/60">Practical assignments due during the week to apply learnings directly to your project.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 text-center">
              <div className="w-16 h-16 bg-[#7dd87d]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#7dd87d]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Peer Learning</h3>
              <p className="text-white/60">Connect with fellow land projects, share experiences, and build lasting alliances.</p>
            </div>
          </div>

          {/* Session Format */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-[#7dd87d]/20 mb-16">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Each Session Format</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">📚</div>
                <h4 className="font-bold text-[#7dd87d] mb-2">Examples & Lessons</h4>
                <p className="text-white/60 text-sm">Real-world case studies, tools, and frameworks from successful regenerative projects.</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🛠️</div>
                <h4 className="font-bold text-[#7dd87d] mb-2">Practical How-To's</h4>
                <p className="text-white/60 text-sm">Step-by-step guidance on implementing concepts in your specific context.</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">💬</div>
                <h4 className="font-bold text-[#7dd87d] mb-2">Questions & Dialogue</h4>
                <p className="text-white/60 text-sm">Interactive Q&A and peer discussion to deepen understanding and solve challenges.</p>
              </div>
            </div>
          </div>

          {/* 13 Weeks Curriculum - Collapsible Dropdown */}
          <div className="mb-16">
            <Collapsible 
              open={expandedWeek !== null || expandedWeek === 0}
              onOpenChange={(open) => setExpandedWeek(open ? 1 : null)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-6 cursor-pointer hover:bg-white/15 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#7dd87d]/20 rounded-full flex items-center justify-center">
                        <Calendar className="w-7 h-7 text-[#7dd87d]" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-2xl font-bold text-white">
                          <span className="text-[#7dd87d]">13 Weeks</span> of Transformation
                        </h3>
                        <p className="text-white/60">Click to view the full curriculum schedule</p>
                      </div>
                    </div>
                    <ChevronDown className="w-6 h-6 text-[#7dd87d]" />
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-4">
                <div className="space-y-3">
                  {weeklyTopics.map((topic) => (
                    <div 
                      key={topic.week}
                      className="bg-white/5 backdrop-blur-sm rounded-xl border border-[#7dd87d]/20 overflow-hidden transition-all duration-300 hover:border-[#7dd87d]/40"
                    >
                      <button
                        onClick={() => setExpandedWeek(expandedWeek === topic.week ? -1 : topic.week)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#7dd87d]/20 rounded-full flex items-center justify-center text-[#7dd87d] font-bold">
                            {topic.week}
                          </div>
                          <h4 className="text-lg font-semibold text-white">{topic.title}</h4>
                        </div>
                        {expandedWeek === topic.week ? (
                          <ChevronUp className="w-5 h-5 text-[#7dd87d]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-white/50" />
                        )}
                      </button>
                      
                      {expandedWeek === topic.week && (
                        <div className="px-4 pb-4 pt-0">
                          <div className="pl-14">
                            <p className="text-white/70 mb-3">{topic.description}</p>
                            <div className="flex items-center gap-2 text-sm text-white/50">
                              <Clock className="w-4 h-4" />
                              <span>2 hours</span>
                              <span className="mx-2">•</span>
                              <span>Date TBD (selected during Open Access Session)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Link to full schedule */}
                <div className="mt-6 text-center">
                  <Link href="/schedule">
                    <Button variant="outline" className="border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10">
                      <Calendar className="mr-2 w-4 h-4" />
                      View Full Schedule & RSVP
                    </Button>
                  </Link>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </section>

      {/* Selection Process */}
      <section className="py-20 px-4 bg-[#0d2818]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              Selection <span className="text-[#7dd87d]">Process</span>
            </h2>
            <p className="text-lg text-white/70">
              How the 13 projects are chosen for each Season
            </p>
          </div>

          {/* Free Participation Banner */}
          <div className="mb-8 bg-[#7dd87d]/15 border border-[#7dd87d]/40 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-[#7dd87d]/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-[#7dd87d]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#7dd87d] mb-1">Currently Free to Apply and Participate</h3>
              <p className="text-white/70 text-sm leading-relaxed safe-prose">
                Applying and participating in the Season is currently free for selected projects. As the program grows and matures, we intend to introduce application and participation fees to sustain the ecosystem. For now, if you are chosen, your commitment and full participation is your contribution.
              </p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-[#7dd87d]/20">
            <div className="flex items-start gap-6 mb-8">
              <div className="w-16 h-16 bg-[#7dd87d]/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Compass className="w-8 h-8 text-[#7dd87d]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-3">Community-Led Selection</h3>
                <p className="text-white/70">
                  The 13 projects for each season are selected by representatives of previous season's allies and land projects.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Peer Review</h4>
                  <p className="text-white/60 text-sm">Previous participants evaluate applications based on real-world experience.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Quality Standards</h4>
                  <p className="text-white/60 text-sm">Ensure only high-potential projects are selected to provide the best case studies for our movement.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Diversity Focus</h4>
                  <p className="text-white/60 text-sm">Global geographic and project-type diversity strengthens the cohort. From just starting to mature, from 1 acre to 50,000, from any country.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Readiness Assessment</h4>
                  <p className="text-white/60 text-sm">Projects must demonstrate commitment and capacity to participate fully.</p>
                </div>
              </div>
            </div>

            {/* Case-Study Priority Callout */}
            <div className="mt-8 pt-8 border-t border-[#7dd87d]/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Star className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-400 mb-2">Priority Given to Projects That Support More Projects</h4>
                  <p className="text-white/70 text-sm leading-relaxed safe-prose">
                    We give priority to land projects that are actively working toward becoming a case-study and incubator themselves. This means projects that are tracking and mapping their process, developing a unique "play" (a replicable protocol others can learn from), and intending to host teams who come to learn and implement those protocols on their own land. Our deepest priority is to support the projects that want to support more projects.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              What You'll <span className="text-[#7dd87d]">Achieve</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-[#7dd87d]/20 to-transparent rounded-2xl p-6 border border-[#7dd87d]/30">
              <TreeDeciduous className="w-10 h-10 text-[#7dd87d] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Thriving Village</h3>
              <p className="text-white/60 text-sm">Expand from a few core members to a thriving, self-sustaining community.</p>
            </div>
            
            <div className="bg-gradient-to-br from-[#7dd87d]/20 to-transparent rounded-2xl p-6 border border-[#7dd87d]/30">
              <Target className="w-10 h-10 text-[#7dd87d] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Minimum Viable Economy</h3>
              <p className="text-white/60 text-sm">Build economic systems designed to meet all community needs.</p>
            </div>
            
            <div className="bg-gradient-to-br from-[#7dd87d]/20 to-transparent rounded-2xl p-6 border border-[#7dd87d]/30">
              <Users className="w-10 h-10 text-[#7dd87d] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Alliance Network</h3>
              <p className="text-white/60 text-sm">Join a supportive network of aligned projects and organizations.</p>
            </div>
            
            <div className="bg-gradient-to-br from-[#7dd87d]/20 to-transparent rounded-2xl p-6 border border-[#7dd87d]/30">
              <Sparkles className="w-10 h-10 text-[#7dd87d] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Resilient Future</h3>
              <p className="text-white/60 text-sm">Create a thriving and resilient foundation for generations to come.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Season Roadmap */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#1a472a] to-[#0d2818]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              The <span className="text-[#7dd87d]">Roadmap</span>
            </h2>
            <p className="text-lg text-white/70 max-w-3xl mx-auto">
              Our journey unfolds across seasons, each building on the last to create a thriving ecosystem.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Season 2 - Upcoming */}
            <div className="bg-gradient-to-br from-[#7dd87d]/20 to-transparent rounded-2xl p-8 border-2 border-[#7dd87d]/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#7dd87d] rounded-full flex items-center justify-center">
                  <Sprout className="w-6 h-6 text-[#1a472a]" />
                </div>
                <div>
                  <span className="text-[#7dd87d] text-sm font-semibold">Accepting Applications</span>
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>Season 2 - September 2026</h3>
                </div>
              </div>
              <p className="text-white/80 mb-4 safe-prose">
                <strong className="text-[#7dd87d]">Building the Portfolio:</strong> Season 2 focuses on onboarding quality regenerative land projects into our portfolio, conducting token swaps with founding alliance and land projects, creating the initial governance systems for the fund, and expanding the portfolio pipeline.
              </p>
              <ul className="space-y-2 text-white/70 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                  <span>Onboard initial portfolio projects onto Base (Coinbase's blockchain)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                  <span>Conduct token swaps with founding alliance and land projects</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                  <span>Build governance and operational infrastructure</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                  <span>Develop alliance partnerships</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                  <span>Expand portfolio pipeline with quality "Plays" and "Games"</span>
                </li>
              </ul>
            </div>

            {/* Season 3 - Future */}
            <div className="bg-gradient-to-br from-amber-500/20 to-transparent rounded-2xl p-8 border-2 border-amber-500/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-amber-400 text-sm font-semibold">Future</span>
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>Season 3</h3>
                </div>
              </div>
              <p className="text-white/80 mb-4 safe-prose">
                <strong className="text-amber-400">Fund Activation:</strong> Season 3 will focus on getting our fund ready to send and receive capital for land project investments.
              </p>
              <ul className="space-y-2 text-white/70 text-sm">
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>Complete legal and compliance audit</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>Activate fund to receive and deploy capital</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>Begin investments into portfolio land projects</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>Scale alliance network and support services</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-amber-500/20 rounded-xl border border-amber-500/30">
                <p className="text-amber-200 text-sm">
                  <strong>Capital Commitments:</strong> We are currently taking commitments for capital. Initial operations funding capped at $300k until full fund activation.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-white/60 text-sm">
              Before we will make investments into land projects, we'll onboard the initial portfolio projects onto Base (Coinbase's blockchain)  and the network governance and Council established to effectively steward the funds we receive.
            </p>
          </div>
        </div>
      </section>

      {/* The Rhythm of the Infinite Game */}
      <SeasonalRhythmSection />

      {/* The Project Growth Cycle (renamed from Regenerative Journey) */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#0d2818] to-[#1a472a]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white" style={{ fontFamily: 'var(--font-display)' }}>
              The Project{" "}
              <span className="text-[#7dd87d]">Growth Cycle</span>
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Land projects move through these phases at their own pace, from first formation to thriving abundance
            </p>
          </div>

          {/* Seasons Image */}
          <div className="max-w-4xl mx-auto mb-8">
            <img
              src={cdnImg("https://assets.regencivics.earth/YSvQAoALDuGiALPV.jpg")}
              alt="Seasonal journey from assessment to abundance"
              loading="lazy"
              width="1200"
              height="800"
              className="w-full rounded-2xl border-4 border-[#7dd87d]/30 shadow-xl"
            />
          </div>

          {/* Season Details Grid */}
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {/* Winter - Assessment */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border-2 border-[#8b7355]/40 overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#8b7355] flex items-center justify-center">
                    <Compass className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg" style={{ fontFamily: 'var(--font-display)' }}>Assessment</h3>
                    <p className="text-xs text-white/60">(Winter Season)</p>
                  </div>
                </div>
                <p className="text-sm text-[#7dd87d] font-medium px-2 py-1 bg-[#7dd87d]/10 rounded inline-block mb-2">Wisdom Work, Preparations and Administration</p>
                <p className="text-white/70 text-base leading-relaxed">Land projects are securing the Land, forming core teams, and setting intentions. ReGen Civics is improving Game Models, conducting administrative tasks and preparing for Spring.</p>
              </div>
            </div>

            {/* Spring - Planting */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border-2 border-[#7dd87d]/40 overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
                    <Sprout className="w-5 h-5 text-[#1a472a]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg" style={{ fontFamily: 'var(--font-display)' }}>Planting</h3>
                    <p className="text-xs text-white/60">(Spring Season)</p>
                  </div>
                </div>
                <p className="text-sm text-[#7dd87d] font-medium px-2 py-1 bg-[#7dd87d]/10 rounded inline-block mb-2">Co-Creating Our Games, Together</p>
                <p className="text-white/70 text-base leading-relaxed">Each Spring Season we take a cohort of 13 land projects through an open-source journey, building all the foundations you need to accept capital from other people!</p>
              </div>
            </div>

            {/* Summer - Growth */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border-2 border-[#4a7c59]/40 overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#4a7c59] flex items-center justify-center">
                    <TreeDeciduous className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg" style={{ fontFamily: 'var(--font-display)' }}>Growth</h3>
                    <p className="text-xs text-white/60">(Summer Season)</p>
                  </div>
                </div>
                <p className="text-sm text-[#7dd87d] font-medium px-2 py-1 bg-[#7dd87d]/10 rounded inline-block mb-2">Evolving and Building our Projects</p>
                <p className="text-white/70 text-base leading-relaxed">Summer comes after a successful spring when you're funded and the real work of building begins. Our Alliance Partners help establish physical foundations.</p>
              </div>
            </div>

            {/* Autumn - Abundance */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border-2 border-[#7dd87d]/40 overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
                    <Heart className="w-5 h-5 text-[#1a472a]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg" style={{ fontFamily: 'var(--font-display)' }}>Abundance</h3>
                    <p className="text-xs text-white/60">(Autumn Season)</p>
                  </div>
                </div>
                <p className="text-sm text-[#7dd87d] font-medium px-2 py-1 bg-[#7dd87d]/10 rounded inline-block mb-2">Enjoying our Abundance</p>
                <p className="text-white/70 text-base leading-relaxed">Autumn is when we rest, celebrate, enjoy, love, reflect and nourish ourselves as we prepare for another year growing the ReGenerative Renaissance.</p>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-white/50 italic mt-6">
            These phases describe a project's growth, not the community's seasonal rhythm above. Projects who have completed their own "Assessment" phase are invited to apply for the Spring Season Incubator.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#1a472a] to-[#0d2818]">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Ready to Begin Your <span className="text-[#7dd87d]">Journey</span>?
          </h2>
          <p className="text-lg text-white/70 mb-8 safe-prose">
            Season 2 starts September 2026. Join us for an open access session to learn more, or apply now to be considered for the next cohort.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/schedule">
              <Button size="lg" className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] rounded-xl">
                <Calendar className="mr-2 w-5 h-5" />
                RSVP for Open Session
              </Button>
            </Link>
            <Link href="/apply">
              <Button 
                size="lg" 
                className="relative bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-600 text-[#1a472a] font-bold rounded-xl shadow-lg shadow-amber-400/50 hover:shadow-amber-500/60 hover:scale-105 transition-all duration-300 px-8 py-6 text-lg border-2 border-amber-300"
              >
                <span className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-xl blur opacity-30 animate-pulse"></span>
                <span className="relative flex items-center gap-2">
                  🌱 Apply for Season 2
                  <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Season Timeline */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent to-[#0d2818]/50">
        <div className="container mx-auto max-w-4xl">
          <AnimatedSection animation="slide-up">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-[#d4a574]/20 px-4 py-2 rounded-full mb-4 border border-[#d4a574]/30">
                <Star className="w-4 h-4 text-[#d4a574]" />
                <span className="text-[#d4a574] font-medium text-sm">The Journey So Far</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Season <span className="text-[#7dd87d]">Timeline</span>
              </h2>
              <p className="text-white/60 mt-3 max-w-xl mx-auto">From the first cohort to a growing global network of regenerative land projects.</p>
            </div>
          </AnimatedSection>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#7dd87d]/40 via-[#d4a574]/40 to-[#7dd87d]/10 -translate-x-px hidden sm:block" />

            {[
              {
                season: "Season 1",
                period: "Spring Season · 2021",
                status: "complete" as const,
                color: "#7dd87d",
                outcomes: [
                  "First cohort of 13 land projects incubated",
                  "Regenerative Infinite Games framework built and evolved",
                  "13-week curriculum developed & refined",
                  "Alliance network foundations established",
                  "Crowd pooling platform conceived",
                ],
                side: "left",
              },
              {
                season: "Building Phase",
                period: "2021-2026",
                status: "complete" as const,
                color: "#d4a574",
                outcomes: [
                  "Expanded network with international projects",
                  "DAO governance structures implemented and refined",
                  "Tokenomics framework designed",
                  "Fund structure finalized and investor outreach begun",
                  "Quests, Games, CrowdPooling structures built out",
                  "Admin panel for coordinating projects and applications built",
                  "Tooling for the Fund and Games built, tested, and refined",
                  "Legal and regulatory exploration to design the Fund",
                ],
                side: "right",
              },
              {
                season: "Season 2",
                period: "Spring Season - September 2026",
                status: "active" as const,
                color: "#ffd700",
                outcomes: [
                  "Upcoming cohort opens September Equinox",
                  "Live investor due diligence for fund launch",
                  "ReGen Games and custom land games rollout",
                  "Fund governance and $RCivics token live",
                  "ReGen Game Governance and $ReGen token live",
                  "Accepting LOIs for the Fund",
                  "Built out a 'ReGen Game' template for land projects",
                ],
                side: "left",
              },
              {
                season: "Season 3+",
                period: "2027 and Beyond",
                status: "future" as const,
                color: "#a0aec0",
                outcomes: [
                  "Fund reaches $20M+ threshold & goes live",
                  "Quarterly distributions begin (Year 3)",
                  "Network expands to 30+ projects globally",
                  "Bioregional hubs established on 4+ continents",
                  "Regenerative economy networking across our Earth",
                ],
                side: "right",
              },
            ].map((item, idx) => (
              <AnimatedSection key={item.season} animation="slide-up" delay={idx * 100}>
                <div className={`relative flex items-start gap-6 mb-10 sm:mb-12 ${
                  item.side === "right" ? "sm:flex-row-reverse sm:text-right" : ""
                }`}>
                  {/* Node */}
                  <div className="relative z-10 shrink-0">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-lg ${
                        item.status === "complete"
                          ? "bg-[#1a472a]"
                          : item.status === "active"
                          ? "bg-[#1a472a] animate-pulse"
                          : "bg-[#0d2818]"
                      }`}
                      style={{ borderColor: item.color }}
                    >
                      {item.status === "complete" ? (
                        <CheckCircle className="w-7 h-7" style={{ color: item.color }} />
                      ) : item.status === "active" ? (
                        <Sprout className="w-7 h-7" style={{ color: item.color }} />
                      ) : (
                        <Sparkles className="w-6 h-6" style={{ color: item.color, opacity: 0.5 }} />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 min-w-0 glass-panel rounded-2xl p-5 ${item.side === "right" ? "sm:mr-6" : "sm:ml-6"}`}>
                    <div className={`flex items-center gap-3 mb-3 flex-wrap ${item.side === "right" ? "sm:justify-end" : ""}`}>
                      <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                        {item.season}
                      </h3>
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          backgroundColor: `${item.color}20`,
                          color: item.color,
                          border: `1px solid ${item.color}40`,
                        }}
                      >
                        {item.status === "complete" ? "Complete" : item.status === "active" ? "Opening Now" : "Coming Soon"}
                      </span>
                      <span className="text-white/60 text-sm ml-auto">{item.period}</span>
                    </div>
                    <ul className={`space-y-1.5 ${item.side === "right" ? "sm:text-right" : ""}`}>
                      {item.outcomes.map((o) => (
                        <li key={o} className="flex items-start gap-2 text-white/70 text-sm">
                          {item.side !== "right" && <span style={{ color: item.color }} className="mt-0.5 shrink-0">›</span>}
                          <span>{o}</span>
                          {item.side === "right" && <span style={{ color: item.color }} className="mt-0.5 shrink-0 sm:hidden">‹</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Related Content */}
      <RelatedContent pages={relatedContentMap.seasons.pages} blog={relatedContentMap.seasons.blog} />
    </div>
  );
}
