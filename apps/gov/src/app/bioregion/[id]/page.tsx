import { Globe } from "lucide-react";

export default function BioregionPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-7 h-7 text-[#7dd87d]" />
        <h1 className="text-3xl font-bold text-white">Bioregion: {params.id}</h1>
      </div>
      <div className="bg-[rgba(26,71,42,0.85)] backdrop-blur rounded-2xl p-8 border border-[rgba(125,216,125,0.15)] text-center">
        <p className="text-white/65 text-sm">
          Bioregion dashboard coming in Sprint 3: doughnut economics, land projects, local governance.
        </p>
      </div>
    </div>
  );
}
