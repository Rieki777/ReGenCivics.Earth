import { UserCircle } from "lucide-react";

export default function PassportPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center gap-3 mb-6">
        <UserCircle className="w-7 h-7 text-[#7dd87d]" />
        <h1 className="text-3xl font-bold text-white">Passport</h1>
      </div>
      <div className="bg-[rgba(26,71,42,0.85)] backdrop-blur rounded-2xl p-8 border border-[rgba(125,216,125,0.15)] text-center">
        <p className="text-white/65 text-sm">
          Governance passport coming in Sprint 5: identity card, liquid delegation, governance handbook.
        </p>
      </div>
    </div>
  );
}
