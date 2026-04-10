/** Design tokens for ReGen Gov. Dark forest palette with green accents. */
export const theme = {
  colors: {
    bg: "#0d2818",
    bgCard: "rgba(26, 71, 42, 0.85)",
    accent: "#7dd87d",
    accentHover: "#6bc86b",
    text: "#ffffff",
    textMuted: "rgba(255, 255, 255, 0.65)",
    textFaint: "rgba(255, 255, 255, 0.45)",
    border: "rgba(125, 216, 125, 0.15)",
    borderHover: "rgba(125, 216, 125, 0.3)",
    danger: "#ef4444",
    amber: "#d4a574",
  },
  radius: {
    card: "16px",
    pill: "9999px",
    md: "12px",
  },
  blur: {
    card: "12px",
    overlay: "20px",
  },
} as const;
