-- The Home page banner (siteBanners key fund-launch-banner) still read "Fund in
-- Formation: Now Accepting LOIs ... Investor Info" and linked /investor. The
-- fund is now the member-owned cooperative in design (ADR-62), /investor
-- redirects to /loi, and public copy never offers anything (gate G5). This
-- rewrites the one live row in place. The key stays so Home.tsx keeps finding
-- it. Data only, idempotent: running it twice writes the same text.

UPDATE `siteBanners`
SET `title` = 'Cooperative Announcement Banner',
    `content` = '🌱 A cooperative regenerative society is in design: land projects and people buying and stewarding land together. [See how it will work](/fund) | Land projects: [the seasons](/seasons)'
WHERE `key` = 'fund-launch-banner';
