# Hub public-procedure PII sweep (2026-08-15)

Produced by a sweep subagent of Lane HS after Lane P flagged `playerProfiles.list` /
`getByHandle`. Field NAMES only; no values. Severity is the sweep's. Coordinator ruling: ALL
HIGH rows are fixed by Lane HS in its first PR (public projections); MEDIUM rows in a second PR;
the `events.checkinToken` finding is an ABUSE PATH (write attendance + mint ledger credit with any
email), so those tokens are rotated after the fix lands.

```
SEVERITY | procedure.path | file:line | table(s) | leaked columns | enumerable?

HIGH | seedsClaims.lookup | server/routes/seedsClaims.ts:42 | seeds_claims | email, baseWalletAddress, disputeReason, evidenceUrls, adminNotes, reviewedBy | yes (seedsAccount, public on-chain name)
HIGH | localFood.list | server/routes/localFood.ts:9 | local_food_applications | contactEmail, contactName, locationLat, locationLng | no (whole-list dump)
HIGH | localFood.getById | server/routes/localFood.ts:90 | local_food_applications | contactEmail, contactName, locationLat, locationLng | yes (id; NO status filter)
HIGH | videoSuggestions.list | server/routes/newsletter.ts:157 (helper server/db/videoSuggestions.ts:29) | video_suggestions | submitterEmail, voterEmails | no (entire table, no input, no status filter)
HIGH | tools.getBySlug | server/routes/tools.ts:68 | regen_tools, regen_tool_endorsements | contactEmail, submittedBy, approvedBy | yes (slug; NO status='approved' filter)
HIGH | tools.list | server/routes/tools.ts:14 | regen_tools | contactEmail, submittedBy, approvedBy | no (paginated dump)
HIGH | events.list | server/routes/events.ts:195 | events | checkinToken, zoomUrl, riversideRoomUrl, reminderCustomSubject/Body | no
HIGH | events.getBySeason | server/routes/events.ts:365 | events | checkinToken, zoomUrl, riversideRoomUrl | yes (season)
HIGH | events.getById | server/routes/events.ts:870 | events | checkinToken, zoomUrl, riversideRoomUrl | yes (id)
HIGH | hyphaBridge.get | server/routes/hyphaBridge.ts:90 (helper server/lib/hypha-bridge/index.ts:99) | hyphaBridges | hyphaRecipientWallet, hyphaTxHash, initiatorUserId, payload.recipient, payload.payouts[] | yes (bridgeKey = 40-bit; keys published via activityFeed.list metadata)
MEDIUM | activityFeed.list | server/routes/activityFeed.ts:12 | activity_feed_events | metadata (contains bridgeKey), moderation flag reason | no
MEDIUM | orgRatings.getForOrg | server/routes/orgRatings.ts:112 | organisation_ratings | raterId, note | yes (organisationId)
MEDIUM | claims.listContributors | server/routes/claims.ts:359 | historicalClaims | reviewNote, reviewerId, reviewDecision, overrideReason, adjustedTier*, suggestedTier* | no
MEDIUM | claims.getContributor | server/routes/claims.ts:381 | historicalClaims, toolsLibraryEntries | same review-trail columns | yes (id)
MEDIUM | claims.listProposalParties | server/routes/claims.ts:421 | proposalParties | notes, recordingLink, unannounced scheduledAt | no (no status filter)
MEDIUM | campaigns.list | server/routes/campaigns.ts:208 (helper server/db.ts:759) | campaigns | adminNotes, reviewedBy, reviewedAt | no (status optional -> draft/rejected returned)
MEDIUM | campaigns.getById | server/routes/campaigns.ts:273 (helper server/db.ts:787) | campaigns | adminNotes, reviewedBy, reviewedAt | yes (id)
MEDIUM | govProposals.listVotes | server/routes/govProposals.ts:204 | govVotes | voterId, reason, delegatedFromId, weight | yes (proposalId)
MEDIUM | govProposals.list | server/routes/govProposals.ts:15 | govProposals | draft/withdrawn bodies | yes (tenantId; status optional)
MEDIUM | plays.getBySlug | server/routes/plays.ts:70 | plays | submittedBy, creatorUserId, approvedBy, externalPaymentUrl + pending/rejected rows | yes (slug; NO status filter)
MEDIUM | ship.seeds.listVerified | server/routes/ship.ts:1567 | ship_seed_plantings | lat, lng, userId, notes, bookingId | no
```

LOW (unprojected, tables carry no PII): `ship.map.get` ship.ts:741; `bounties.get` bounties.ts:810;
`proposals.list|getById|getByCategory` proposals.ts:44,87,225; `userProfiles.list` auth.ts:129;
`forum.postsByBioregion`:805; `features.list`:14; `agreements.list`:12; `economicSuggestions.list`:10;
`roles.list`:50; `geo.bioregions.list`:10.

EXCLUDED — verified gated: `ship.concierge.getSession`:1525 / `.generate`:1445 (assertConciergeAccess,
ship.ts:140); `shipGiveaway.verify|tag|bonus|stats` (emailed verifyToken + projected entrantState,
ship-giveaway.ts:103); `ship.map.list`:691 (anon CREW_ONLY_SOURCES exclusion);
`campaigns.getContributions`:1138 / `getActivity`:1143; `forum.userProfile`:764, `postById`:253,
`replies`:280, `getTaggedPosts`:320, `posts`:151; `applications.publicDetail`:540 / `mapData`:582 /
`search`:520 / `orgClaims.search`:720; `marketplace.list` community.ts:14; `needsOffers.list`:40;
`questCrews.quests`:30; `churchDonations.getDonationStatus`:120; `recordings.list`:15 /
`getPublic`:42 / `byEventId`:70; `blog.getPublished` knowledge.ts:414.

Structural notes:
1. `getUsersByIds` (server/db.ts:173), `getPlayerProfilesByUserIds` (server/db/playerProfiles.ts:53),
   `getUserById` (db.ts:126), `getUserProfile` (db.ts:2430), `getPlayerProfileByUserId`
   (playerProfiles.ts:40) all return whole rows. Every current public caller projects, but one
   `...spread` reintroduces `email`/`baseWalletAddress`/`walletAddress`/`locationLat`/`locationLng`
   — add projected public variants.
2. `events.checkinToken` is an abuse path, not just disclosure: read it from `events.list`, then
   `events.checkin` (events.ts:902) with any email writes `event_attendance` and mints a
   `regen_token_ledger` credit. Rotate all tokens after the fix.
3. `logActivityEvent` (server/game/index.ts:170) and its caller game.ts:235 pass visibility
   `"admin_only"`, not in the schema enum `["public","community","admin"]` (drizzle/schema.ts:3392);
   `activityFeed.list` filters `visibility != 'admin'`, so those rows survive and abuse-flag reasons
   go public.
