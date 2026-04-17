import { Globe, Users, Sprout, BarChart3 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { DoughnutChart } from "@/components/DoughnutChart";

// Sprint 3: doughnut economics bioregion dashboard. Uses sample data until
// the gov app has its own tRPC client wired to the main site.

const SAMPLE_DIMENSIONS = [
  { dimension: "Food security", ring: "social" as const, value: 65, min: 0, max: 100 },
  { dimension: "Education", ring: "social" as const, value: 72, min: 0, max: 100 },
  { dimension: "Health", ring: "social" as const, value: 58, min: 0, max: 100 },
  { dimension: "Housing", ring: "social" as const, value: 45, min: 0, max: 100 },
  { dimension: "Community", ring: "social" as const, value: 80, min: 0, max: 100 },
  { dimension: "Soil health", ring: "ecological" as const, value: 70, min: 0, max: 100 },
  { dimension: "Water quality", ring: "ecological" as const, value: 62, min: 0, max: 100 },
  { dimension: "Biodiversity", ring: "ecological" as const, value: 55, min: 0, max: 100 },
  { dimension: "Carbon", ring: "ecological" as const, value: 48, min: 0, max: 100 },
  { dimension: "Land use", ring: "ecological" as const, value: 73, min: 0, max: 100 },
];

const SAMPLE_PROJECTS = [
  { name: "Skagit Seed Library", members: 12, status: "active" },
  { name: "Mendocino Cooperative Farm", members: 8, status: "active" },
  { name: "Columbia River Watershed Restoration", members: 23, status: "planning" },
];

export default function BioregionPage({ params }: { params: { id: string } }) {
  const compositeScore = Math.round(SAMPLE_DIMENSIONS.reduce((a, d) => a + d.value, 0) / SAMPLE_DIMENSIONS.length);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Globe className="w-7 h-7 text-[#7dd87d]" />
        <div>
          <h1 className="text-3xl font-bold text-white capitalize">{params.id.replace(/-/g, " ")}</h1>
          <p className="text-white/55 text-sm">Bioregion health dashboard</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Doughnut Chart */}
        <GlassCard>
          <h2 className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-4">
            Doughnut Economics
          </h2>
          <DoughnutChart dimensions={SAMPLE_DIMENSIONS} size={300} />
          <p className="text-center text-white/65 text-sm mt-3">
            Composite health score: <span className="text-[#7dd87d] font-bold">{compositeScore}/100</span>
          </p>
          <div className="flex justify-center gap-4 mt-3 text-[10px] text-white/55">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7dd87d]" /> Healthy (70+)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ffd700]" /> Watch (40-69)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical (&lt;40)</span>
          </div>
        </GlassCard>

        {/* Dimension scores */}
        <GlassCard>
          <h2 className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-4">
            Dimension Scores
          </h2>
          <div className="space-y-3">
            <p className="text-white/55 text-xs uppercase tracking-wider">Social foundation</p>
            {SAMPLE_DIMENSIONS.filter((d) => d.ring === "social").map((d) => (
              <div key={d.dimension}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-white/80">{d.dimension}</span>
                  <span className="font-bold" style={{ color: d.value >= 70 ? "#7dd87d" : d.value >= 40 ? "#ffd700" : "#ef4444" }}>{d.value}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${d.value}%`, backgroundColor: d.value >= 70 ? "#7dd87d" : d.value >= 40 ? "#ffd700" : "#ef4444" }} />
                </div>
              </div>
            ))}
            <p className="text-white/55 text-xs uppercase tracking-wider mt-4">Ecological ceiling</p>
            {SAMPLE_DIMENSIONS.filter((d) => d.ring === "ecological").map((d) => (
              <div key={d.dimension}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-white/80">{d.dimension}</span>
                  <span className="font-bold" style={{ color: d.value >= 70 ? "#7dd87d" : d.value >= 40 ? "#ffd700" : "#ef4444" }}>{d.value}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${d.value}%`, backgroundColor: d.value >= 70 ? "#7dd87d" : d.value >= 40 ? "#ffd700" : "#ef4444" }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Land Projects */}
      <GlassCard>
        <h2 className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-4">
          Land Projects
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SAMPLE_PROJECTS.map((p) => (
            <div key={p.name} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Sprout className="w-4 h-4 text-[#7dd87d]" />
                <h3 className="text-white font-bold text-sm">{p.name}</h3>
              </div>
              <div className="flex items-center gap-3 text-white/55 text-xs">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.members}</span>
                <span className="capitalize px-2 py-0.5 rounded-full bg-white/10 text-[10px]">{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
