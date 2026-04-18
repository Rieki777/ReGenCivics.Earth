const TRANSITIONS = [
  { month: 2, day: 4 },   // Imbolc
  { month: 3, day: 20 },  // Spring equinox
  { month: 5, day: 5 },   // Beltane
  { month: 6, day: 21 },  // Summer solstice
  { month: 8, day: 7 },   // Lammas
  { month: 9, day: 22 },  // Autumn equinox
  { month: 11, day: 7 },  // Samhain
  { month: 12, day: 21 }, // Winter solstice
];

export function shouldShowConfetti(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  if (localStorage.getItem("rc-confetti-date") === today) return false;
  const isTransition = TRANSITIONS.some(t => t.month === now.getMonth() + 1 && t.day === now.getDate());
  if (!isTransition) return false;
  localStorage.setItem("rc-confetti-date", today);
  return true;
}

export function currentSeasonFromDate(now = new Date()): "spring" | "summer" | "autumn" | "winter" {
  const m = now.getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}
