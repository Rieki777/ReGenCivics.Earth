import { useState, useEffect } from "react";
import { 
  ExternalLink, 
  TrendingUp, 
  Wallet, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Shield,
  Eye,
  Leaf,
  Building2,
  Globe,
  ChevronDown,
  Trees,
  Home,
  Users,
  Sprout,
  Droplets,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Sample transaction data representing the types of distributions
// In production, this would come from the Hypha API
const sampleTransactions = [
  {
    id: 1,
    type: "distribution",
    project: "La Tierra Regenerativa",
    amount: 25000,
    currency: "USDC",
    date: "2026-01-15",
    status: "completed",
    category: "land",
    description: "Q1 2026 operational funding"
  },
  {
    id: 2,
    type: "distribution",
    project: "StarSeed Village",
    amount: 18500,
    currency: "USDC",
    date: "2026-01-10",
    status: "completed",
    category: "land",
    description: "Infrastructure development"
  },
  {
    id: 3,
    type: "distribution",
    project: "Hypha DAO",
    amount: 12000,
    currency: "USDC",
    date: "2026-01-05",
    status: "completed",
    category: "alliance",
    description: "Platform development contribution"
  },
  {
    id: 4,
    type: "distribution",
    project: "Ubuntu Village",
    amount: 15000,
    currency: "USDC",
    date: "2025-12-28",
    status: "completed",
    category: "land",
    description: "Community infrastructure"
  },
  {
    id: 5,
    type: "investment",
    project: "ReGen Civics Treasury",
    amount: 50000,
    currency: "USDC",
    date: "2025-12-20",
    status: "completed",
    category: "inflow",
    description: "Investor contribution - Q4 2025"
  },
  {
    id: 6,
    type: "distribution",
    project: "SEEDS Ecosystem",
    amount: 8000,
    currency: "USDC",
    date: "2025-12-15",
    status: "completed",
    category: "alliance",
    description: "Token ecosystem development"
  }
];

const projectAllocations = [
  { name: "La Tierra Regenerativa", allocation: 28, color: "#7dd87d", type: "Land Project" },
  { name: "StarSeed Village", allocation: 22, color: "#6bc86b", type: "Land Project" },
  { name: "Ubuntu Village", allocation: 18, color: "#5ab85a", type: "Land Project" },
  { name: "Hypha DAO", allocation: 15, color: "#4a7c59", type: "Alliance Partner" },
  { name: "SEEDS Ecosystem", allocation: 10, color: "#3d6b4a", type: "Alliance Partner" },
  { name: "Operations Reserve", allocation: 7, color: "#2d5a3b", type: "Reserve" }
];

export default function TreasuryDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [transparencyOpen, setTransparencyOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const totalFunds = 51115111;
  const totalDistributed = 718500;
  const pendingDistributions = 32000;
  const treasuryAddress = "0x61203bC03b70A6A985a15DE92E1cd381CEA268ac";

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* Model Dashboard Notice */}
      <div className="bg-gradient-to-r from-amber-500/30 via-amber-500/20 to-amber-500/30 border-2 border-amber-500/60 rounded-2xl p-6 md:p-8 text-center shadow-lg shadow-amber-500/10">
        <p className="text-amber-300 font-extrabold text-3xl md:text-4xl tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
          📊 MODEL DASHBOARD
        </p>
        <p className="text-amber-100/90 text-base md:text-lg mt-3 max-w-2xl mx-auto leading-relaxed">
          This is a projection. Distributions won't begin until the fund reaches $20M committed.
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[#7dd87d] flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
            <Wallet className="w-7 h-7" />
            Live Treasury Dashboard
          </h3>
          <p className="text-white/60 mt-1 text-sm">
            Real-time transparency into fund distributions and project allocations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-[#7dd87d]/30 text-[#7dd87d] hover:bg-[#7dd87d]/10"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-[#7dd87d]">
            <Shield className="w-4 h-4" />
            <span>90% Unity Governance</span>
          </div>
          <div className="flex items-center gap-2 text-[#7dd87d]">
            <Eye className="w-4 h-4" />
            <span>On-Chain Transparency</span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <span className="font-mono text-xs bg-[#1a472a] px-2 py-1 rounded">
              {treasuryAddress.slice(0, 6)}...{treasuryAddress.slice(-4)}
            </span>
            <a 
              href={`https://basescan.org/address/${treasuryAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7dd87d] hover:underline flex items-center gap-1"
            >
              View on BaseScan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Total Treasury</span>
            <TrendingUp className="w-4 h-4 text-[#7dd87d]" />
          </div>
          <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            ${totalFunds.toLocaleString()}
          </div>
          <div className="text-xs text-[#7dd87d] mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            +12.5% this quarter
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Total Distributed</span>
            <PieChart className="w-4 h-4 text-[#7dd87d]" />
          </div>
          <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            ${totalDistributed.toLocaleString()}
          </div>
          <div className="text-xs text-white/50 mt-1">
            Across 8 projects
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Land Projects</span>
            <Leaf className="w-4 h-4 text-[#7dd87d]" />
          </div>
          <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            68%
          </div>
          <div className="text-xs text-white/50 mt-1">
            Of distributions
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Alliance Partners</span>
            <Building2 className="w-4 h-4 text-[#7dd87d]" />
          </div>
          <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            32%
          </div>
          <div className="text-xs text-white/50 mt-1">
            Of distributions
          </div>
        </div>
      </div>

      {/* Impact Metrics */}
      <div className="mt-2">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Globe className="w-5 h-5 text-[#7dd87d]" />
          Regenerative Impact Metrics
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/20 rounded-xl p-4 text-center">
            <Trees className="w-6 h-6 text-[#7dd87d] mx-auto mb-2" />
            <div className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>2,847</div>
            <div className="text-xs text-white/50 mt-1">Hectares Under<br/>Regeneration</div>
          </div>
          <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/20 rounded-xl p-4 text-center">
            <Home className="w-6 h-6 text-[#d4a574] mx-auto mb-2" />
            <div className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>156</div>
            <div className="text-xs text-white/50 mt-1">Families<br/>Housed</div>
          </div>
          <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/20 rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>1,240</div>
            <div className="text-xs text-white/50 mt-1">People<br/>Fed</div>
          </div>
          <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/20 rounded-xl p-4 text-center">
            <Sprout className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>48,200</div>
            <div className="text-xs text-white/50 mt-1">Trees<br/>Planted</div>
          </div>
          <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/20 rounded-xl p-4 text-center">
            <Droplets className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>12.4M</div>
            <div className="text-xs text-white/50 mt-1">Liters Water<br/>Restored</div>
          </div>
          <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/20 rounded-xl p-4 text-center">
            <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>342</div>
            <div className="text-xs text-white/50 mt-1">Jobs<br/>Created</div>
          </div>
        </div>
        <p className="text-white/55 text-xs mt-2 text-center italic">Model projections based on portfolio targets. Actual metrics tracked via HEIST framework.</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Allocations */}
        <div className="bg-[#0d2818]/80 border border-[#7dd87d]/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <PieChart className="w-5 h-5 text-[#7dd87d]" />
            Current Allocations
          </h4>
          <div className="space-y-3">
            {projectAllocations.map((project, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="text-white">{project.name}</span>
                    <span className="text-white/60 text-xs">({project.type})</span>
                  </div>
                  <span className="text-[#7dd87d] font-semibold">{project.allocation}%</span>
                </div>
                <div className="h-2 bg-[#1a472a] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${project.allocation}%`,
                      backgroundColor: project.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-[#0d2818]/80 border border-[#7dd87d]/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Globe className="w-5 h-5 text-[#7dd87d]" />
            Recent Distributions
          </h4>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {sampleTransactions.map((tx) => (
              <div 
                key={tx.id} 
                className="bg-[#1a472a]/70 rounded-lg p-3 border border-[#7dd87d]/10 hover:border-[#7dd87d]/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{tx.project}</span>
                      {tx.type === "investment" ? (
                        <ArrowDownRight className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 text-[#7dd87d]" />
                      )}
                    </div>
                    <p className="text-white/50 text-xs mt-1">{tx.description}</p>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${tx.type === "investment" ? "text-blue-400" : "text-[#7dd87d]"}`}>
                      {tx.type === "investment" ? "+" : "-"}${tx.amount.toLocaleString()}
                    </div>
                    <div className="text-white/60 text-xs">{tx.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hypha Integration - Prominent Preview Card */}
      <a 
        href="https://app.hypha.earth/en/dho/regen-civics/treasury"
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="relative bg-gradient-to-br from-[#1a472a]/40 via-[#0d2818]/30 to-[#1a472a]/40 backdrop-blur-sm border-2 border-[#7dd87d]/30 rounded-2xl overflow-hidden hover:border-[#7dd87d]/60 transition-all duration-300 hover:shadow-[0_0_40px_rgba(125,216,125,0.15)]">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#7dd87d] blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#4a7c59] blur-[80px]" />
          </div>
          
          {/* Content */}
          <div className="relative p-5 md:p-12 rounded-xl" style={{ backgroundColor: 'rgba(10, 28, 18, 0.82)' }}>
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              {/* Left Side - Icon & Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#7dd87d]/20 flex items-center justify-center group-hover:bg-[#7dd87d]/30 transition-colors">
                    <Globe className="w-8 h-8 text-[#7dd87d]" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                      Hypha Space Treasury
                    </h4>
                    <p className="text-[#7dd87d] text-sm font-medium">Full Transparency Platform</p>
                  </div>
                </div>
                
                <p className="text-white/80 text-lg leading-relaxed mb-6">
                  Explore our complete treasury dashboard on Base (Coinbase's Blockchain). See real-time fund allocations, 
                  active proposals, voting history, and complete transaction records.
                </p>
                
                {/* Feature Pills */}
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 rounded-full bg-[#7dd87d]/10 text-[#7dd87d] text-sm border border-[#7dd87d]/20">
                    <Eye className="w-4 h-4 inline mr-2" />
                    On-Chain Transparency
                  </span>
                  <span className="px-4 py-2 rounded-full bg-[#7dd87d]/10 text-[#7dd87d] text-sm border border-[#7dd87d]/20">
                    <Shield className="w-4 h-4 inline mr-2" />
                    90% Unity Governance
                  </span>
                  <span className="px-4 py-2 rounded-full bg-[#7dd87d]/10 text-[#7dd87d] text-sm border border-[#7dd87d]/20">
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    Live Updates
                  </span>
                </div>
              </div>
              
              {/* Right Side - CTA */}
              <div className="flex-shrink-0">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-[#7dd87d] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-[#7dd87d]/30">
                    <ExternalLink className="w-10 h-10 text-[#1a472a]" />
                  </div>
                  <span className="text-white font-bold text-lg group-hover:text-[#7dd87d] transition-colors">
                    Open Dashboard
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Accent Bar */}
          <div className="h-1 bg-gradient-to-r from-transparent via-[#7dd87d] to-transparent" />
        </div>
      </a>

      {/* Transparency Commitment - Collapsible */}
      <Collapsible open={transparencyOpen} onOpenChange={setTransparencyOpen}>
        <div className="bg-gradient-to-r from-[#1a472a]/80 to-[#0d2818]/80 backdrop-blur-md border border-[#7dd87d]/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
              <Eye className="w-6 h-6 text-[#7dd87d]" />
            </div>
            <div className="flex-1">
              <CollapsibleTrigger asChild>
                <button className="w-full text-left">
                  <h4 className="text-lg font-bold text-white mb-2 flex items-center justify-between" style={{ fontFamily: 'var(--font-display)' }}>
                    <span>Our Transparency & Governance Commitment</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#7dd87d] transition-transform ${
                        transparencyOpen ? "rotate-180" : ""
                      }`}
                    />
                  </h4>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="text-white/70 text-sm leading-relaxed">
                  Every distribution from the ReGen Civics treasury requires <strong className="text-[#7dd87d]">90% unity</strong> from 
                  investors, a council of experts, existing land projects, and alliance organizations. This ensures extremely high conviction across the network 
                  before any funds are deployed. All transactions are recorded on-chain and visible to anyone, anytime.
                </p>
              </CollapsibleContent>
            </div>
          </div>
        </div>
      </Collapsible>
    </div>
  );
}
