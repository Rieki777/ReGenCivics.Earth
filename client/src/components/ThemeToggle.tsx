import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * ThemeToggle — light/dark mode switch.
 *
 * Reads and writes through ThemeContext. Preference is persisted to
 * localStorage. Renders nothing if the ThemeProvider is not switchable.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme, switchable } = useTheme();

  if (!switchable || !toggleTheme) return null;

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 text-white/70 hover:text-white ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}

export default ThemeToggle;
