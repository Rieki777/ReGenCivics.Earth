/**
 * Public Project Showcase Page
 * Displays approved land projects and alliance organizations
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { useState } from "react";
import {
  MapPin,
  Users,
  Leaf,
  Building2,
  Globe,
  ArrowRight,
  Search,
  Filter,
  TreePine,
  Home,
  Factory,
  ExternalLink,
  Sprout,
  Network,
  Heart
} from "lucide-react";
import { SEO, pageSEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { trpc } from "@/lib/trpc";
import { cdnImg } from "@/lib/utils";

// Land projects data from the opportunity page
const landProjects = [
  {
    id: "la_tierra",
    name: "La Tierra",
    location: "Costa Rica",
    size: "50 hectares",
    community: "25 members",
    focus: ["Permaculture", "Education", "Eco-tourism"],
    status: "active",
    description: "A regenerative community focused on permaculture education and sustainable living in the heart of Costa Rica's rainforest.",
    mixedUse: ["residential", "commercial"],
    image: cdnImg("https://assets.regencivics.earth/wwnJXOsxkrlwtDre.jpg")
  },
  {
    id: "starseed",
    name: "StarSeed Village",
    location: "Guatemala",
    size: "35 hectares",
    community: "40 members",
    focus: ["Spiritual Growth", "Organic Farming", "Wellness"],
    status: "active",
    description: "A holistic community blending ancient wisdom with modern sustainability practices on the shores of Lake Atitlan.",
    mixedUse: ["residential"],
    image: cdnImg("https://assets.regencivics.earth/qDMEazGCLoNCuxiS.jpg")
  },
  {
    id: "nyx",
    name: "The Nyx",
    location: "Bali, Indonesia",
    size: "20 hectares",
    community: "30 members",
    focus: ["Regenerative Agriculture", "Arts", "Technology"],
    status: "active",
    description: "A creative hub merging technology innovation with traditional Balinese agriculture and artistic expression.",
    mixedUse: ["residential", "commercial"],
    image: cdnImg("https://assets.regencivics.earth/FuQmXVqMDIJIpIbl.jpg")
  },
  {
    id: "neighbourgood",
    name: "Our NeighbourGood",
    location: "New Zealand",
    size: "100 hectares",
    community: "50 members",
    focus: ["Food Forest", "Community Living", "Education"],
    status: "active",
    description: "New Zealand's largest food forest community, pioneering regenerative land management and community governance.",
    mixedUse: ["residential", "commercial", "industrial"],
    image: cdnImg("https://assets.regencivics.earth/kEKLQJFyCBJjUEXT.jpg")
  },
  {
    id: "highland_lake",
    name: "Highland Lake CampUS",
    location: "NC, USA",
    size: "200 hectares",
    community: "35 members",
    focus: ["Education", "Retreat Center", "Conservation"],
    status: "active",
    description: "A learning campus in the Blue Ridge Mountains offering programs in regenerative design and community building.",
    mixedUse: ["residential", "commercial"],
    image: cdnImg("https://assets.regencivics.earth/HLPCggmitjgcNLWL.jpg")
  },
  {
    id: "liminal",
    name: "Liminal Village",
    location: "Italy",
    size: "45 hectares",
    community: "20 members",
    focus: ["Art", "Permaculture", "Cultural Exchange"],
    status: "active",
    description: "An artistic community in the Italian countryside exploring the intersection of creativity and sustainable living.",
    mixedUse: ["residential", "commercial"],
    image: cdnImg("https://assets.regencivics.earth/RBFOBfivFZGRBilm.jpg")
  },
  {
    id: "tdf",
    name: "Traditional Dream Factory",
    location: "Portugal",
    size: "80 hectares",
    community: "60 members",
    focus: ["Regenerative Business", "Co-living", "Innovation"],
    status: "active",
    description: "Portugal's pioneering regenerative village combining traditional crafts with modern entrepreneurship.",
    mixedUse: ["residential", "commercial", "industrial"],
    image: cdnImg("https://assets.regencivics.earth/euecgkvMVMKpIduW.jpg")
  },
];

// Alliance organizations data
const allianceOrganizations = [
  {
    id: "hypha",
    name: "Hypha DAO",
    type: "Technology",
    description: "Decentralized autonomous organization building tools for regenerative communities and purpose-driven organizations.",
    website: "https://hypha.earth",
    focus: ["DAO Tools", "Governance", "Web3"]
  },
  {
    id: "seeds",
    name: "SEEDS",
    type: "Currency",
    description: "A regenerative economic system and digital currency designed to incentivize and reward regenerative actions.",
    website: "https://joinseeds.earth",
    focus: ["Regenerative Finance", "Currency", "Incentives"]
  },
  {
    id: "nestr",
    name: "Nestr.io",
    type: "Platform",
    description: "A platform for regenerative communities to connect, collaborate, and share resources.",
    website: "https://nestr.io",
    focus: ["Community Platform", "Collaboration", "Resources"]
  },
  {
    id: "kinship_earth",
    name: "Kinship Earth",
    type: "Network",
    description: "A global network connecting land stewards and regenerative projects for mutual support and knowledge sharing.",
    website: "https://kinship.earth",
    focus: ["Land Stewardship", "Network", "Knowledge Sharing"]
  },
  {
    id: "open_future",
    name: "Open Future Coalition",
    type: "Coalition",
    description: "A coalition of organizations working together to create open-source tools for regenerative development.",
    website: "https://openfuture.io",
    focus: ["Open Source", "Tools", "Collaboration"]
  },
  {
    id: "closer",
    name: "Closer.earth",
    type: "Platform",
    description: "A booking and community management platform designed specifically for regenerative villages and eco-communities.",
    website: "https://closer.earth",
    focus: ["Booking", "Community Management", "Villages"]
  },
  {
    id: "oasa",
    name: "OASA.earth",
    type: "Network",
    description: "Open-source network for regenerative land projects sharing best practices and collaborative resources.",
    website: "https://oasa.earth",
    focus: ["Open Source", "Land Projects", "Best Practices"]
  },
  {
    id: "maptio",
    name: "Maptio",
    type: "Tool",
    description: "Visual mapping tool for self-organizing teams and purpose-driven organizations.",
    website: "https://maptio.com",
    focus: ["Organization Design", "Mapping", "Self-Organization"]
  },
];

export default function Showcase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [focusFilter, setFocusFilter] = useState("all");

  // Fetch live DB projects and merge with static data, preferring DB values for stats
  const { data: dbProjects = [] } = trpc.community.activeLandProjects.useQuery();
  const mergedProjects = landProjects.map((staticProject) => {
    const match = dbProjects.find(
      (db) =>
        db.projectName.toLowerCase() === staticProject.name.toLowerCase() ||
        (db.location && staticProject.location.toLowerCase().includes(db.location.toLowerCase()))
    );
    if (!match) return staticProject;
    return {
      ...staticProject,
      name: match.projectName || staticProject.name,
      location: match.location
        ? match.country
          ? `${match.location}, ${match.country}`
          : match.location
        : staticProject.location,
    };
  });
  // Append DB projects that have no static counterpart
  const staticNames = new Set(landProjects.map((p) => p.name.toLowerCase()));
  const dbOnly = dbProjects
    .filter(
      (db) =>
        !staticNames.has(db.projectName.toLowerCase()) &&
        landProjects.every(
          (s) => !db.location || !s.location.toLowerCase().includes(db.location.toLowerCase())
        )
    )
    .map((db) => ({
      id: `db-${db.id}`,
      name: db.projectName,
      location: db.location
        ? db.country
          ? `${db.location}, ${db.country}`
          : db.location
        : "Location TBC",
      size: "",
      community: "",
      focus: [] as string[],
      status: "active" as const,
      description: "",
      mixedUse: [] as string[],
      image: "",
    }));
  const allProjects = [...mergedProjects, ...dbOnly];

  // Get unique locations for filter
  const locations = Array.from(new Set(allProjects.map(p => p.location.split(",")[0].trim())));

  // Get unique focus areas
  const focusAreas = Array.from(new Set(allProjects.flatMap(p => p.focus)));

  // Filter projects
  const filteredProjects = allProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === "all" || project.location.includes(locationFilter);
    const matchesFocus = focusFilter === "all" || project.focus.includes(focusFilter);
    return matchesSearch && matchesLocation && matchesFocus;
  });

  // Filter alliances
  const filteredAlliances = allianceOrganizations.filter(org => {
    return org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           org.description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getMixedUseIcon = (type: string) => {
    switch (type) {
      case "residential": return <Home className="w-3 h-3" />;
      case "commercial": return <Building2 className="w-3 h-3" />;
      case "industrial": return <Factory className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      <BackButton />
      <SEO 
        title="Project Showcase | ReGen Civics"
        description="Explore the growing network of regenerative land projects and alliance organizations co-creating a sustainable future."
        keywords="regenerative projects, land projects, eco-communities, alliance partners, sustainable living"
        image={cdnImg("https://assets.regencivics.earth/pKiFMAPaeLLVmxyg.png")}
        url="/showcase"
      />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-[#1a472a] via-[#2d5a3d] to-[#1a472a] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-40 h-40 bg-[#7dd87d] rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-60 h-60 bg-[#d4a574] rounded-full blur-3xl" />
        </div>
        
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-6 bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
              <Sprout className="w-4 h-4 mr-2" />
              Project Showcase
            </Badge>
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Regenerative Projects & Partners
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Explore the growing network of land projects and alliance organizations 
              co-creating a regenerative future.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/apply">
                <Button size="lg" className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
                  <TreePine className="w-5 h-5 mr-2" />
                  Apply as a Land Project
                </Button>
              </Link>
              <Link href="/connect?path=alliance">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <Network className="w-5 h-5 mr-2" />
                  Join as Alliance Partner
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-8 bg-white border-b border-[#1a472a]/10">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1a472a]/80" />
              <Input
                placeholder="Search projects and organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#1a472a]/20 focus:border-[#7dd87d]"
              />
            </div>
            <div className="flex gap-3">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-40 border-[#1a472a]/20">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={focusFilter} onValueChange={setFocusFilter}>
                <SelectTrigger className="w-40 border-[#1a472a]/20">
                  <Leaf className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Focus Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Focus Areas</SelectItem>
                  {focusAreas.map(focus => (
                    <SelectItem key={focus} value={focus}>{focus}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container">
          <Tabs defaultValue="projects" className="space-y-8">
            <TabsList className="bg-white border border-[#1a472a]/10 p-1">
              <TabsTrigger 
                value="projects"
                className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white"
              >
                <TreePine className="w-4 h-4 mr-2" />
                Land Projects ({filteredProjects.length})
              </TabsTrigger>
              <TabsTrigger 
                value="alliances"
                className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white"
              >
                <Network className="w-4 h-4 mr-2" />
                Alliance Partners ({filteredAlliances.length})
              </TabsTrigger>
            </TabsList>

            {/* Land Projects Tab */}
            <TabsContent value="projects">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <Card 
                    key={project.id} 
                    className="bg-white border-2 border-[#1a472a]/10 hover:border-[#7dd87d]/50 transition-all hover:shadow-lg group"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle 
                            className="text-[#1a472a] text-xl mb-1"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {project.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 text-[#1a472a]/80">
                            <MapPin className="w-4 h-4" />
                            {project.location}
                          </CardDescription>
                        </div>
                        <Badge className="bg-[#7dd87d]/20 text-[#1a472a] border-[#7dd87d]/30">
                          Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-[#1a472a]/70 line-clamp-3">
                        {project.description}
                      </p>
                      
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#f0ebe3] rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-[#1a472a]">{project.size}</p>
                          <p className="text-xs text-[#1a472a]/80">Project Size</p>
                        </div>
                        <div className="bg-[#f0ebe3] rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-[#1a472a]">{project.community}</p>
                          <p className="text-xs text-[#1a472a]/80">Community</p>
                        </div>
                      </div>

                      {/* Mixed Use Tags */}
                      <div className="flex flex-wrap gap-2">
                        {project.mixedUse.map(use => (
                          <Badge 
                            key={use} 
                            variant="outline" 
                            className="text-xs capitalize border-[#1a472a]/20"
                          >
                            {getMixedUseIcon(use)}
                            <span className="ml-1">{use}</span>
                          </Badge>
                        ))}
                      </div>

                      {/* Focus Areas */}
                      <div className="flex flex-wrap gap-1">
                        {project.focus.map(f => (
                          <Badge 
                            key={f} 
                            className="bg-[#7dd87d]/10 text-[#1a472a] text-xs border-0"
                          >
                            {f}
                          </Badge>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Link href={`/connect?path=live&project=${project.id}`} className="flex-1">
                          <Button 
                            variant="outline" 
                            className="w-full border-[#1a472a]/20 text-[#1a472a] hover:bg-[#1a472a] hover:text-white"
                          >
                            <Heart className="w-4 h-4 mr-2" />
                            Express Interest
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredProjects.length === 0 && (
                <div className="text-center py-12">
                  <TreePine className="w-16 h-16 mx-auto text-[#1a472a]/20 mb-4" />
                  <h3 className="text-xl font-semibold text-[#1a472a] mb-2">No projects found</h3>
                  <p className="text-[#1a472a]/80">Try adjusting your search or filters</p>
                </div>
              )}
            </TabsContent>

            {/* Alliance Partners Tab */}
            <TabsContent value="alliances">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAlliances.map((org) => (
                  <Card 
                    key={org.id} 
                    className="bg-white border-2 border-[#1a472a]/10 hover:border-[#7dd87d]/50 transition-all hover:shadow-lg"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle 
                            className="text-[#1a472a] text-xl mb-1"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {org.name}
                          </CardTitle>
                          <CardDescription className="text-[#1a472a]/80">
                            {org.type}
                          </CardDescription>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-[#1a472a]" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-[#1a472a]/70">
                        {org.description}
                      </p>

                      {/* Focus Areas */}
                      <div className="flex flex-wrap gap-1">
                        {org.focus.map(f => (
                          <Badge 
                            key={f} 
                            className="bg-[#7dd87d]/10 text-[#1a472a] text-xs border-0"
                          >
                            {f}
                          </Badge>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <a 
                          href={org.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button 
                            variant="outline" 
                            className="w-full border-[#1a472a]/20 text-[#1a472a] hover:bg-[#1a472a] hover:text-white"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Visit Website
                          </Button>
                        </a>
                        <Link href={`/connect?path=create_with_regens&org=${org.id}`}>
                          <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredAlliances.length === 0 && (
                <div className="text-center py-12">
                  <Network className="w-16 h-16 mx-auto text-[#1a472a]/20 mb-4" />
                  <h3 className="text-xl font-semibold text-[#1a472a] mb-2">No organizations found</h3>
                  <p className="text-[#1a472a]/80">Try adjusting your search</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#1a472a]">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Ready to Join the Movement?
            </h2>
            <p className="text-lg text-white/80 mb-8">
              Whether you're a land project seeking support or an organization wanting to collaborate, 
              we'd love to hear from you.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/apply">
                <Button size="lg" className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
                  Apply as Land Project
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/connect">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Explore All Paths
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
