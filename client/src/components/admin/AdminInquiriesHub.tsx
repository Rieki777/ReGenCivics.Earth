import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Columns3, Home, Palette, Handshake, UserCheck, HelpCircle } from "lucide-react";
import { InquirySection } from "./AdminInquirySection";
import { AdminKanbanTab } from "./AdminKanbanTab";
import { AdminRoleTab } from "./AdminAllianceTab";
import { inquiryTypeForPath, type InquiryHubType } from "@/lib/adminInquiry";

const TYPE_CARDS: Array<{
  id: InquiryHubType | "kanban";
  label: string;
  blurb: string;
  icon: typeof Home;
}> = [
  { id: "live", label: "Live in Land", blurb: "People who want to live in a land project", icon: Home },
  { id: "create", label: "Create with ReGens", blurb: "People who want to build with us", icon: Palette },
  { id: "alliance", label: "Alliance partners", blurb: "Organizations asking to join the alliance", icon: Handshake },
  { id: "role", label: "Role inquiries", blurb: "People offering a role in ReGen Civics", icon: UserCheck },
  { id: "other", label: "Other inquiries", blurb: "Finance, learn, and everything else", icon: HelpCircle },
  { id: "kanban", label: "Pipeline board", blurb: "Move contacts across the board", icon: Columns3 },
];

function countFor(id: string, inquiries: any[]) {
  if (id === "kanban") return inquiries.length;
  if (id === "other") {
    return inquiries.filter((i: any) => !["live", "create", "alliance", "role"].includes(i.pathType)).length;
  }
  return inquiries.filter((i: any) => i.pathType === id).length;
}

export function AdminInquiriesHub({
  inquiries,
  investors,
  applications,
  openId,
  initialType,
}: {
  inquiries: any[] | undefined;
  investors: any[] | undefined;
  applications: any[] | undefined;
  openId?: number | null;
  initialType?: string | null;
}) {
  const rows = inquiries || [];
  const [openType, setOpenType] = useState<string | null>(() => initialType || "live");

  useEffect(() => {
    if (initialType) setOpenType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (openId == null) return;
    const row = rows.find((i: any) => i.id === openId);
    if (row) setOpenType(inquiryTypeForPath(row.pathType));
  }, [openId, rows]);

  const pendingByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const card of TYPE_CARDS) {
      map[card.id] = countFor(card.id, rows);
    }
    return map;
  }, [rows]);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          Inquiries
        </h2>
        <p className="text-sm text-[#1a472a]/80">Tap a type. The list opens on that card.</p>
      </div>
      {TYPE_CARDS.map((card) => {
        const Icon = card.icon;
        const expanded = openType === card.id;
        return (
          <div
            key={card.id}
            id={`inquiry-type-${card.id}`}
            className={`rounded-2xl border bg-white overflow-hidden ${expanded ? "border-[#1a472a]/40 shadow-sm" : "border-[#1a472a]/15"}`}
          >
            <button
              type="button"
              onClick={() => setOpenType(expanded ? null : card.id)}
              className="w-full min-h-11 px-4 py-3 flex items-center gap-3 text-left"
              aria-expanded={expanded}
            >
              <span className="w-10 h-10 rounded-full bg-[#1a472a]/10 inline-flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[#1a472a]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[#1a472a]">{card.label}</span>
                <span className="block text-xs text-[#1a472a]/75">{card.blurb}</span>
              </span>
              <span className="text-lg font-bold tabular-nums text-[#1a472a]">{pendingByType[card.id] ?? 0}</span>
              <ChevronDown className={`w-4 h-4 text-[#1a472a]/50 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded && (
              <div className="border-t border-[#1a472a]/10">
                {card.id === "kanban" ? (
                  <div className="p-3">
                    <AdminKanbanTab
                      investors={investors || []}
                      inquiries={rows}
                      applications={applications || []}
                    />
                  </div>
                ) : card.id === "role" ? (
                  <div className="p-3">
                    <AdminRoleTab />
                  </div>
                ) : (
                  <InquirySection
                    pathType={card.id}
                    inquiries={card.id === "other"
                      ? rows
                          .filter((i: any) => !["live", "create", "alliance", "role"].includes(i.pathType))
                          .map((i: any) => ({ ...i, pathType: "other" }))
                      : rows}
                    openId={openId}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
