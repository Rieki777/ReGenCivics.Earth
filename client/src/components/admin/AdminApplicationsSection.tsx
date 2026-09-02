import { useEffect, useState, type ReactNode } from "react";
import { AdminApplicationsReview } from "./AdminApplicationsReview";

const VIEW_KEY = "admin_applications_view";

type View = "reviews" | "list";

/**
 * One Applications workspace inside the admin shell.
 * Reviews is the daily path (status cards, email, open a project).
 * List is search, CSV, notes, and drafts.
 */
export function AdminApplicationsSection({ list }: { list: ReactNode }) {
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "reviews";
    } catch {
      return "reviews";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* storage blocked */
    }
  }, [view]);

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
          onClick={() => setView("reviews")}
          aria-pressed={view === "reviews"}
        >
          Reviews
        </button>
        <button
          type="button"
          className={tabClass(view === "list")}
          onClick={() => setView("list")}
          aria-pressed={view === "list"}
        >
          List, search, export
        </button>
      </div>
      {view === "reviews" ? <AdminApplicationsReview /> : list}
    </div>
  );
}
