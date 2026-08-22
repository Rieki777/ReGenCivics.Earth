# Amora Public Copy Census — DRAFT for proofreading

Read at `origin/main` (58e8f03), 2026-08-21. Repo: `C:/Users/taren/Desktop/Amora/game-amora`.
`grounds-v0.html` refs are line numbers in `docs/prototypes/grounds-v0.html`; client refs are `client/src/...`.

**Flag legend**
| Flag | Meaning |
|---|---|
| HEARTS | Retired brand: public "Hearts" (token renamed Gratitude) |
| SEAT | "seat" used publicly (seats→Roles rename is ruled) |
| VOCAB | Internal vocabulary leaking (resolver/guess/pool/creator, doc names, engine words) |
| SEED | Example/seed/sample copy visible on a real surface |
| JARGON | Assumes knowledge a visitor lacks |
| NAME | Inconsistent name for the same thing across surfaces |

---

# PART 1 — THE LIVING MAP (docs/prototypes/grounds-v0.html)

Ordered as a visitor meets them: intro → Maia's welcome → crown bar → chrome → hover/panel → doors → walks.

## 1.1 Intro card (first thing a visitor sees)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Intro h1 | Amora | :1093 | |
| Intro sub | a living village · osa, costa rica | :1094 | |
| Intro line | generated from AMORA MASTER PLAN V7 | :1095 | VOCAB — internal document name shown to every visitor |
| Intro line | 9°13′55″N · 83°50′04″W · the hills above playa dominicalito | :1096 | |
| Enter button | Enter the Land | :1097 | |

## 1.2 Maia's welcome (first words spoken)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Welcome line | Welcome to the living map of **Amora**. Everything you see traces to something true: a funded build, a claimed quest, a filled seat. Hover anything; click any building to open its door. Want the short walk? | :6843 | SEAT · SEED — "everything traces to something true" while quests/threads/vitals below are sample data |
| Follow-up (9s) | Whenever you're ready: take the tour, or press **Space** to see what needs hands. | :6844 | |
| Tour opener | Come, the short walk. You can wander off any time; the land doesn't mind. | :3690 | |
| Signed-out tap | That one is kept against your name, so it needs a name. Sign in and tap it again; nothing is lost. | :2538 | |

## 1.3 Crown vitals bar & moon

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Vital: People | People · 24 · 18 active this cycle · src "Stages & Roles" | :1108 | SEED — sample number presented as live |
| Vital: Food | Food · 62kg · harvest this week · src "Village Health" | :1109 | SEED |
| Vital: Water | Water · 96 · 4 springs · healthy | :1110 | SEED |
| Vital: Canopy | Canopy · 76% · 93.1 ha forest held | :1111 | SEED |
| Vital: Hearts | Hearts · 132 · gratitude this cycle · src "Gratitude" | :1112 | HEARTS · SEED |
| Moon chip | 🌔 waxing gibbous · cycle closes in 6 days | :1113, tip :3113 | SEED — hardcoded moon phase |
| Vital tooltip (dynamic) | "{how} · {src}" e.g. "reads the Gratitude ledger · module sample" | :3112, :5906 | VOCAB — "module sample" is engine-speak |
| Hearts drop-down | **132 ♥** · gratitude this cycle / reads the Gratitude ledger / ♥ Send gratitude ↗ | :5929-5930 | HEARTS · SEED |
| Vitals name map | People, Food, Water, Canopy, **Hearts**, The Moon | :5933 | HEARTS |
| Moon drop-down | the lunar cycle closes the books: gratitude settles, stewards are thanked, the pulse resets | :5931-5932 | JARGON — "closes the books" ledger idea never explained to a visitor |
| Canopy fallback | no forest drawn yet. Draw the zones and this counts itself | :5904 | VOCAB — build-mode instruction shown in a public tooltip path |

## 1.4 Top chrome: layers, theme, map selector, dock

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Layer buttons | Now / Vision / Org / Flows | :858 | VOCAB — "Org" is org-chart shorthand; circles lens is called "Circles" elsewhere (NAME) |
| Theme panel h4 | Map themes · your land, your language | :863 | |
| Theme describe field | placeholder "e.g. high-desert mesa, adobe & sage" · button "Weave it" | :884-885 | |
| Paint dials note | brush 0 = raw satellite · palette 0 = filtered satellite, no invented colour. The paint is only paint; nothing on the land moves. | :874 | |
| Map selector | title "what kind of map do you want to see?" · 🏞 Living Map · ◎ Circles | :886-888 | |
| Get Involved button | ☰ Get Involved | :889 | |
| Loom button | ⧉ The Loom · title "every connection, one snapshot (L)" | :890 | VOCAB — "The Loom" unexplained at first contact |
| Dock tip: wallet | The Exchange. One ledger, every token; Hearts are thanks, never a wage. · /wallet | :892 | HEARTS · JARGON · NAME — site page is "Tokens" |
| Dock tip: stay | Stays. Book a room; work-exchange quests extend your stay. · /stay | :893 | |
| Dock tip: housing | Housing. Lots in the hamlets, the waitlist, the land-share path. · /housing | :894 | JARGON — "land-share path" |
| Dock tip: library | Material Library. Borrow with a deposit, wear quoted up front. · /library | :895 | JARGON — "wear quoted up front" |
| Dock tip: journeys | Journeys. Walk a path on the land, visitor to resident. | :896 | |
| Dock tip: events | Events. The lanterns burn brighter as the day comes near. | :897 | NAME — site page is "What is on" / gate calls it "Village Calendar" |
| Dock tip: admin | Make this map yours. Theme, accent, labels, mist. · /admin?tab=setup | :898 | |
| Mobile bar | map · ask maia · help · more | :901-904 | |
| Minimap label | Amora · 9.232°N 83.834°W · Costa Rica | :987 | |
| Attention button | ⚑ What needs hands (badge "9") | :990 | SEED — badge count fed by sample quests/seats |
| Exit toast | ⏏ On the site, this returns you to the village menu. | :6731 | |

## 1.5 Circles lens header

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Header | ◎ The Circles | :910 | |
| Sub | the same village, drawn as its circles. Click any node to walk to its door · scroll zooms, drag pans · open seats pulse as open calls | :911 | SEAT |
| Lens toast | ◎ The Circles. The same village as an organism; click any node to walk to its door. | :5813 | |
| Lens toast (back) | 🏞 The Living Map. The land itself. | :5813 | |

## 1.6 Hover card & place panel (every building)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Hover circle line | "{Circle} circle" or fallback "needs a steward" | :3412 | |
| State labels | Blueprint · in the Vision / Gathering the pool / Under construction / Alive / Thriving / Resting | :1304 | VOCAB — "in the Vision", "pool" assume the funding vocabulary |
| Hover counts | ⚑ N quest(s) · ⛨ N seat(s) open | :3413 | SEAT |
| Hover hint | click to open the door | :3417 | |
| Panel head sub | "{Circle} circle · {state} · pool NN%" | :3432-3433 | VOCAB |
| Panel tabs | Overview · Quests here · Seats here · Enter → | :3435 | SEAT |
| Role-line fallback | A new organ, still finding its function in the body of the village. | :3451 | |
| Panel provenance line | {District} · {phase} · AMORA MASTER PLAN V7 | :3452 | VOCAB — internal doc name on every place card |
| Lots line | ⌂ N of M lots spoken for · N open · reserve through the door below | :3453 | |
| Counts line | ⚑ N quests · ⛨ N open seats · 💬 N conversation(s) | :3456 | SEAT |
| Threads head | what people are saying here | :3458 | |
| Vitals head | vitals at this address · sample data | :3461 | SEED — labeled, good |
| Vitals empty | No live readings here yet. Vitals arrive from real logs when the village pulse plugs in. | :3462 | VOCAB — "village pulse plugs in" is roadmap-speak |
| Metabolism head | metabolism · NN% of inputs on-land | :3464 | JARGON |
| Import chip | imported ⚠ / off-land | :3459 | JARGON |
| Import warning | ⚠ imported inputs are quests waiting to be written. | :3470 | JARGON |
| Flows pointer | drawn live on the **Flows** lens, top right | :3471 | |
| Flows empty | No flows declared yet. In build mode you can say what comes in and what goes out. | :3471 | VOCAB — "build mode" is founder vocabulary shown to visitors |
| Blueprint note | This one lives in the **Vision**. Toggle the Vision layer to see the full masterplan build-out, and what it would take to make it real. | :3474 | |
| Panel footer | last verified 2 days ago · Amora stewards | :3475 | SEED — hardcoded fake freshness on every card |
| Quests tab empty | No open quests here right now. The greenhouse and the food forest are calling, though. | :3480 | SEED — names two specific buildings even on forks/other maps |
| Seat row button | Raise a hand | :3481-3482 | |
| Raise-hand toast | Intro drafted. The {circle} circle will hear from you. (Prototype; the real form lives at /roles.) | :3482 | VOCAB — says "Prototype" to the visitor |
| Seats tab empty | All seats filled here. Beautiful problem. | :3483 | SEAT |
| Doors tab empty | No doors here yet. The founder opens them in build mode. | :3485 | VOCAB |
| Doors tab footer | Every door is also a page. The same room, reachable from the menu or from the land. | :3487 | |
| Claim button | Claim this quest / ✔ Yours · tap to release | :3478 | |
| Claim toast | ⚑ Claimed: "{quest}" at {place}. See you out there. | :3499 | |
| Claim Maia line | Claimed. **{quest}** is yours, and it lives at the {place}. That's the whole point of this map: now go make it true, and I'll light the building up when you do. | :3500 | |
| Release toast | Quest released. It stays open for other hands. | :3501 | |
| First step label | Your first step | :3479 | |

## 1.7 Place cards — the 22 building blurbs (SCENE seed)

All at `:1151-1214`; one row per structure.

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| The Gate | Where Poza Azul Road meets the land. Every story here walked in through this gate. | :1151 | |
| Welcome Lodge | First nights, first meals, first questions. The Welcome Aboard arc begins here. | :1154 | VOCAB — "arc" is design vocabulary |
| Market Pavilion | Farm stand and maker's market at the road. Amora's face to the neighbors. | :1157 | |
| Pond Hamlet | Tiny homes ringed around the ponds. Frogsong is the neighborhood anthem. | :1160 | |
| The Ponds | Rain caught and kept. Tilapia below, herons above, irrigation for the beds beyond. | :1163 | |
| Greenhouse & Gardens | Seed to seedling to supper. The engine room of food sovereignty at Amora. | :1166 | |
| Community Center | The big roof everything else huddles around. Meetings, meals, music, mending. | :1169 | |
| Kitchen & Hearth | Woodsmoke and cardamom. Gratitude is settled here, plate by plate. | :1172 | JARGON — "settled" (ledger sense) unexplained |
| Library & Workshop | Tools, books, looms, lathes. The village's shared hands and memory, mid-raise. | :1175 | |
| Council Fire | Consent by firelight. The circle of circles meets where the sparks rise. | :1178 | |
| Food Forest | Seven layers going in on the east slope. Swales first, canopy last, decades deep. | :1181 | |
| Water Tank | Gravity does the night shift. Spring-fed, village-sized, checked each lunation. | :1184 | JARGON — "lunation" |
| Spring Three | A protection zone holds the forest close here. The water remembers everything. | :1187 | |
| Spring Two | Second of four springs. Its ring of old-growth is the quietest place on the land. | :1190 | |
| Spring Four | Fourth spring, found late, loved fast. The protection ring went in the same week. | :1193 | |
| A Possible Spring | The surveyors marked it 'possible.' The masterplan's own note: springs need a professional to confirm, or to find new ones. A mystery with coordinates. | :1196 | |
| Ridge Hamlet North | First walls rising on the ridge road. The crowdpool is 72% of the way to a roof. | :1199 | VOCAB — "crowdpool" · SEED — 72% is sample |
| Ridge Hamlet South | Staked and dreamed. Pooled resources gather; the forest holds the site till then. | :1202 | |
| The Sanctuary | Hot pools, cold plunge, a dome for stillness. The healing heart, still gathering. | :1205 | |
| Guest Lodge | For the friends of the far future. Sited, sketched, waiting for its season. | :1208 | |
| Healing Garden | Medicinals under managed shade, an apothecary in waiting. | :1211 | |
| Pacific Trailhead | The south door. Someday a path from Pacific Edge Road to the wider web of villages. | :1214 | |
| Kitchen event chip | Full-moon feast · tonight | :1170 | SEED — hardcoded "tonight" |
| Door labels on cards | mixed case: "stay", "quests", "health", "forum", "wallet", "library" vs "Stages & Roles", "Payments & Donations", "Member profiles", "Village Feed", "Crowdpool", "Badges & Skills", "Tools Hub", "Village Network", "Gratitude", "Governance", "Profiles" | :1150-1214 | NAME — same buttons, two capitalization schemes; "wallet" vs "The Exchange" vs site "Tokens" |

## 1.8 Origin stories & role-in-the-organism lines (panel Overview)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Gate origin | The first act on the land was a gate that locks nothing, a frame to walk through, so arrival would always feel like something. | :1349 | SEED — reads as history; is it true? |
| Community origin | Raised in the second dry season by everyone who had ever eaten here. The big roof went up in nine days; the tables have never really been cleared since. | :1350 | SEED — fictional history on a real surface |
| Greenhouse origin | Started as six salvaged windows leaned against a frame. The first tomato was shared out in eighths. | :1351 | SEED |
| Council origin | The fire was lit before any building stood. Every agreement Amora keeps was first spoken in this circle. | :1352 | SEED |
| Ponds origin | Dug where the water already wanted to gather. The herons arrived within a month and acted like landlords. | :1353 | SEED |
| ROLE_LINE (22 lines) | e.g. gate "The membrane, where the outside world becomes a guest and a guest becomes a member." · kitchen "The metabolic heart: food in, gratitude out." · council "The decision organ: consent gathered where the sparks rise." · tank "The water spine: gravity doing the night shift for every tap below." | :1357-1379 | JARGON — organism metaphor ("membrane", "decision organ", "metabolic heart") is lovely but assumes the body-of-the-village frame |

## 1.9 Seed quests & seats (map-native examples)

Quests `:1217-1230` (14), seats `:1233-1240` (8). All render on panels, the wall, the attention banner, and Maia's answers with no "example" label.

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Quest | Plant the dry-season beds · 33 ♥ · Land circle · 2 more hands · Thu | :1217 | SEED · HEARTS-adjacent (♥-denominated) |
| Quest | Drip-line repair, house 4 · 20 ♥ · solo-friendly | :1218 | SEED |
| Quest | Seedling census · 15 ♥ · good first quest | :1219 | SEED |
| Quest | Swale dig on the east slope · 50 ♥ · Saturday · 6 hands, gloves | :1220 | SEED |
| Quest | Mulch run to the ridge · 25 ♥ · truck helps | :1221 | SEED |
| Quest | Full-moon feast prep · 30 ♥ · tonight · 3 more in the kitchen | :1222 | SEED |
| Quest | Start the ferment shelf · 20 ♥ · teach-and-learn | :1223 | SEED |
| Quest | Catalog the tool wall · 25 ♥ · rainy-day quest | :1224 | SEED |
| Quest | Build day: raise the first wall · 60 ♥ · Saturday · 8 hands, steel toes | :1225 | SEED |
| Quest | Pond-edge planting · 25 ♥ · muddy, joyful | :1226 | SEED |
| Quest | Welcome walk, greeting Saturday's visitors · 20 ♥ · friendly faces | :1227 | SEED |
| Quest | Walk the possible spring with the hydrologist · 25 ♥ · one professional, one curious | :1228 | SEED |
| Quest | Bathhouse consent round · 15 ♥ · design voices | :1229 | SEED |
| Quest | Season goals review · 20 ♥ · stewards | :1230 | SEED |
| Seat | Greenhouse Steward · Land · keeper of the growing engine | :1233 | SEAT · SEED |
| Seat | Nursery Keeper · Land · seedlings, grafts, patience | :1234 | SEAT · SEED |
| Seat | Site Guide · Outreach · walk newcomers in well | :1235 | SEAT · SEED |
| Seat | Kitchen Lead · Gathering · feed the village, hold the hearth | :1236 | SEAT · SEED |
| Seat | Librarian of Materials · Learning · every tool findable, every book home | :1237 | SEAT · SEED |
| Seat | Build Crew Lead · Building · walls up, safely, together | :1238 | SEAT · SEED |
| Seat | Water Steward · Land · springs, tank, lines, truth | :1239 | SEAT · SEED |
| Seat | Storyweaver · Arts · the village's voice to the world | :1240 | SEAT · SEED |

## 1.10 Site-imported quests & roles (real site content, resolver-addressed)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Quest | Welcome Ambassador — Help welcome and orient new visitors at community events. · 50-100 ♥ · Per event · Beginner | :1386 | HEARTS-adjacent (♥ rewards) |
| Quest | Garden Helper — Assist with planting, weeding, and harvesting in the community gardens. · 30-60 ♥ | :1387 | |
| Quest | Event Coordinator — Plan and execute community gatherings, potlucks, and celebrations. · 100-200 ♥ | :1388 | |
| Quest | Trail Builder — Help create and maintain walking trails throughout the property. · 60-120 ♥ | :1389 | |
| Quest | Documentation Scribe — Document circle meetings, decisions, and community knowledge. · 40-80 ♥ | :1390 | |
| Quest | Retreat Host — Welcome and support guests at the retreat center. · 80-150 ♥ | :1391 | |
| Address `_why` (loom hover) | a suggestion, unapproved. Drag it on the Loom to make it your word | :1392, :1402 | VOCAB — provenance vocabulary on a hover |
| Roles | Development Board of Directors "fiduciary stewardship of the development" · Community Advisory Council "the community voice beside the board" · Leadership Council "holds the whole between circles" · Core Team "the day-to-day doers" · Architect "design of the built village" · Civil & Sustainability Engineer "infrastructure that gives more than it takes" · Permaculture Designer & Land Steward "the land's own advocate" · Community Organizer "weaves people into place" | :1394-1401 | |

## 1.11 Journeys (data + walk overlay)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| The Welcome Walk | the newcomer tour, as a journey — steps: Welcome to Amora / First meals, first questions / The Ponds / The growing engine / The Village Heart / Walls rising on the ridge / The dream under mist / Where shall we start? | :1404-1407 | |
| Resident Journey | visitor to resident, eleven steps — Attend Community Call / Participate in Events / Explore Housing Options / Become an Amorian / Background Check / Join the Waitlist / Children's Play Day / Resident Right of Passage / Purchase Land Share Agreement / Build Your Home / Move In Celebration! | :1408-1412 | |
| Steward Journey | Steward (Co-Creator) Journey · visitor to co-creator, eight steps — ... Community Training / Become an Amorian / Participate in a Circle / Explore Quests / Co-Creator Right of Passage / Explore & Apply for Roles | :1413-1416 | NAME — "Steward (Co-Creator)" carries both names at once |
| Investor Journey | discovery to commitment — Discover Amora / Request Investor Pack / Schedule Investment Call / Make Your Commitment | :1417-1419 | |
| Walk start (Maia) | **{journey}**. Walking N of M steps (K not yet placed; drag them on the Loom). **Esc** ends the walk. | :5676 | VOCAB — Loom instruction to a visitor mid-walk |
| Walk end (site journeys) | The walk ends here. The full **{journey}** lives at {route}. Two doors, one journey. | :5679 | |
| Walk end (map journeys) | The walk ends here. Wander wherever you like. | :5698, :5703 | |
| Unplaced journey | No steps of this journey have a place yet. The Loom awaits. | :5673 | VOCAB |

## 1.12 Sample forum threads (panel + forum door)

All `:1421-1431`; authors are fictional people. Labeled "sample" only in a code comment, not on screen.

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Thread | Build day debrief: the first wall is UP — Sol · "Photos inside. Sore arms, full hearts." | :1421 | SEED |
| Thread | Full-moon feast: who's bringing what? — Rivka · "Sign-up sheet in the first reply." | :1422 | SEED |
| Thread | Water pressure dips at the ridge taps — Water Steward | :1423 | SEED |
| Thread | Seedling swap Saturday — Nia · "Bring starts, take starts." | :1424 | SEED |
| Thread | Reading circle: Braiding Sweetgrass — Marisol | :1425 | SEED |
| Thread | Proposal: quiet hours around the sanctuary site — Teo | :1426 | SEED |
| Thread | Herons nesting at the upper pond: give them room — Land circle | :1427 | SEED |
| Thread | Trail washout after Tuesday's rain — Kai | :1428 | SEED |
| Thread | Welcome thread: introduce yourself — Maia · "New faces, say hola." | :1429 | SEED — Maia the guide also posts as a person |
| Thread | Compost temperatures are perfect this week — Compost Alchemist · "62°C and steaming." | :1430 | SEED |

## 1.13 Pulse ticker (ambient events, also spoken by Maia)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Pulse | Sol completed "Seedling census" at the Greenhouse · +15 ♥ | :1268 | SEED · HEARTS-adjacent |
| Pulse | Gratitude at the Hearth, "for the storm-drain crew" · ♥×4 | :1269 | SEED |
| Pulse | A new member just walked in through The Gate. Say hola to Rivka | :1270 | SEED — fictional arrival announced as live |
| Pulse | Ridge Hamlet crowdpool reached 72%. First wall Saturday | :1271 | SEED · VOCAB |
| Pulse | 14 kg harvest logged · the beds are singing | :1272 | SEED |
| Pulse | Swale stakes are in on the east slope · dig day is on | :1273 | SEED |

## 1.14 Events & the promise lines

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Event | Full-moon feast · tonight | :5369 | SEED — labeled "· sample" in the door list only |
| Event | Build day · ridge walls · Saturday | :5370 | SEED |
| Event | Seedling swap · Tuesday | :5371 | SEED |
| Event | Council fire · open agenda · next fire | :5372 | SEED |
| Event | Sanctuary site blessing · the full moon after next | :5373 | SEED |
| RSVP promise | Going adds this to your calendar in your profile and signs you up for updates by email. Tap again any time to change your answer. | :2541 | |
| Claim promise | Claiming adds this quest to your profile with how to begin, and signs you up for updates. Release it any time. | :2542 | |
| RSVP toast | ✔ You are going. N going. / RSVP withdrawn. The door stays open. | :5405 | |
| Refusal: anonymous | Sign in and this is yours to keep. | :2513 | |
| Refusal: not-yet | Your account cannot take this one yet. A steward can open it for you. | :2514 | |
| Refusal: full | That one is full. The door stays open for the next. | :2515 | |
| Refusal: closed | That is not open to anyone right now. | :2516 | |
| Refusal: not-here | This one lives on the map for now. It joins the village when a steward brings the scene across. | :2521 | VOCAB — "brings the scene across" is import-pipeline speak |
| Refusal: gone | That is no longer on the board. | :2522 | |
| Refusal: error | That did not save. Try again in a moment. | :2522 | |

## 1.15 Module doors (the dock/door cards — MODULES)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| The Exchange blurb | One ledger, every token. Hearts are gratitude, never a wage. Stay credits and library credits are useful, never votes. | :5423 | HEARTS · JARGON — three tokens + a governance rule in two lines; the founder's own example of copy that doesn't make sense |
| Exchange sample table | ♥ Gratitude 132 ♥ "recognition, the thank-you economy" · 🛏 Stay credits 4 nights "work-exchange quests extend your stay" · 🧰 Library credits 850 "escrowed while you borrow" · footer "sample balances. The live ledger at /wallet keeps the truth" | :5424-5427 | SEED · JARGON — "escrowed" · NAME — /wallet page is titled "Tokens" |
| Stays blurb | Book a room and pay in stay credits or money. Two posted prices, no exchange rate. Low on nights? Work-exchange quests are the way to earn your stay. | :5430 | JARGON — "Two posted prices, no exchange rate" assumes the no-conversion doctrine |
| Stays future-door | bookable when it's built. The door is already on the map; the building will catch up. / any named housing building can open a booking door. Founders flip it in build mode | :5432-5433 | VOCAB — founder instructions in a visitor panel |
| Stays sample rooms | Rooms tonight N of M open · Jungle Casita sleeps 2 · creek side · 155 credits or $80 / night · Ridge Room 120 credits or $65 / night · "sample rooms. Each price is posted in its own token; nothing converts" | :5434-5438 | SEED |
| Housing blurb | Reserve a home in a neighbourhood. Land share agreements, the waitlist, and the Resident Journey all meet here. | :5440 | |
| Housing sample footer | the same numbers the banners wear · Example numbers. The founder has not set this hamlet yet. | :5445, :5365-5366 | SEED — labeled, good |
| Material Library blurb | The lending commons. Add your tools to earn credits, borrow with a deposit, wear quoted up front. Every item carries its own story. | :5447 | JARGON — "wear quoted up front" (2nd occurrence) |
| Library sample | Borrow quote · Makita driver · 10 days · ≈ 84 credits · ≈ 1.4% wear, quoted before you borrow · 112 items sample count · "sample shelf. The Library Steward tends the pool, and disputes become a question, not an argument" | :5448-5450 | SEED · JARGON |
| Forum blurb | The village conversation. Every thread pins to the places it talks about, and the map shows it where it lives. | :5452 | |
| Forum empty | no conversations pinned here yet | :5454 | |
| Quests blurb | Find somewhere to help. Hearts for the work, claimed with consent. | :5456 | HEARTS |
| Quests footer | N quests on the land · propose your own at /propose-quest | :5458 | |
| Journeys blurb | Walk a path. Every journey is a route on the land; steps without a place yet wait on the Loom. | :5461 | VOCAB — Loom again |
| Journeys row | ➹ walk it · "N of M steps placed" | :5462-5464 | |
| Village Health blurb | The numbers behind the map. The same truth the crown banner reads. | :5466 | VOCAB — "crown banner" is internal name for the vitals bar |
| Events blurb | Feasts, build days, ceremonies. Every event is a place and a time on the land, and its lantern burns brighter as the day comes near. | :5469 | |
| Events footer | the Events module keeps these, with the RSVPs and the capacity. Two doors, one room | :5473 | VOCAB — "Two doors, one room" doctrine unexplained |
| Village Settings blurb | Village Settings · Make This Yours — Turn this into your village's own game. Identity, content, and the map's skin in one flow; blank fields keep Amora's answer as the suggestion. | :5474-5475 | |
| Settings sample | Map skin · theme · accent · parchment · labels · icon style · painterly dials · ✂ open the step · "style it once and both the site and the land follow" | :5476-5477 | |

## 1.16 Maia — scripted tour

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Tour 1 (gate) | Welcome to **Amora**: 123 hectares on the Osa Peninsula, drawn live from Master Plan V7. Every story here walked in through this gate, and today that's you. | :3680 | VOCAB — "Master Plan V7" |
| Tour 2 (lodge) | The **Welcome Lodge**. First meals, first questions, and the Welcome Aboard quests, ten small meaningful acts that root you in this community. | :3681 | |
| Tour 3 (ponds) | **The Ponds**. Rain caught and kept. The hamlet around them was Amora's first neighborhood. Herons approve. | :3682 | |
| Tour 4 (greenhouse) | The **Greenhouse**, engine room of food sovereignty. Two seats are open and three quests are waiting; the seedling census is a beautiful first one. | :3683 | SEAT · SEED — hardcoded counts |
| Tour 5 (heart) | The **Village Heart**. Community Center, Kitchen, Library-in-the-raising, and the Council Fire. Click any building and it opens as a door into the game: forum, library, roles, gratitude. | :3684 | |
| Tour 6 (ridge) | Up the ridge, the first hamlet is **72% pooled**. Crowdpooling you can watch become walls. Saturday is a build day; strong backs welcome. | :3685 | VOCAB · SEED |
| Tour 7 (sanctuary) | South, where the land still dreams, the **Sanctuary** is coming. Flip the Vision layer and you'll see the whole masterplan as blueprint ghosts, the fundable gap between today and the dream. | :3686 | |
| Tour 8 (council) | That's the shape of it. My whole job is to get you *off* this map and into the real one. Claim a quest, raise a hand for a seat, come to the feast tonight. Where shall we start? | :3687 | SEAT · SEED — "the feast tonight" |

## 1.17 Maia — concierge answers (typed questions)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Maia identity | Maia · village guide · advisor dock | :1076 | VOCAB — "advisor dock" |
| Quick chips | Take the tour · Where can I help? · What's alive? | :1081-1083 | |
| Input placeholder | Ask Maia. Try 'walk me to the greenhouse'… | :1085 | |
| help/contribute | Here's what needs hands. I'll cycle you through; press **Space** or the banner button for the next one. Claim something small; the land loves small and steady. | :3635 | |
| what happened today | Today so far: Sol finished the seedling census, the Ridge crowdpool crossed **72%**, fourteen kilos came out of the beds, and the Hearth is prepping the **full-moon feast**. It's a good day on the land. | :3636 | SEED — fictional news answered as fact · VOCAB |
| night/moon | Night on the land. Watch the windows: every lit one is a room where the game is real. | :3638 | |
| quest | The Greenhouse holds the friendliest first quests. The **seedling census** is a lovely way in. | :3639 | SEED |
| seat/role/job | Get Involved lists every open seat and quest in one place, the map's honest sibling. Click any row and I'll take you there. | :3640 | SEAT |
| module match | That lives behind the **{module}** door. Opening it now. | :3652 | |
| gratitude | Gratitude flows at /gratitude, where 132 ♥ moved this cycle. It isn't money you spend; it's recognition you give. | :3654 | SEED — hardcoded 132 ♥ |
| quest match | That sounds like **{quest}**: {reward}, and it lives at **{place}**. Claim it and the land will remember your name. | :3661 | |
| walk-to | Walking you to the **{place}** now. | :3665 | |
| seat match | The **{seat}** seat is open, and it sits at the **{place}**. Raise a hand from its card. | :3669 | SEAT |
| no match | Nothing on the land matches that yet. That's a signal, not a dead end: unmatched asks teach the village which role or place is missing, so yours is saved. Meanwhile: the tour, or name any building. | :3672 | |
| structure summary | {Name}: {first sentence of blurb}. Right now: N quests · N open seats. The pool is at **NN%**, and every pledge raises real walls. | :3628-3630 | SEAT · VOCAB |
| icon-style lines | Painted sprites: the village in oils. Families without an approved sprite keep their emblem, honestly. / Isometric everywhere: the village in the round. / Emblems everywhere: the cartographer's view. | :3583 | VOCAB — "families", "approved sprite" are pipeline words |

## 1.18 The Welcome Walk (first-visit overlay scenes)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| w1 Welcome to Amora | Every story here walked in through this gate. Today that's you. This map is the living land, 123 hectares on the Osa Peninsula, drawn from what is real. · hint "drag the land to look around" | :6736-6737 | |
| w2 The Welcome Lodge | First meals, first questions. And our first rule: Hearts are gratitude. We thank each other. We never pay each other to care. · hint "tap the Lodge to open its door" | :6739-6740 | HEARTS — "our first rule" teaches the retired name |
| w3 The Ponds | Rain, caught and kept. The herons arrived within a month and act like landlords. The land breathes. So does the map. · hint "pinch to zoom the world" | :6742-6743 | |
| w4 The Growing Engine | Quests live where the work lives. Small acts, real impact. The ⚑ flags mark where hands are wanted. Find the work you love that the village needs, and it will thank you in Hearts. · hint "tap the leaf-pennant at the door" | :6745-6746 | HEARTS |
| w5 The Village Heart | No bosses here. We are circles, and every circle keeps a home on this land. Tap ◎ any time to see the village as one living organism. | :6748 | |
| w6 Walls Rising | This hamlet is being pooled into existence. Watch the gold ring fill as funding becomes walls. The ✦ lantern burns brighter as build day comes near. | :6750 | |
| w7 Where the Land Still Dreams | The Sanctuary is coming. Everything on this map traces to something true: a funded build, a claimed quest, a filled seat. Delete the map and no truth dies. | :6752 | SEAT |
| w8 Where Shall We Start? | The whole point of this map is to get you off it and into the real one. Pick a door. | :6754 | |

## 1.19 Lens narrations & theme toasts

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Org lens toast | Org lens: circle colors over the land / Org lens off | :3537 | VOCAB — "Org lens" vs "The Circles" (NAME) |
| Flows toast | Flows lens on. Every kind of moving thing wears its own mark: a droplet for water, a bowl for a cooked meal, a leaf for compost. / Flows lens off | :3540 | |
| Flows Maia | The **Flows lens**: the village as one body. Spring to tank to beds; garden to kitchen; kitchen back to soil as compost. The dashed falls are **imports**, and every one is a quest waiting to be written. Close the loop and the map will show it. | :3542 | JARGON — "dashed falls", "close the loop" |
| Vision Maia | This is the **Vision**, the whole masterplan at full build-out. The blue ghosts are the gap between today and the dream, and every one of them is fundable and questable. The southern dream-lands? Just the future, waiting for hands. | :3544 | VOCAB — "questable" |
| Theme apply | Theme: **{label}**. Same land, same truth, new language. Every emblem, ring, and crown just re-inked itself. | :3570 | VOCAB — "crown" |
| Terrain toasts | Satellite. Your actual land, graded into the theme. / Painted. Your satellite in brushstrokes; nothing moves, only the paint. / Vector floor. The drawn land every village gets on day one. | :3576-3578 | VOCAB — "Vector floor", "day one" fork-speak |
| Custom palette | Custom palette applied. Surface, ring, and accent are yours; I tuned the rest to match. Upload a full brand kit on the site and the whole map wears it. | :3585-3587 | |
| Theme-from-words | I read "{words}" and wove a palette from it. Same words, same colors, every time. The full art direction arrives with the platform build; this weave is the honest floor. | :3589-3590 | VOCAB — "the platform build", "honest floor" |

## 1.20 Get Involved wall & attention banner

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Wall header | Get Involved · find somewhere to help | :946 | |
| Wall sections | stranded outside the line / needs a steward / open seats / open quests | :3556-3562 | SEAT · VOCAB — "stranded outside the line" is geometry-engine speak |
| Stranded row | outside the property line. Move it or redraw the line; nothing is removed for you | :3557 | VOCAB — founder instruction on a public wall |
| Unowned row | no circle holds this place yet | :3559 | |
| Quest row fallback | Quest Board · not yet placed | :3563 | VOCAB — "Quest Board" appears nowhere else on the site |
| Attention: seat | ⛨ Seat open: {name} — {circle} circle needs a steady hand. {note}. | :3594 | SEAT |
| Attention: quest | ⚑ {quest} — {reward} · {need}. Real hands, real soil. | :3595 | |
| Attention empty | Nothing needs hands right now. A beautiful problem. | :3600 | |
| Room-for-work toast | ⚑ {place} has room for work. Write it and it lands here. | :2675 | |

## 1.21 The Loom (public panel; the amber "guess" vocabulary)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Header | ⧉ The Loom · every thread between work and place. Drag a ◉ grip onto a place at left, then Save | :948-950 | VOCAB |
| Filter chips | ⚑ quests · ⛨ roles · 💬 threads · journeys | :951-955 | NAME — chip says "roles" while the rest of the map says "seats" |
| Provenance chips | creator (title "your own pick. Law.") · guesses (title "a guess with a label. Always yours to move.") · pool (title "not yet placed. Waits at the Quest Board.") | :956-958 | VOCAB — the amber "guess" chip; creator/resolver/pool taxonomy is engine vocabulary |
| Engine button | ⚙ the sorting engine | :960 | VOCAB |
| Save bar | Save rewires · Discard · Save makes it your word. The land remembers every change. | :966-969 | VOCAB — "rewires" |
| Engine explainer | How work finds its home. You always win. The address ladder, applied in order, stopping at the first hit: **1.** your own pick (gold: law, never second-guessed) → **2.** the pledged role's home → **3.** the circle's home → **4.** a match on the words (amber: a guess, always yours to move) → **5.** the Quest Board (gray: unplaced work waits there). … Save a rewire and it becomes your word: remembered, carried in every export, restored when you return. Delete the map and no address dies; every one lives in its own room's records. | :970-980 | VOCAB — a full page of resolver internals, public |
| Loom open toast | The Loom. Gold is your word, amber is a guess, gray waits at the Board. Drag any ◉ grip. | :5321 | VOCAB |
| Guess chip on rows | ◉ {place} · a guess | :5199 | VOCAB |
| Prov chips on rows | creator / guess / pool | :5170 | VOCAB |
| Staged toasts | Staged → {place}. Save makes it your word. / ⧉ N rewires saved. Your word now; the land remembers. / Staged rewires discarded. The Loom returns to what is. | :5267, :5310-5311 | VOCAB |
| Resolver panel | Where does this quest live? · Same words in, same home out. No AI, no dice. Every guess wears a label, and your correction is what sticks. · placeholder "quest title or description. Try “fix the drip lines”" | :1066-1068 | VOCAB |
| Quest created toast | ⚑ Created at {place}. A guess for now; move it any time in the inspect card / ⚑ Created at the Quest Board. Unplaced work waits there. | :4290 | VOCAB — "inspect card" is build-mode furniture |
| Quest address line | ⚑ This quest lives at **{place}** · a guess | :4279 | VOCAB |

## 1.22 Make this map yours (skin panel — reachable from the public dock)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Header | ✂ Make this map yours | :915 | |
| Sub | The map's page of **Make This Yours**. Blank keeps Amora's answer as the suggestion; whatever you set here travels with the map. | :916 | |
| Row labels | land theme · your land, in words · accent · parchment · label size · label style · flow marks · icon style · dream mist · village pulse · map scale · paint brush · paint palette · terrain · zone words · flow types · phase names | :917-940 | |
| Words placeholder | e.g. volcanic coast, mango gold | :918 | |
| Amora's value chips | Amora's value: #e8a13c / Amora's value: #f3e6c8 | :919-920 | |
| Label style options | ribbon · dark plate, parchment letters / tablet · gold plaque, etched | :922 | |
| Flow marks options | a mark for every kind / one golden orb / a coloured dot | :923 | |
| Icon style options | auto · emblems far, painted near / painted sprites / isometric emblems | :924 | |
| Dream mist | soft mist over unbuilt land · "off = clean site map" | :925 | |
| Village pulse | buildings shimmer when their conversations move | :926 | |
| Dials note | painterly brush & palette dials live under the terrain switch; they save into the same skin | :941 | |
| Buttons | Save map skin · Reset to Amora · ✕ | :942-944 | |
| Footer | this panel lives at step 6 of Make This Yours on the site. Style it once and site and land match. | :945 | VOCAB — "step 6" internal flow reference |
| Vocab tips | Click to rename. Your land, your words; every drawn zone follows. / Click to change its name, its colour or its mark. Every flow of this kind follows. / Click to rename. Every surface that names a phase follows; the export keeps the number. | :5999, :6303, :6351 | |
| Flow-in-use tip | N flows still move this way / nothing moves this way | :6319 | |

## 1.23 Session bars (visible to returning visitors)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Restore bar | A previous session's work is saved on this profile. · Restore it · Start fresh | :1040-1042 | |
| Restore toasts | Restored: N buildings, N features, N edits. / Could not restore the saved session. | :5083-5084 | |
| Draft bar | Editing a draft. The live map is unchanged. · Publish to the live map · View as visitor · Discard draft | :1046-1050 | Founder-facing but styled like public chrome |
| Publish card | Publish to the live map · placeholder "What changed, in a few words (optional)" · Not yet · Publish it | :1053-1060 | Founder-facing |
| Live toast | Live. Everyone sees this map now. / **Live since HH:MM.** Version N is the map every visitor sees now. · Undo this | :6621-6624 | Founder-facing |

## 1.24 Build mode (founder-facing — included because "seat"/vocab decisions ripple here)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Build bar | Build mode · the founder's hand · ✎ Draw · ✦ Sprites · ◇ Boundary · ⌖ Address a quest · ✂ Make it yours · ⚿ Public land · ↩ Undo | :949-951 | |
| Build-mode Maia | **Build mode.** Drag any building to its true position, ✕ removes, the palette adds, ↩ undoes. | :3733 | |
| Homes tips | How many homes this hamlet has to offer. Leave it empty and every surface keeps showing its example numbers. / How many are already spoken for, including anyone who spoke for one before the platform existed. Open is worked out from these two and is never typed. | :4751-4752 | |
| Phase tip | Phase says when this place happens. Planned fades the emblem, and with a full pool a Planned place reads as Blueprint, which visitors only see in the Vision. | :4778 | |
| Activity tip | Activity says how busy this place is once the pool is full. steady lights its windows, thriving adds a pulsing ring and people on the ground, quiet takes both away. | :4780 | |
| Pool tip | Pool is how much of the money for this place is already gathered. Under 100% it wears a gold ring showing the percent and reads as gathering under half, under construction above. At 100% the ring goes and activity takes over. | :4782 | |
| Role row tip | Name a role. Every role that could move here is listed below: pick one to move it, or press + to create a new one here. | :4792 | |
| Seat toasts | ⛨ {seat} now lives at {place}. / ⛨ {seat} returned to the {circle} circle's home: {place}. | :4844-4846 | SEAT |
| New seat default | a new seat, waiting for its steward | :4910 | SEAT |
| Staked toast | ⚒ {name} staked. Set it up right here: name, circle, roles, doors, flows. | :3758 | |
| Boundary Maia | **Boundary editor.** Drag the gold corners; click a faint mid-point to add one; right-click a corner to remove it. If a redraw strands a building outside the line, it flags red and lists on the Wall, never removed for you. | :4203 | |
| Draw Maia | **Draw.** Roads, waterways, zones, and footprints. Click points on the land, and the line tells you its length in metres as you go. This is the founder's hand reaching past the buildings to the land itself. | :4103 | |
| Sprites panel | Sprites · founder taste is the gate · Approve ✓ uses the painted sprite in the Painted icon style; unapproved families keep their SVG emblem. ↻ marks a family for a repaint. Repaints run in the paint studio (gen_sprites.py), never in the browser. | :1005-1010 | |
| Vitals hold | Know the real number? Set it here and the map holds your word until you release it. · Hold this number · held by your word / measured from your drawn land / sample reading | :5941-5950 | |

---

# PART 2 — CLIENT PAGES (client/src)

## 2.1 Site shell: browser titles & auth controls

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Page titles | Journey to launch · What we have built · Feedback · Village network · Contribute · Seasonal festivals · Investor journey · Steward journey · Resident journey · Prosperity journey · Love letter · Circles · Quests · Propose a quest · Roles · Forum · Messages · Introductions · Village feed · Village map · **Circles and seats** · **What is on** · Meet your village · Stays · Material library · Badges & skills · Village health · **Tokens** (/tokens AND /wallet) · My profile · Sign in · Choose a password · Set a new password · Game Mechanics · Leaving well · Tools · Module Library · Village settings | App.tsx:77-127 | SEAT (:99) · NAME — map door says "The Exchange", title says "Tokens", route says /wallet; map door "Events", title "What is on" |
| Header auth | Sign In · Sign Out Everywhere · Sign In / Register | Layout.tsx:225, :215/:338, :347 | |
| Footer blurb | (config-driven: `cfg.project.footerBlurb`) | Layout.tsx:391 | |

## 2.2 Home page (/)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Hero badge | Come co-create paradise | Home.tsx:112 | |
| Hero h1 | Co-Become the Most **Beautiful** Village | Home.tsx:122-123 | VOCAB — "Co-Become" is an invented verb a visitor must decode |
| Hero sub | A regenerative village in Costa Rica where all beings **belong** and **thrive**. Find your path to participation. | Home.tsx:132-134 | |
| Hero CTAs | Find Your Path · Read the Co-Creators Guide | Home.tsx:147, :154 | |
| Stages h2 | From First Visit to Home | Home.tsx:182 | |
| Stages sub | Each stage is a chance to get to know each other. You figure out if Amora fits your life; we figure out if you're a good fit for the village. | Home.tsx:185 | |
| Stage steps | Align "Discover our values" · Experience "Visit & participate" · Co-Create "Join our circles" · Integrate "Become a member" · Home "Make it home" | Home.tsx:76-82 | |
| Path badge/h2/sub | What brought you here? · Choose Your Path · Four unique journeys to participate in the Amora community. Each path leads to belonging. | Home.tsx:238, :246, :255 | |
| Card: Investor | Investor · Capital Contributor — Plant capital in a project built to last. Your investment grows the village while community ownership stays intact, returns and values that move in the same direction. | Home.tsx:36-38 | |
| Card: Steward | Village Steward · Co-Creator — Coordinate and execute for the success of the whole village. Join circles, take on roles, and help shape our regenerative community. | Home.tsx:46-48 | |
| Card: Resident | Resident · Co-Creator — Make Amora your home. Explore housing options, join the waitlist, and become part of a loving village where all beings belong. | Home.tsx:56-58 | NAME — both Steward and Resident are subtitled "Co-Creator" |
| Card: Prosperity | Prosperity Creator · Business Builder — Launch or grow your business inside the village. Your work aligns with community values, and you share in what you build. | Home.tsx:66-68 | |
| Card CTA | Begin your journey | Home.tsx:306 | |
| Personas h2/sub | Who Comes to Amora? · Amora attracts people who are done half-living. Here are some of the souls who find their way here. | Home.tsx:337, :346-347 | |
| Persona cards (6) | Digital Nomad Couple "We want roots without walls." · Worldschooling Family "Our kids deserve a village." · Retiree & Snowbird "Finally, a second chapter worth living." · Longevity Seeker "I want to live well, not just long." · Remote Exec & Founder "I built the life. Now I want meaning." · Costa Rican & LatAm Professional "I want to build something here." (+ body paragraphs) | Home.tsx:352-400 | Persona bodies use hyphens-as-dashes: "purpose as medicine-building a life", "to matter-contributing capital" read as typos (:381, :389) |
| Persona CTA | See yourself here? There's a path with your name on it. · Find your path | Home.tsx:429-430, :442 | |
| CTA h2/sub | Ready to Begin Your Journey? · Join our next community call to learn about the basics and ask any questions. It's the perfect first step on any path. | Home.tsx:458, :467-468 | |
| CTA buttons | Join Community Call · View All Events | Home.tsx:484, :492 | NAME — "Events" links offsite to amora.cr while the platform's own events page is "What is on" |

## 2.3 Home-embedded bands

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| BuildProgress | Build Progress · What's Built. What's Coming. · Real-time milestones from the team. Updated as the village comes online. · badges Completed / In Progress · "Completed {date}" | BuildProgress.tsx:48-55, :17, :87 | |
| VillagePulse | Village Pulse · The village is alive | VillagePulse.tsx:46-50 | |
| MapPeek | See the village · Every building traces to something true: a funded build, a claimed quest, a filled seat. Open the map and walk it. · aria "Open the Living Map" | MapPeek.tsx:71-76, :85 | SEAT |
| SeasonBanner | (dynamic: season name + focus + "begins today"/countdown) | SeasonBanner.tsx:18-44 | |

## 2.4 Quests page (/quests)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| H1 | Community Quests | Quests.tsx:188 | |
| Hero sub | Quests are how you contribute to the village and earn {Gratitude}, our way of acknowledging every contribution. Every quest builds relationships, regenerates the land, and grows the community's collective score. | Quests.tsx:191-195 | JARGON — "collective score" is named nowhere else |
| Stats line | N active quests · up to N {Gratitude} available | Quests.tsx:198-204 | |
| Ring 1 | Start here — Open to everyone with a profile. Small enough to finish in an afternoon, and worth doing on its own. | Quests.tsx:42-44 | |
| Ring 2 | The village — The everyday work the village runs on. Pick what fits your gift. | Quests.tsx:47-48 | |
| Ring 3 | Further in — These open as you walk the Path of Growth or step into a role. Each one says what opens it. | Quests.tsx:51-53 | VOCAB — "Path of Growth" unexplained here |
| Your-journey head | Pick up where you left off / A good first quest | Quests.tsx:217 | |
| Status lines | In progress: submit your work when it's done / Submitted, awaiting circle consent | Quests.tsx:239-240 | JARGON — "circle consent" for a newcomer |
| Suggestion sub | A gentle way in. See the first step. | Quests.tsx:265 | |
| Filters | Circle: · Level: · All / Beginner / Intermediate / Advanced · "N quests shown" | Quests.tsx:154, :170, :310, :328 | |
| Show more | Show all N | Quests.tsx:429 | |
| Empty states | The quest board couldn't be loaded just now. Reload to try again. / There are no quests on the board yet. / No quests match those filters. Try a different combination. | Quests.tsx:442-445 | |
| Life signs | Recently completed | Quests.tsx:456 | |

## 2.5 Roles page (/roles)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| H1 | Roles and Circles | Roles.tsx:254 | |
| Hero sub | We organize through sociocratic circles. Each role has an aim, a domain, and a set of accountabilities. Roles sit in the circle, not on the person. | Roles.tsx:257 | JARGON — "sociocratic", "aim/domain/accountabilities" up front |
| Status badges | Filled · **Open Seat** · Forming · Partially Filled | Roles.tsx:59-64 | SEAT |
| Explainers | Circles "Working groups with real authority. Each circle has an aim (what it works toward) and a domain (what it decides on), and links back to the General Coordinating Circle." · Roles "Specific responsibilities inside a circle. One person can hold many roles. If a person leaves, the role stays and gets reassigned." · Consent "Decisions move forward when no one has a reasoned objection that the proposal would cause harm or block the aim. Everyone loving them is not the bar." | Roles.tsx:275-277 | |
| Card headings | Held By · Aim · Domain · Key Accountabilities · Why This Role Matters | Roles.tsx:137-169 | |
| Loading/failed | Loading roles… / The roles list is catching its breath. Please refresh in a moment. | Roles.tsx:287, :291 | |
| How Roles Evolve | A "tension" in sociocracy language is any felt gap between how things are and how they could be. … Roles here are invitations to a specific way of serving the living purpose, not fixed job descriptions. | Roles.tsx:328-331 | |
| CTA | Explore Our Circles | Roles.tsx:343 | |
| Unplaced group | Unplaced seats | Roles.tsx:205 | SEAT |

## 2.6 Circles page (/circles)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| H1 | Our Sociocratic Circles | Circles.tsx:215 | JARGON |
| Hero sub | The team organizes in circles, each with a clear domain, real authority within it, and a double link back to the General Coordinating Circle. Circles collaborate, and we win together. | Circles.tsx:218 | JARGON — "double link" before it's explained |
| CTA | View Roles & Open Seats | Circles.tsx:221 | SEAT |
| Loading/failed | Loading circles… / The circles are catching their breath. Please refresh in a moment. | Circles.tsx:228, :232 | |
| Section heads | The Circles Today "How the team actually organizes right now, while the village is being built." · As the Village Matures "As residents arrive, today's team circles grow into resident-led councils like these: domain-specific circles connected through elected representatives." | Circles.tsx:239-242, :261-264 | |
| Card members line | {names} or "N seats, none held yet" | Circles.tsx:187 | SEAT |
| Card footer | How it works: Each circle has autonomy within its domain and budget, uses consent-based decision-making, and is double-linked to the General Coordinating Circle so information flows both ways. | Circles.tsx:138 | JARGON |
| How Circles Work Together | Each circle has **a domain, a budget, and the authority** … The Finance & Business Circle provides budget stewardship, oversight, and alignment across all circles. / Circles use **consent-based decision-making** … prevents tyranny of the majority. / Every circle is **double-linked** … keep the whole aligned and adaptable. | Circles.tsx:292-298 | |
| CTA 2 | Learn About Roles & Leadership | Circles.tsx:311 | NAME — same button target as "Explore Our Circles"/"View Roles & Open Seats" family, three different labels |

## 2.7 Village Calendar (/events)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| H1 | What is on | Events.tsx:297 | NAME — door says "Events", gate says "Village Calendar", title says "What is on" |
| Hero sub | The village's calendar: twelve months and the moons of the year, side by side, and everything dated in one place. | Events.tsx:298-300 | |
| Moon line | Today is day N of M in Moon K, {name} (example name) | Events.tsx:302-309 | SEED — "(example name)" label, good |
| Gate name | Village Calendar | Events.tsx:180 | NAME |
| RSVP buttons | I'm coming · Maybe · Can't make it | Events.tsx:208 | |
| Status chips | Cancelled · Postponed · example · Full | Events.tsx:232-235, :274 | SEED — "example" chip, good |
| Link labels | Join online · Open | Events.tsx:256, :262 | |
| Error | That did not work | Events.tsx:144-146 | |
| Wheel tip | Tap a month on the outer ring or a moon on the inner ring to open it. | Events.tsx:371-372 | |
| Empty states | Nothing on this day. / Nothing is on the calendar yet. / Loading... | Events.tsx:404, :412, :353 | |

## 2.8 Gratitude Wall (/gratitude)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| H1 | The {Gratitude} Wall | GratitudeWall.tsx:82 | |
| Hero sub | Appreciation, spoken out loud. Every month each member has a budget of gratitude to acknowledge the people building this village. | GratitudeWall.tsx:85-87 | NAME — "Every month" vs the lunar cycle the page's own clock runs on (":154 refills when the lunar cycle turns") |
| Form head | Send gratitude · N / M left this cycle | GratitudeWall.tsx:98-101 | |
| Budget states | Your sending budget unlocks as you progress / We couldn't load your budget, reload to see it | GratitudeWall.tsx:104, :106 | |
| Placeholders | Member's email · What are you thanking them for? | GratitudeWall.tsx:115, :134 | |
| Success | Your appreciation is on the wall. | GratitudeWall.tsx:59 | |
| Spent state | You've given your whole budget this cycle. It refills when the lunar cycle turns. | GratitudeWall.tsx:154 | JARGON — "lunar cycle" unexplained on this page |
| Signed-out | Sign in to send gratitude to a fellow member. | GratitudeWall.tsx:172 | |
| Empty wall | The wall is waiting for its first appreciation. | GratitudeWall.tsx:182 | |

## 2.9 Material Library (/library)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| H1 | Material Library | Library.tsx:73 | |
| Hero sub | Shared tools and goods, borrowed on library credits. Donate what you no longer need and earn the credits to borrow what you do. | Library.tsx:75-77 | |
| Status labels | available · out on loan · retired | Library.tsx:22-26 | |
| Balance line | Your credits: N · (N no-show(s) on record) | Library.tsx:90-92 | |
| Loan actions | Cancel · I returned it | Library.tsx:107, :113 | |
| Notices | Reserved. N credit(s) moved to escrow until settle. / Cancelled. N credit(s) released back to you. | Library.tsx:58-59 | JARGON — "escrow until settle" |
| Item meta | value N · deposit N · from {stage} | Library.tsx:145-146 | JARGON — "from Explorer" (a stage name) with no explanation |
| Borrow tip | Locks N credit(s) in escrow / Not open to you yet | Library.tsx:152 | |
| Empty shelf | The shelves are waiting for their first donation. | Library.tsx:171 | |
| Signed-out | Sign in to borrow. Donations are recorded with a steward. | Library.tsx:174 | |

## 2.10 Tokens (/wallet · /tokens) — the founder's Exchange example

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| H1 | Tokens | Wallet.tsx:95 | NAME — map door: "The Exchange"; route: /wallet; profile section: "Wallet"; nav title: "Tokens" — four names, one thing |
| Hero sub | What you hold, and the village exchange. Recognition is earned, never bought. Only the village's own credit tokens are ever listed here. Your own balances also sit on your profile. | Wallet.tsx:97-100 | JARGON — "Recognition is earned, never bought" assumes the token taxonomy the map's Exchange blurb also fails to teach |
| Purchase notices | Payment received. Your tokens arrive as soon as Stripe confirms (usually seconds). / Checkout cancelled. Nothing was charged. | Wallet.tsx:67-68 | |
| Balances card | Your balances · Loading your balances… · Couldn't load your balances. Retry · Nothing yet. Contribution is where value starts. | Wallet.tsx:115-127 | |
| Exchange card | The exchange · Couldn't load the exchange just now. · Nothing is listed for purchase right now. · price coming soon · out of stock · N in stock · Buy | Wallet.tsx:144-176 | |
| Refusal captions | Card payments aren't connected yet / Buying opens at the member stage | Wallet.tsx:185, :188 | JARGON — "member stage" |
| Signed-out | Sign in to buy. | Wallet.tsx:198 | |
| Swap card | Not everything trades — {token}: {server reason}. | Wallet.tsx:212-217 | |
| Halted | Swapping is paused for {slugs}: {reason}. | Wallet.tsx:224-227 | |
| Receipts | Receipts · #N: quantities · statuses (swapped/paid/disputed/reversed) | Wallet.tsx:235-249 | |
| Hypha card | Hypha holdings — Governance and equity tokens live on your Hypha DHO. This platform shows the door, never moves what's behind it. · Open the Hypha treasury | Wallet.tsx:258-265 | JARGON — "Hypha DHO" unexplained |

## 2.11 Sign in (/login) + members-only gate

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| H1 / sub | Welcome Back · Sign in to your Amora village journey | Login.tsx:53-54 | |
| Fields | Email (you@example.com) · Password (••••••••) | Login.tsx:82-110 | |
| Buttons | Sign In / Signing in... · Forgot your password? · Don't have an account? · Create Account | Login.tsx:124-142 | |
| Gate card | {Module name} — This part of the village opens when you sign in. · Sign in | ModuleGate.tsx:40-46 | |

## 2.12 404 page

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| H1/h2 | 404 · Page Not Found | NotFound.tsx:24-27 | Off-voice — generic template styling (blue button, slate palette) unlike every other page |
| Body | Sorry, the page you are looking for doesn't exist. It may have been moved or deleted. | NotFound.tsx:31-33 | |
| Button | Go Home | NotFound.tsx:42 | |

## 2.13 Power map (/map/circles — "Circles and seats")

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Route title | Circles and seats | App.tsx:99 | SEAT |
| Filter chips | Open seats · My seats · Expiring soon | power/FilterChips.tsx:50-51 | SEAT |
| Breadcrumb bits | open seats · my seats | power/Breadcrumb.tsx:40-41 | SEAT |
| Seat card | N of M seat(s) held · Speaks for {circle} on how it decides. · aria "Show every seat {name} holds" · placeholder "Why this seat calls to you (optional)" | power/HolderCard.tsx:126-182 | SEAT |

## 2.14 Other public "seat" surfaces

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Seat claim card | A seat is recorded under your name / Some seats are recorded under your name · …one links it to you, and the seat keeps everything it already knew. · error "That seat could not be confirmed" | SeatClaimCard.tsx:98-102, :85 | SEAT |
| Community calendar | Seats and slots · Full gatherings you can queue for. The line is age order; a freed seat goes to wh… · You have a seat | calendar/CommunityCalendarCard.tsx:320, :327, :346 | SEAT |
| Calendar label | Seat (seat-term marker) | calendar/calendarTime.ts:264 | SEAT |
| Weekly brief (admin panel text) | …the moon and the season, open seats, new quests… | EventsAdminPanel.tsx:655 | SEAT (admin-facing, note only) |

## 2.15 Retired "Hearts" in the client

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Project history export | "{name}: N received (N hearts + N acknowledgments) from N member(s)" | ProjectHistory.tsx:1225 | HEARTS — page is public ("What we have built") |
| Project history note | Hearts and written acknowledgments are never blended into one number. | ProjectHistory.tsx:1261 | HEARTS |
| Project history table | column headers "Hearts" / "Acks" | ProjectHistory.tsx:1281 | HEARTS |

## 2.16 Standing-examples banners (system copy that labels seed data)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Single | This is a standing example. Nobody here made it. It shows what this module is for, and nothing you do to it takes effect. Publishing your first real {noun} clears them for good. | ExamplesBanner.tsx:376-380 | |
| Plural | These are standing examples. Nobody here made them. They show what this module is for, and nothing… | ExamplesBanner.tsx:393-395 | |
| Refusal chip | (server-worded message rendered verbatim) | ExampleRefusal.tsx:62-70 | |

---

# PART 3 — EMAIL SUBJECTS (server)

| Where | Verbatim copy | Ref | Flag |
|---|---|---|---|
| Proposal intake (admin) | [Amora] New {type} submission from {name} | server/index.ts:5926 | Hardcoded "Amora" — forks inherit it (other subjects use the project name) |
| Proposal receipt | We've received your proposal | server/index.ts:5934 | |
| Password set | Set your password | server/index.ts:6265 | |
| Founder bootstrap | You are the founder admin. Set your password | server/index.ts:6295 | |
| Password reset | Set a new password | server/index.ts:6358, :6447 | |
| Connect request | [{project}] {First} wants to connect about {role} | server/index.ts:8590 | |
| Investor packet | Your Amora Investor Packet | server/index.ts:16222 | Hardcoded "Amora" |
| Investor intake (admin) | [Amora] New investor doc request from {name} | server/index.ts:16230 | Hardcoded "Amora" |
| Reservation intake (admin) | [{project}] Home reservation request from {name} | server/index.ts:16872 | |
| Reservation receipt | We have your reservation request | server/index.ts:16893 | |
| Weekly brief | (rendered subject from renderWeeklyBrief; body lines like "Staying now: …", "This week: N gatherings: …") | server/lib/assistantTemplates.ts:127-264 | |

---

# WORST OFFENDERS (proofread these first)

1. **The Exchange / Tokens / Wallet name tangle** — map dock tip "The Exchange… · /wallet" (grounds:892), door blurb "One ledger, every token. Hearts are gratitude, never a wage…" (grounds:5423), site h1 "Tokens" (Wallet.tsx:95), profile section "Wallet". Four names and a two-line explainer carrying three token types + a governance rule. This is the founder's own reported confusion, confirmed.
2. **Retired "Hearts" still taught as doctrine** — the Welcome Walk literally teaches "our first rule: Hearts are gratitude" (grounds:6739) and "it will thank you in Hearts" (:6745); plus vitals bar (:1112, :5933), dock tip (:892), quest door (:5456), Exchange blurb (:5423), and client ProjectHistory (:1225/:1261/:1281).
3. **"Everything you see traces to something true" vs. wall-to-wall sample data** — Maia's welcome (grounds:6843) and MapPeek (MapPeek.tsx:75) promise truth while the pulse ticker announces fictional people ("Say hola to Rivka", :1270), Maia reports invented news as today's facts (:3636), and every panel says "last verified 2 days ago · Amora stewards" (:3475). The seed content is good demo copy but is unlabeled where the site's own ExamplesBanner standard would label it.
4. **Public "seat" everywhere after the seats→Roles ruling** — ~30 public strings: map tabs "Seats here" (:3435), wall "open seats" (:3560), circles-lens "open seats pulse as open calls" (:911), tour (:3683), Maia (:3640/:3669), Welcome Walk (:6752); client route title "Circles and seats" (App.tsx:99), Roles badge "Open Seat" (Roles.tsx:61), Circles CTA "View Roles & Open Seats" (:221), power map chips, SeatClaimCard, CommunityCalendarCard. Meanwhile the Loom filter already says "roles" (:952) — both vocabularies live on one screen.
5. **The Loom's resolver vocabulary is fully public** — "creator / guesses / pool" chips (:956-958), "a guess, always yours to move", "the sorting engine" (:960), the five-step address ladder (:970-980), "Gold is your word, amber is a guess, gray waits at the Board" (:5321). An ordinary member meets compiler internals dressed as UI.
6. **"AMORA MASTER PLAN V7" on visitor surfaces** — intro card (:1095), tour line 1 (:3680), and every place panel's provenance line (:3452). An internal document name presented untranslated.
7. **"wear quoted up front" and friends** — Material Library blurb (:5447) and dock tip (:895); "escrowed while you borrow" (:5426), "escrow until settle" (Library.tsx:58), "Two posted prices, no exchange rate" (:5430). The lending/economics doctrine is compressed past comprehension.
8. **Events has three public names** — dock "Events" (grounds:897), page h1 "What is on" (Events.tsx:297), module gate "Village Calendar" (Events.tsx:180), title bar "What is on" (App.tsx:100). Also Home's "View All Events" links to the old amora.cr site (Home.tsx:492).
9. **404 page is template-stock** — "Sorry, the page you are looking for doesn't exist. It may have been moved or deleted." + blue "Go Home" button (NotFound.tsx:24-42); the only page with no village voice, and ModuleGate routes real member modules to it for signed-out visitors in some states.
10. **Home hero "Co-Become the Most Beautiful Village"** (Home.tsx:122) — invented verb as the first headline; plus persona bodies whose hyphens read as typos: "purpose as medicine-building a life" (:381), "to matter-contributing capital" (:389); and Quests' "grows the community's collective score" (Quests.tsx:194) — a score named nowhere else.

---

# TOTALS

- Census rows: **416** (several rows bundle related strings — the page-title row alone carries 37 titles, the door-label row ~17 labels — so distinct public strings run **450+**)
- By surface: Living Map artifact **~280 rows** across 24 sections (intro 5, welcome 4, vitals 11, chrome 17, circles lens 4, hover/panel 31, place blurbs 24, origins/role-lines 6, seed quests+seats 22, site-imported 8, journeys 8, threads 10, pulse 6, events+promises 16, module doors 22, tour 8, concierge 17, welcome walk 8, lenses 8, wall 9, loom 13, skin panel 16, session bars 5, build mode 14) · Client **~125 rows** across 16 sections (shell 3, Home 17, bands 4, Quests 12, Roles 10, Circles 9, Calendar 11, Gratitude 9, Library 10, Tokens 11, Sign-in 4, 404 3, power map 4, seat surfaces 4, Hearts leftovers 3, example banners 3) · Emails **11 rows**
- By flag (flag column): HEARTS **14** · SEAT **38** · SEED **74** · VOCAB **52** · JARGON **28** · NAME **16** (rows can carry several flags; the remainder are unflagged/clean)
- Known-live Hearts hits confirmed and extended: grounds :892, :1112, :5423, :5456, :5933, :6739, :6745 (+ Maia :3654 "132 ♥", vitals drop :5929, pulse :1268-1269, ♥-denominated rewards throughout) and client ProjectHistory.tsx :1225/:1261/:1281.
