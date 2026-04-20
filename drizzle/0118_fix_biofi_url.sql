-- Fix BioFi tool URL (E3 from FIXES_TO_MAKE_2026-04-08_MOBILE_SAFARI.md)
UPDATE regen_tools SET websiteUrl = 'https://biofi.earth' WHERE slug = 'biofi';
