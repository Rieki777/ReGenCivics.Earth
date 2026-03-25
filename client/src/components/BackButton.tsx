import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

/**
 * BackButton - A floating back button that navigates to the previous page or home.
 * Uses browser history when available, falls back to specified route.
 */
export function BackButton({
  fallbackPath = "/",
  label = "Back",
  inline = false,
}: {
  fallbackPath?: string;
  label?: string;
  inline?: boolean;
}) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    // Check if there's browser history to go back to
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`${inline ? "relative mb-4" : "relative mb-4 md:fixed md:top-20 md:left-4 md:z-40"} flex items-center gap-2 bg-[#1a472a]/90 backdrop-blur-sm text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-[#1a472a] transition-all duration-200 hover:shadow-xl hover:scale-105 border border-[#7dd87d]/30 group`}
      style={{ fontFamily: 'var(--font-display)' }}
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
