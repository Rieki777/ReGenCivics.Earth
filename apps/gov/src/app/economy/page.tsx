import { BarChart3 } from "lucide-react";

export default function EconomyPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-7 h-7 text-[#7dd87d]" />
        <h1 className="text-3xl font-bold text-white">Economy</h1>
      </div>
      <div className="bg-[rgba(26,71,42,0.85)] backdrop-blur rounded-2xl p-8 border border-[rgba(125,216,125,0.15)] text-center">
        <p className="text-white/65 text-sm">
          Economy dashboard coming in Sprint 4: $ReGen supply, velocity, distribution, gratitude flows.
        </p>
      </div>
    </div>
  );
}
