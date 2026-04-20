-- Update fund-launch-banner copy.
-- Old: "🌱 Fund Launches Late 2026 — Accepting Letters of Intent Now | [Investor Info →](/investor) or [Apply for Season 2](/seasons)"
-- New: "🌱 Fund in Formation: Now Accepting LOIs. Land Projects Can [Apply for September Season 2](/seasons) | [Investor Info →](/investor)"

UPDATE siteBanners
SET
  content = '🌱 Fund in Formation: Now Accepting LOIs. Land Projects Can [Apply for September Season 2](/seasons) | [Investor Info →](/investor)',
  updatedAt = NOW()
WHERE `key` = 'fund-launch-banner';
