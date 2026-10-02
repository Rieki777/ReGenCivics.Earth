-- Example campaigns tell the truth (crowdpool bundle 1, 2026-10-01).
--
-- EXAMPLE DATA ONLY. Every statement is limited to campaigns with
-- isDemo = 1. No column changes, no real campaign is touched, safe before or
-- after the deploy and safe to run twice.
--
-- Why: production's example needs read "No one has offered yet" while their
-- counters say filled, because the example contribution rows are gone and the
-- counters built from them stayed, and the example updates name real-looking
-- people and claim progress the bar contradicts.
--
-- 1. Each example need's quantityClaimed, quantityDelivered and pledgedValue
--    are recomputed from the contribution rows that exist, the way
--    db.recomputeNeedCounters computes them: claimed over accepted, fulfilled
--    and thanked, delivered over fulfilled and thanked. Where no rows are
--    left (all four examples on production today) they read 0.
-- 2. Each example campaign's pledgedTotal and its five per-type columns are
--    recomputed from those rows, the way db.getCampaignPledgedTotals does:
--    every standing row counts toward the total, roles count type 'role'
--    only, and money counts financialAmount when it is not 0.
-- 3 to 12. The ten example updates are rewritten with no names, no progress
--    against a listed need, no month names and no "claim". Each matches its
--    campaign by title and its update number. Before applying on production,
--    check the ten rows are there as expected (build spec 2026-10-01, section
--    10.1 check 5): a statement that finds no row changes nothing.
--    scripts/seed-demo-campaigns.ts carries the same text, so a re-seed after
--    drizzle/after-deploy/0251 cannot bring the old text back.
--
-- updatedAt is kept on the tables that stamp it on update (campaign_updates
-- has none). server/example-truth.test.ts runs this file on fixtures.
-- MariaDB and MySQL 8+ compatible: no subquery reads the table its UPDATE
-- writes.

UPDATE `campaign_items` ci
  JOIN `campaigns` c ON c.id = ci.campaignId AND c.isDemo = 1
   SET ci.quantityClaimed = (SELECT COALESCE(SUM(cc.quantityPledged), 0) FROM `campaign_contributions` cc
                              WHERE cc.campaignItemId = ci.id AND cc.status IN ('accepted', 'fulfilled', 'thanked')),
       ci.quantityDelivered = (SELECT COALESCE(SUM(cc.quantityPledged), 0) FROM `campaign_contributions` cc
                              WHERE cc.campaignItemId = ci.id AND cc.status IN ('fulfilled', 'thanked')),
       ci.pledgedValue = (SELECT COALESCE(SUM(cc.estimatedValue), 0) FROM `campaign_contributions` cc
                              WHERE cc.campaignItemId = ci.id AND cc.status IN ('accepted', 'fulfilled', 'thanked')),
       ci.updatedAt = ci.updatedAt;

UPDATE `campaigns` c
   SET c.pledgedTotal = (SELECT COALESCE(SUM(cc.estimatedValue), 0) FROM `campaign_contributions` cc
                          WHERE cc.campaignId = c.id AND cc.status IN ('accepted', 'fulfilled', 'thanked')),
       c.pledgedLand = (SELECT COALESCE(SUM(cc.estimatedValue), 0) FROM `campaign_contributions` cc
                          WHERE cc.campaignId = c.id AND cc.status IN ('accepted', 'fulfilled', 'thanked') AND cc.contributionType = 'land'),
       c.pledgedEquipment = (SELECT COALESCE(SUM(cc.estimatedValue), 0) FROM `campaign_contributions` cc
                          WHERE cc.campaignId = c.id AND cc.status IN ('accepted', 'fulfilled', 'thanked') AND cc.contributionType = 'equipment'),
       c.pledgedRoles = (SELECT COALESCE(SUM(cc.estimatedValue), 0) FROM `campaign_contributions` cc
                          WHERE cc.campaignId = c.id AND cc.status IN ('accepted', 'fulfilled', 'thanked') AND cc.contributionType = 'role'),
       c.pledgedResources = (SELECT COALESCE(SUM(cc.estimatedValue), 0) FROM `campaign_contributions` cc
                          WHERE cc.campaignId = c.id AND cc.status IN ('accepted', 'fulfilled', 'thanked') AND cc.contributionType = 'resource'),
       c.pledgedFinancial = (SELECT COALESCE(SUM(COALESCE(NULLIF(cc.financialAmount, 0), cc.estimatedValue)), 0) FROM `campaign_contributions` cc
                          WHERE cc.campaignId = c.id AND cc.status IN ('accepted', 'fulfilled', 'thanked') AND cc.contributionType = 'financial'),
       c.updatedAt = c.updatedAt
 WHERE c.isDemo = 1;

UPDATE `campaign_updates` cu
  JOIN `campaigns` c ON c.id = cu.campaignId AND c.isDemo = 1 AND c.title = 'Harmony Valley Ecovillage'
   SET cu.title = 'Where the paddock fence will run',
       cu.body = 'We walked the ridge line and marked where the paddock fence will run. Every cedar post that arrives protects one more zone from the neighbour''s cattle and brings planting day closer. If you have posts, tools or a free weekend, the needs list shows what is still open.'
 WHERE cu.updateNumber = 1;

UPDATE `campaign_updates` cu
  JOIN `campaigns` c ON c.id = cu.campaignId AND c.isDemo = 1 AND c.title = 'Harmony Valley Ecovillage'
   SET cu.title = 'The food forest plan',
       cu.body = 'Zone 2 of the food forest is drawn out, with mango and citrus in the first rows and a mulch ring and drip line for every tree. When saplings come in, they go in the ground the same week. Everyone who helps plant can pick a tree to watch grow.'
 WHERE cu.updateNumber = 2;

UPDATE `campaign_updates` cu
  JOIN `campaigns` c ON c.id = cu.campaignId AND c.isDemo = 1 AND c.title = 'Harmony Valley Ecovillage'
   SET cu.title = 'Two work days for your calendar',
       cu.body = 'The food forest planting day comes first, and a cob work party on the community kitchen follows two weeks later. The dates are on each shift in the needs list. Tools, lunch and music are on us. Bring gloves, a hat and anyone who wants to learn by doing. Sign up through the needs list so we know how much lunch to cook.'
 WHERE cu.updateNumber = 3;

UPDATE `campaign_updates` cu
  JOIN `campaigns` c ON c.id = cu.campaignId AND c.isDemo = 1 AND c.title = 'Terra Nova Regenerative Farm'
   SET cu.title = 'Starting with the soil',
       cu.body = 'We measured how fast water soaks into the two most worn hectares, so we have a baseline to come back to. Finished compost goes there first. Soil science support would put real numbers behind what our boots already tell us about the east slope.'
 WHERE cu.updateNumber = 1;

UPDATE `campaign_updates` cu
  JOIN `campaigns` c ON c.id = cu.campaignId AND c.isDemo = 1 AND c.title = 'Terra Nova Regenerative Farm'
   SET cu.title = 'Swales before the rains',
       cu.body = 'The keyline survey shows where the swales should run on the east slope. The digging weekend needs a crew and a mini excavator. If you have ever wanted to learn water-harvesting earthworks with your own shovel, this is the weekend. Every metre of swale finished before the rains is water in the ground next summer.'
 WHERE cu.updateNumber = 2;

UPDATE `campaign_updates` cu
  JOIN `campaigns` c ON c.id = cu.campaignId AND c.isDemo = 1 AND c.title = 'Pachamama Learning Village'
   SET cu.title = 'Planning the first minga',
       cu.body = 'The first classroom will go up in adobe at a community minga, with the elders blessing the corners at sunrise. It takes blocks, many hands and good food for a long day. The needs list shows what is still open, and there is a place in the line for you.'
 WHERE cu.updateNumber = 1;

UPDATE `campaign_updates` cu
  JOIN `campaigns` c ON c.id = cu.campaignId AND c.isDemo = 1 AND c.title = 'Pachamama Learning Village'
   SET cu.title = 'Why we are recording the elders',
       cu.body = 'The heart of this project is an archive of what the elders know: water ceremonies, terracing songs and the stories behind them. Each recording will go into the community archive with the family''s consent, in Kichwa first and Spanish second. A camera kit and someone to help with documentation would let the first interviews begin.'
 WHERE cu.updateNumber = 2;

UPDATE `campaign_updates` cu
  JOIN `campaigns` c ON c.id = cu.campaignId AND c.isDemo = 1 AND c.title = 'Rewild Britain Sanctuary'
   SET cu.title = 'Fencing the lower glen',
       cu.body = 'The lower glen enclosure is marked out on the ground. Once the deer fencing is up, birch, rowan and Scots pine whips can go in at the planting weekend. From the top gate you can already see the shape of the future wood in the fence line.'
 WHERE cu.updateNumber = 1;

UPDATE `campaign_updates` cu
  JOIN `campaigns` c ON c.id = cu.campaignId AND c.isDemo = 1 AND c.title = 'Rewild Britain Sanctuary'
   SET cu.title = 'Camera traps for the wildlife corridor',
       cu.body = 'Camera traps along the burn-side corridor will show which animals use the route before a single tree of it is planted. We hope to record pine marten, which would be the first sighting on this ground in living memory.'
 WHERE cu.updateNumber = 2;

UPDATE `campaign_updates` cu
  JOIN `campaigns` c ON c.id = cu.campaignId AND c.isDemo = 1 AND c.title = 'Rewild Britain Sanctuary'
   SET cu.title = 'The planting weekend',
       cu.body = 'Bothy bunks, hot meals and tools are sorted for the planting weekend. What it needs now is people. If you would like a place, sign up on the needs list and bring warm socks.'
 WHERE cu.updateNumber = 3;
