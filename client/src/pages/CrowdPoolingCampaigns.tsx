/**
 * Crowd Pooling Campaigns Page
 * Browse and discover active crowd pooling campaigns
 */

import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  MapPin, 
  Tractor, 
  Users, 
  Package, 
  TrendingUp,
  Filter,
  Sparkles,
  ArrowRight,
  DollarSign,
  Globe,
  Leaf,
  Eye
} from 'lucide-react';
import { SEO } from '@/components/SEO';
import { BackButton } from "@/components/BackButton";
import { CampaignImageGallery } from '@/components/CampaignImageGallery';
import { CampaignProgressTracker } from '@/components/CampaignProgressTracker';
import { SmartImage } from "@/components/SmartImage";
import { cdnImg } from "@/lib/utils";

type FilterCategory = 'all' | 'land' | 'equipment' | 'roles' | 'resources';

export default function CrowdPoolingCampaigns() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  
  // Fetch all active campaigns
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery({
    status: 'active',
    search: searchQuery || undefined,
  });
  
  // Filter categories
  const categories = [
    { id: 'all' as const, label: 'All Campaigns', icon: Sparkles },
    { id: 'land' as const, label: 'Land', icon: MapPin },
    { id: 'equipment' as const, label: 'Equipment', icon: Tractor },
    { id: 'roles' as const, label: 'Roles', icon: Users },
    { id: 'resources' as const, label: 'Resources', icon: Package },
  ];
  
  // Filter campaigns by category
  const filteredCampaigns = campaigns?.filter(campaign => {
    if (filterCategory === 'all') return true;
    
    // Check if campaign has items in the selected category
    switch (filterCategory) {
      case 'land':
        return campaign.landValue > 0;
      case 'equipment':
        return campaign.equipmentValue > 0;
      case 'roles':
        return campaign.rolesValue > 0;
      case 'resources':
        return campaign.resourcesValue > 0;
      default:
        return true;
    }
  });
  
  // Calculate progress percentage
  const getProgress = (campaign: any) => {
    if (campaign.totalValue === 0) return 0;
    return Math.round((campaign.pledgedTotal / campaign.totalValue) * 100);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] to-[#1a472a]">
      <BackButton />
      <SEO 
        title="Crowd Pooling Campaigns - ReGen Civics"
        description="Browse active crowd pooling campaigns from regenerative land projects. Discover opportunities to contribute land, equipment, roles, and resources."
        keywords="crowd pooling campaigns, regenerative projects, land contributions, community support"
      />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] text-white py-16 px-4 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={cdnImg("https://assets.regencivics.earth/LITCLobaccHmqZcc.jpg")}
            alt="Crowd Pooling - Community members bringing diverse resources together"
            width="1920"
            height="1080"
            className="w-full h-full object-cover opacity-60"
            loading="lazy"
          />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[#7dd87d]/20">
              <Sparkles className="w-5 h-5 text-[#7dd87d]" />
              <span className="text-sm font-medium">Active Campaigns</span>
            </div>
            <h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Crowd Pooling Campaigns
            </h1>
            <p className="text-white/95 text-lg mb-8 drop-shadow-sm">
              Discover regenerative land projects and contribute what they actually need, not just money
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1a472a]/80" />
              <Input
                type="text"
                placeholder="Search campaigns by name, location, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-white border-none"
              />
            </div>
          </div>
        </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="container py-8">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-white/70" />
          <span className="text-sm font-medium text-white/70">Filter by category:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={filterCategory === category.id ? 'default' : 'outline'}
                className={filterCategory === category.id 
                  ? 'bg-[#7dd87d] text-[#1a472a] hover:bg-[#7dd87d]/90' 
                  : 'border-white/20 text-white/70 hover:bg-[#7dd87d]/10'
                }
                onClick={() => setFilterCategory(category.id)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {category.label}
              </Button>
            );
          })}
        </div>
      </div>
      
      {/* Campaigns Grid */}
      <div className="container pb-16">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#7dd87d]"></div>
            <p className="mt-4 text-white/70">Loading campaigns...</p>
          </div>
        ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map(campaign => (
              <Link key={campaign.id} href={`/campaign/${campaign.id}`}>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden hover:border-[#7dd87d]/50 transition-all border border-[#7dd87d]/20 h-full flex flex-col">
                  {/* Cover Image */}
                  <div className="h-44 bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] relative">
                    {(campaign as any).coverImage ? (
                      <CampaignImageGallery
                        images={(campaign as any).coverImage ? [{ id: (campaign as any).coverImage.id, imageUrl: (campaign as any).coverImage.imageUrl, caption: (campaign as any).coverImage.caption, category: (campaign as any).coverImage.category, isCover: true }] : []}
                        campaignName={campaign.title}
                        mode="card"
                      />
                    ) : (campaign as any).generatedImageUrl ? (
                      <SmartImage
                        src={(campaign as any).generatedImageUrl}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                        width={800}
                        height={500}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Leaf className="w-16 h-16 text-white/60" />
                      </div>
                    )}
                    {(campaign as any).imageCount > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs z-10">
                        {(campaign as any).imageCount} photos
                      </div>
                    )}
                  </div>
                  
                  {/* Campaign Header */}
                  <div className="p-6 flex flex-col flex-grow min-w-0">
                  <div className="mb-4">
                    <h3 
                      className="text-xl font-bold text-white mb-2"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {campaign.title}
                    </h3>
                    <p className="text-sm text-white/80 mb-1 font-medium">{campaign.projectName}</p>
                    {campaign.location && (
                      <div className="flex items-center gap-1 text-sm text-white/80">
                        <MapPin className="w-3 h-3" />
                        {campaign.location}
                      </div>
                    )}
                  </div>
                  
                  {/* Vision / Description */}
                  <p className="text-white/80 text-sm mb-3 line-clamp-3 flex-grow leading-relaxed safe-prose">
                    {campaign.vision || campaign.description}
                  </p>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-white/70">
                    {campaign.landStatus && (
                      <span className="flex items-center gap-1">
                        <Leaf className="w-3 h-3 text-[#4a7c59]" />
                        {campaign.landStatus}
                      </span>
                    )}
                    {campaign.teamSize && campaign.teamSize > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#4a7c59]" />
                        {campaign.teamSize} team members
                      </span>
                    )}
                    {campaign.websiteUrl && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-[#4a7c59]" />
                        Website
                      </span>
                    )}
                  </div>
                  

                  
                  {/* Category Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {campaign.landValue > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-[#7dd87d]/15 text-[#7dd87d] rounded-full text-xs">
                        <MapPin className="w-3 h-3" />
                        Land
                      </div>
                    )}
                    {campaign.equipmentValue > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-[#4a9f9f]/15 text-[#4a9f9f] rounded-full text-xs">
                        <Tractor className="w-3 h-3" />
                        Equipment
                      </div>
                    )}
                    {campaign.rolesValue > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-[#d4a574]/15 text-[#d4a574] rounded-full text-xs">
                        <Users className="w-3 h-3" />
                        Roles
                      </div>
                    )}
                    {campaign.resourcesValue > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        <Package className="w-3 h-3" />
                        Resources
                      </div>
                    )}
                  </div>
                  
                  {/* Financial Breakdown */}
                  {campaign.financialTarget > 0 && (
                    <div className="flex items-center gap-1 mb-3 text-xs">
                      <DollarSign className="w-3 h-3 text-[#4a7c59]" />
                      <span className="text-white/70">
                        Cash target: <span className="font-semibold text-[#1a472a]">${campaign.financialTarget.toLocaleString()}</span>
                        <span className="text-[#1a472a]/80 ml-1">
                          ({Math.round((campaign.financialTarget / Math.max(campaign.totalValue, 1)) * 100)}% of total)
                        </span>
                      </span>
                    </div>
                  )}
                  
                  {/* Progress Tracker */}
                  <CampaignProgressTracker
                    totalValue={campaign.totalValue}
                    pledgedTotal={campaign.pledgedTotal}
                    financialTarget={campaign.financialTarget}
                    pledgedFinancial={campaign.pledgedFinancial}
                    contributorsCount={0}
                    durationDays={(campaign as any).durationDays || 90}
                    startedAt={(campaign as any).startedAt || (campaign as any).publishedAt || campaign.createdAt}
                    status={campaign.status}
                    currency={campaign.currency || 'USD'}
                    compact
                  />
                  
                  {/* View Details Button */}
                  <Button 
                    className="w-full bg-[#7dd87d] text-[#1a472a] hover:bg-[#7dd87d]/90 btn-press mt-4"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Campaign
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-[#1a472a]/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No campaigns found</h2>
            <p className="text-white/70 mb-6">
              {searchQuery || filterCategory !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Be the first to create a campaign!'}
            </p>
            <Link href="/create-campaign">
              <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#7dd87d]/90">
                <Sparkles className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
