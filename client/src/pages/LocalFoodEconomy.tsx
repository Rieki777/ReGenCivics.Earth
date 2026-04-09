/**
 * Local Food Economy Page
 * Route: /local-food-economy
 * Design: Dark green theme (#1a472a), direct voice
 * Content: Regenerative food producers, community ratings, producer applications
 */

import { useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Sprout,
  Star,
  MapPin,
  Leaf,
  Droplets,
  Bug,
  Users,
  Heart,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Handshake,
} from "lucide-react";

const RATING_CATEGORIES = [
  {
    name: "Soil Health",
    icon: Sprout,
    description: "Composting, cover cropping, no-till, soil biology management.",
  },
  {
    name: "Biodiversity",
    icon: Leaf,
    description: "Polyculture, habitat corridors, native species, seed saving.",
  },
  {
    name: "Water Stewardship",
    icon: Droplets,
    description: "Rainwater harvesting, watershed care, efficient irrigation.",
  },
  {
    name: "Chemical-Free",
    icon: Bug,
    description: "No synthetic pesticides or fertilizers. Biological pest management.",
  },
  {
    name: "Community Benefit",
    icon: Users,
    description: "Local food access, sliding scale pricing, food donations, education.",
  },
  {
    name: "Worker Wellbeing",
    icon: Heart,
    description: "Fair wages, safe conditions, housing support, profit sharing.",
  },
];

function ProducerCard({
  producer,
}: {
  producer: {
    id: number;
    producer_name: string;
    description?: string;
    regenerative_score?: number;
    bioregion_id?: number;
    website_url?: string;
    local_scale_profile_url?: string;
  };
}) {
  return (
    <Card className="bg-white/5 border-white/10 hover:border-[#7dd87d]/30 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle
            className="text-white text-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {producer.producer_name}
          </CardTitle>
          {producer.regenerative_score != null && (
            <div className="flex items-center gap-1 bg-[#7dd87d]/15 px-2 py-1 rounded-full">
              <Star className="w-3.5 h-3.5 text-[#7dd87d]" />
              <span
                className="text-[#7dd87d] text-sm font-bold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {producer.regenerative_score}/5
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {producer.description && (
          <p
            className="text-white/70 text-sm mb-3 leading-relaxed"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {producer.description}
          </p>
        )}
        {producer.bioregion_id && (
          <div className="flex items-center gap-1.5 text-white/50 text-xs mb-3">
            <MapPin className="w-3 h-3" />
            <span>Bioregion #{producer.bioregion_id}</span>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {producer.website_url && (
            <a
              href={producer.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7dd87d] text-xs flex items-center gap-1 hover:underline"
            >
              Website <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {producer.local_scale_profile_url && (
            <a
              href={producer.local_scale_profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7dd87d] text-xs flex items-center gap-1 hover:underline"
            >
              LocalScale <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LocalFoodEconomy() {
  const [bioregionFilter, setBioregionFilter] = useState<string>("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Form state
  const [producerName, setProducerName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [description, setDescription] = useState("");
  const [productsOffered, setProductsOffered] = useState("");
  const [regenerativePractices, setRegenerativePractices] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [localScaleProfileUrl, setLocalScaleProfileUrl] = useState("");

  const bioregionId = bioregionFilter ? Number(bioregionFilter) : undefined;

  const { data: producers, isLoading } = trpc.localFood.list.useQuery(
    { bioregionId },
    { staleTime: 30_000 }
  );

  const applyMutation = trpc.localFood.submitApplication.useMutation({
    onSuccess: () => {
      setFormSubmitted(true);
      setProducerName("");
      setContactEmail("");
      setContactName("");
      setDescription("");
      setProductsOffered("");
      setRegenerativePractices("");
      setWebsiteUrl("");
      setLocalScaleProfileUrl("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!producerName.trim() || !contactEmail.trim() || !contactName.trim()) return;

    applyMutation.mutate({
      producerName: producerName.trim(),
      contactEmail: contactEmail.trim(),
      contactName: contactName.trim(),
      description: description.trim() || undefined,
      productsOffered: productsOffered.trim() || undefined,
      regenerativePractices: regenerativePractices.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      localScaleProfileUrl: localScaleProfileUrl.trim() || undefined,
    });
  };

  const producerList = (producers as any[]) ?? [];

  return (
    <PageTransition>
      <SEO
        title="Local Food Economy | ReGen Civics"
        description="Find and support regenerative food producers in your bioregion. Community ratings, producer applications, and food sovereignty built from the ground up."
        url="/local-food-economy"
      />

      <div className="min-h-screen" style={{ background: "#1a472a" }}>
        {/* Hero */}
        <section className="relative pt-28 pb-20 px-4 md:px-8 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl"
              style={{ background: "#7dd87d" }}
            />
            <div
              className="absolute bottom-10 right-1/4 w-64 h-64 rounded-full blur-3xl"
              style={{ background: "#7dd87d" }}
            />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <AnimatedSection>
              <h1
                className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Local Food Economy
              </h1>
              <p
                className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Real food, grown by real people, in your bioregion. We are building
                regenerative food systems where producers and communities support
                each other directly.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection>
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-12 text-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                How It Works
              </h2>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-8">
              <AnimatedSection>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#7dd87d]/15 flex items-center justify-center mx-auto mb-4">
                    <Handshake className="w-8 h-8 text-[#7dd87d]" />
                  </div>
                  <h3
                    className="text-xl font-bold text-white mb-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Collaborate with Local Producers
                  </h3>
                  <p
                    className="text-white/85 text-sm leading-relaxed"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Players take their quests to local producer farms. Planting trees,
                    building gardens, healing wholes. Players earn $ReGen tokens for
                    showing up and doing the work, and producers get hands and hearts
                    in their fields. This onboards producers into the system through
                    real shared work.
                  </p>
                </div>
              </AnimatedSection>

              <AnimatedSection>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#7dd87d]/15 flex items-center justify-center mx-auto mb-4">
                    <Sprout className="w-8 h-8 text-[#7dd87d]" />
                  </div>
                  <h3
                    className="text-xl font-bold text-white mb-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Support Regenerative Farms
                  </h3>
                  <p
                    className="text-white/70 text-sm leading-relaxed"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Buy directly from producers who are healing the soil. Exchange functions
                    run through{" "}
                    <a
                      href="https://localscale.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7dd87d] hover:underline"
                    >
                      LocalScale.org
                    </a>
                    , connecting local currencies with regenerative food networks.
                  </p>
                </div>
              </AnimatedSection>

              <AnimatedSection>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#7dd87d]/15 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-[#7dd87d]" />
                  </div>
                  <h3
                    className="text-xl font-bold text-white mb-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Build Food Sovereignty
                  </h3>
                  <p
                    className="text-white/70 text-sm leading-relaxed"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Each bioregion develops its own food economy, governed through
                    Bioregional Financing Facilities (BFFs). Governance decisions happen
                    on{" "}
                    <a
                      href="https://app.hypha.earth"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7dd87d] hover:underline"
                    >
                      Hypha
                    </a>
                    , where your community shapes how the local food system grows.
                  </p>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Food Producers */}
        <section className="py-16 md:py-24 px-4 md:px-8 bg-white/[0.02]">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection>
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4 text-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Food Producers
              </h2>
              <p
                className="text-white/70 text-center mb-8 max-w-xl mx-auto"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Regenerative farms and food producers approved by the community.
              </p>
            </AnimatedSection>

            {/* Filter */}
            <div className="flex justify-center mb-8">
              <select
                value={bioregionFilter}
                onChange={(e) => setBioregionFilter(e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#7dd87d]/50"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <option value="">All bioregions</option>
                <option value="1">Bioregion 1</option>
                <option value="2">Bioregion 2</option>
                <option value="3">Bioregion 3</option>
              </select>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#7dd87d] animate-spin" />
              </div>
            ) : producerList.length === 0 ? (
              <div className="text-center py-12">
                <Sprout className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <p
                  className="text-white/50 text-lg"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  No producers listed yet. Be the first to apply below.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {producerList.map((producer: any) => (
                  <ProducerCard key={producer.id} producer={producer} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Apply as a Producer */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-2xl mx-auto">
            <AnimatedSection>
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4 text-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Apply as a Producer
              </h2>
              <p
                className="text-white/70 text-center mb-8"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Growing food regeneratively? Tell us about your operation. We review
                every application and connect approved producers with the local food network.
              </p>
            </AnimatedSection>

            {formSubmitted ? (
              <AnimatedSection>
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-[#7dd87d]/20">
                  <CheckCircle2 className="w-12 h-12 text-[#7dd87d] mx-auto mb-4" />
                  <h3
                    className="text-xl font-bold text-white mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Application Received
                  </h3>
                  <p
                    className="text-white/70"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    We will review your submission and be in touch.
                  </p>
                  <Button
                    onClick={() => setFormSubmitted(false)}
                    className="mt-6 bg-[#7dd87d]/15 text-[#7dd87d] border border-[#7dd87d]/30 hover:bg-[#7dd87d]/25"
                  >
                    Submit Another
                  </Button>
                </div>
              </AnimatedSection>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-white/80 text-sm mb-1.5"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Producer Name *
                    </label>
                    <Input
                      value={producerName}
                      onChange={(e) => setProducerName(e.target.value)}
                      placeholder="e.g. Sunnyside Regenerative Farm"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/55 focus:border-[#7dd87d]/50"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-white/80 text-sm mb-1.5"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Contact Name *
                    </label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/55 focus:border-[#7dd87d]/50"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-white/80 text-sm mb-1.5"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Contact Email *
                  </label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/55 focus:border-[#7dd87d]/50"
                  />
                </div>

                <div>
                  <label
                    className="block text-white/80 text-sm mb-1.5"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us about your farm or food operation. What do you grow? How long have you been at it?"
                    rows={3}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/55 focus:border-[#7dd87d]/50"
                  />
                </div>

                <div>
                  <label
                    className="block text-white/80 text-sm mb-1.5"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Products Offered
                  </label>
                  <Textarea
                    value={productsOffered}
                    onChange={(e) => setProductsOffered(e.target.value)}
                    placeholder="e.g. Vegetables, fruit, eggs, honey, ferments, herbs"
                    rows={2}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/55 focus:border-[#7dd87d]/50"
                  />
                </div>

                <div>
                  <label
                    className="block text-white/80 text-sm mb-1.5"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Regenerative Practices
                  </label>
                  <Textarea
                    value={regenerativePractices}
                    onChange={(e) => setRegenerativePractices(e.target.value)}
                    placeholder="What regenerative methods do you use? Composting, cover crops, rotational grazing, agroforestry, etc."
                    rows={3}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/55 focus:border-[#7dd87d]/50"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-white/80 text-sm mb-1.5"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Website URL
                    </label>
                    <Input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourfarm.com"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/55 focus:border-[#7dd87d]/50"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-white/80 text-sm mb-1.5"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      LocalScale Profile URL
                    </label>
                    <Input
                      type="url"
                      value={localScaleProfileUrl}
                      onChange={(e) => setLocalScaleProfileUrl(e.target.value)}
                      placeholder="https://localscale.org/your-profile"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/55 focus:border-[#7dd87d]/50"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={applyMutation.isPending}
                    className="w-full bg-[#7dd87d] text-[#1a472a] font-bold hover:bg-[#6cc86c] disabled:opacity-50"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {applyMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>

                  {applyMutation.isError && (
                    <p className="text-red-400 text-sm mt-2 text-center">
                      Something went wrong. Please try again.
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>

        {/* How Ratings Work */}
        <section className="py-16 md:py-24 px-4 md:px-8 bg-white/[0.02]">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection>
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4 text-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                How Ratings Work
              </h2>
              <p
                className="text-white/70 text-center mb-12 max-w-xl mx-auto"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Community members at the Co-Creator tier and above can rate producers
                across six categories. Each rating reflects direct experience with the
                producer and their practices.
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {RATING_CATEGORIES.map((cat) => (
                <AnimatedSection key={cat.name}>
                  <div className="bg-white/5 rounded-xl border border-white/10 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#7dd87d]/15 flex items-center justify-center">
                        <cat.icon className="w-5 h-5 text-[#7dd87d]" />
                      </div>
                      <h3
                        className="text-white font-bold"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {cat.name}
                      </h3>
                    </div>
                    <p
                      className="text-white/60 text-sm leading-relaxed"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {cat.description}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </div>

            <AnimatedSection>
              <p
                className="text-white/50 text-sm text-center mt-8"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Co-Creator+ tier is required to submit ratings. This keeps the rating
                system grounded in people who are active participants in the community.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <AnimatedSection>
              <h2
                className="text-2xl md:text-3xl font-bold text-white mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The Bigger Picture
              </h2>
              <p
                className="text-white/70 mb-8 leading-relaxed"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Local food is one piece of the regenerative economy. Contribution scoring,
                gratitude tokens, seasonal harvests, and open governance all connect back
                to the food systems that feed your bioregion.
              </p>
              <Link href="/economy">
                <Button className="bg-[#7dd87d] text-[#1a472a] font-bold hover:bg-[#6cc86c] px-8 py-3">
                  See the Full Economy
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </AnimatedSection>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
