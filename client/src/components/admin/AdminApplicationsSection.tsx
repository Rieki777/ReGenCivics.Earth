import { useEffect, useState, type ReactNode } from "react";
import { AdminApplicationsReview } from "./AdminApplicationsReview";

const VIEW_KEY = "admin_applications_view";

type View = "reviews" | "list";

/**
 * One Applications workspace inside the admin shell.
 * Reviews is the daily path (status cards, email, open a project).
 * List is search, CSV, notes, and drafts.
 */
export function AdminApplicationsSection({
  list,
  openId,
  onOpenIdChange,
  status,
  onStatusChange,
  view: viewFromUrl,
  onViewChange,
}: {
  list: ReactNode;
  openId?: number | null;
  onOpenIdChange?: (id: number | null) => void;
  status?: string | null;
  onStatusChange?: (status: string | null) => void;
  view?: string | null;
  onViewChange?: (view: string | null) => void;
}) {
  const [view, setView] = useState<View>(() => {
    if (viewFromUrl === "list" || viewFromUrl === "reviews") return viewFromUrl;
    try {
      return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "reviews";
    } catch {
      return "reviews";
    }
  });

  useEffect(() => {
    if (viewFromUrl === "list" || viewFromUrl === "reviews") setView(viewFromUrl);
  }, [viewFromUrl]);

  const setAndRemember = (next: View) => {
    setView(next);
    onViewChange?.(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* storage blocked */
    }
  };

  const tabClass = (active: boolean) =>
    `min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
      active
        ? "bg-[#1a472a] text-white border-[#1a472a]"
        : "bg-white text-[#1a472a] border-[#1a472a]/20 hover:bg-[#f0f7f0]"
    }`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={tabClass(view === "reviews")}
          onClick={() => setAndRemember("reviews")}
          aria-pressed={view === "reviews"}
        >
          Reviews
        </button>
        <button
          type="button"
          className={tabClass(view === "list")}
          onClick={() => setAndRemember("list")}
          aria-pressed={view === "list"}
        >
          List, search, export
        </button>
      </div>
      {view === "reviews" ? (
        <AdminApplicationsReview
          openId={openId}
          onOpenIdChange={onOpenIdChange}
          status={status}
          onStatusChange={onStatusChange}
        />
      ) : list}
    </div>
  );
}
