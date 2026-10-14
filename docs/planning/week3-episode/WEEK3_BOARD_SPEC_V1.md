# Week 3 v1.0: What your project is for (merged design)

> **Status, 2026-10-13 night:** built and shipped from this spec with Rye's decisions of the same evening, which change it in places: 18 stages (a "Why this matters now" clip after "What you came for"), the clean 35-slide deck "PART 2 NEEDS, Week 3 (Season 2)", check-in tiles derived live (no facilitator import), every board staying open, answers in the profile's Submissions and an admin export. `shared/sessionBoard.ts` and `docs/planning/week3-episode/API_CONTRACT.md` are the source of truth where this file differs.

Season 2, Week 3, "Game & Organisation Co-Creation Part 1". Wednesday 2026-10-14, 10:00 to 12:00 PDT, on the live board at `regencivics.earth/season2/week/3`, with Rye sharing the "PART 2 NEEDS" deck. Week 4 (October 21) is Part 2, practical, inside Village OS.

Deck base for every link: `https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.<id>`. Every id below was checked against `scratchpad/slides.md`. If Rye makes the Week 3 copy (section 6.4), the engineer swaps the deck id in one constant and checks three links.

**How this was merged.** The base is the ship-by-Wednesday design: its single `answer` data path, its deploy sequence, its stage list fixed at the first deploy, and its privacy rules for the private card. Grafted from the project-output design: the "All this is for ___" line, seeds as the three heart needs, per-seed "who meets it" cards, the read-aloud moment near the end, the rung meanings, and the exact export body for Village OS. Grafted from the deck-faithful design: the chestnut question, the "Tell us" stage writing into the season feedback store, answers exempt from the per-person note cap, the "+5 min" button, and a fuller walk of the deck's argument. Board copy follows STEERING section 1. Rye is "they" throughout.

Checked against the repo at `origin/main` 17c5027b on 2026-10-13 14:22 PDT (one commit past the research snapshot, touching only the apply page). Latest migration is still 0296. Week 3's board is at version 0, so its stage list can still be set.

---

## 1. Arc

Every economy starts with the human needs it's built to meet, so the episode starts there too. People tap their project first, breathe together, and put their questions and hopes on the wall. Then the room walks the deck's argument in its own order, and after each short teaching every project answers on its own screen:

1. **What it's all for** (slides 1, 2): a society, and a project, is measured by the human needs it meets. Each person writes a private "I feel ___ because I need ___", and each project writes its first line, "All this is for ___".
2. **What your project is for** (slides 4, 5): ten human need cards. Tap every one the project is here to meet, then plant three seeds on the ones at its heart.
3. **How deep, how wide** (slides 6, 7, 12): for each seed, where the project's people are today, where it wants them in three years, and who it's for. Then one number for how much of its people's human needs the project means to meet.
4. **Living ways** (slides 8 to 15): living allies repair themselves. Each project names its chestnut and the beings that could hold a role on its land.
5. **Who meets each need** (slides 19, 23, 28, 40): households, circles in roles, markets, one holder, or play. Each seed gets one.
6. **Who decides** (slides 37, 38): today and where it's headed, and one game, rite or festival that could take the place of a meeting.
7. **Circles and players** (slides 39, 41, 42, 46): the first circles and how many players it takes to start the Game.
8. **From the centre out** (slides 43, 47, 50): which economy holds most of the project's life, and its first rite of passage.
9. **Your project in one breath** (slide 56): each project reads what it's for, and the room sends thanks.
10. **Back to the box** (slide 57): questions answered, one move before Week 4, and feedback that lands on Week 4's welcome.

**Every project leaves with:**
- its human needs named, from the deck's ten, with three seeds planted at its heart;
- for each seed: where its people are today, where it wants them, who it's for, and who will meet it;
- how much of its people's human needs it means to meet ("ten percent is a good neighbour, a hundred percent is a whole world");
- its first line, "All this is for ___";
- one living way to meet a need, and the beings that could help;
- how it decides today and how it wants to decide;
- its first circles, and how many players it needs to start;
- one move before Week 4, and its questions on the wall.

All of it is kept with the project's card on the Week 3 board, linked to its Season 2 application, in Village OS's own keys. In Week 4 it goes into Village OS's needs setup, screens 1 to 4, and seeds screen 5.

---

## 2. Run of show

17 stages, indices 0 to 16 (the facilitator cap is 20). Planned total **120 minutes**. Number keys jump to stages 1 to 9; arrows reach the rest. Three stages are flex (marked F): they give back 11 minutes if the room runs long, and the "+5 min" button covers the rest. The session ends itself when planned minutes run out (section 6.3).

| # | Stage | Kind | Min | Starts | Slides on screen | The main move on the board |
|---|---|---|---|---|---|---|
| 1 | Welcome | `welcome` | 3 | 10:00 | none | Read the agenda, scan the QR |
| 2 | Tap your project | `checkin` | 5 | 10:03 | none | Tap your project, or add it |
| 3 | Drop in | `breath` | 6 | 10:08 | none | Shared breath, one word |
| 4 | What you came for | `prompt` | 5 | 10:14 | none | Questions and one hope |
| 5 | What it's all for | `prompt` | 9 | 10:19 | 1, 2, (3) | Private card, then "All this is for ___" |
| 6 | What your project is for | `needs` (pick) | 12 | 10:28 | 4, 5 | Tap the human needs, plant three seeds |
| 7 | How deep, how wide | `needs` (depth) | 11 | 10:40 | 6, 7, 12 | Today, goal, who it's for, per seed |
| 8 | Living ways | `prompt` | 10 | 10:51 | 8, 10, 13, 14, 15 | Your chestnut, your allies |
| 9 | Who meets each need | `needs` (meet) | 12 | 11:01 | 19, 23, 28, 40 | Who meets each seed |
| 10 | Who decides | `prompt` | 7 | 11:13 | 37, 38 | Decide today, decide next |
| 11 | Circles and players | `prompt` | 8 | 11:20 | 39, 41, 42, 46 | First circles, players to start |
| 12 | From the centre out (F) | `prompt` | 5 | 11:28 | 43, 47, 50 | One economy, one rite |
| 13 | Your project in one breath (F) | `needs` (room) | 8 | 11:33 | 56 | Read your card aloud |
| 14 | Your questions, and next week (F) | `prompt` | 10 | 11:41 | 57 | Questions answered, one move |
| 15 | Tell us | `prompt` | 5 | 11:51 | none | Feedback for Week 4 |
| 16 | Close | `close` | 3 | 11:56 | none | One word as you leave |
| 17 | Get your Village OS | `getvillageos` | 1 | 11:59 | none | Two ways to start a village |

Total: 3+5+6+5+9+12+11+10+12+7+8+5+8+10+5+3+1 = **120**.

**One main move per stage.** Each stage has one main input in bold below. Everything else on that stage is optional, so nobody has to keep up with every field.

**On every `prompt` and `needs` stage:**
- A chip under the title: "For Amora · Change". With no project picked: "Answering for the room. Tap your project to keep these with it." with a "Tap your project" button (it moves only that person's screen; "Back to live" returns them).
- A line under the title: "On screen: slide 6 · slide 7 · slide 12", each a new-tab link (plain numbers if the deck isn't shared).
- A foot line: "Questions any time: type yours here and I'll pick them up." It writes an `ask` row (block `s<index>`), so the question wall grows all session.

Storage legend: `answer[key]` is a `session_board_items` row, kind `answer`, `block` = key, `text` = the option key or the words. "Project" means `projectId` is the card the person tapped at check-in (null when they're here to learn, shown as "From the room"). "Room, anonymous" means no project, no name stored, and the public board shows counts only.

### 2.1 Stage by stage: exact board text, slide links, storage

#### Stage 1. Welcome (`welcome`, 3 min)
No slides (the deck waits on slide 1).
- Title (curriculum): "Game & Organisation Co-Creation Part 1"
- Lede: "Every economy starts with the human needs it's built to meet. Today we start there, with your project. You'll tap your project, name what it's for, and look at who meets each need and who decides. Next week we build it in Village OS."
- We leave with:
  1. "Your project's human needs, with three seeds planted at its heart"
  2. "How deep, and for how many, you mean to meet them"
  3. "The circles, players and way of deciding your Game starts with"
  4. "Your questions answered, or carried into Week 4"
- Existing pieces: the agenda, the year wheel, "Type in with us" with the QR, and "You asked us to cover" (public notes filed under Week 3 from `/season-schedule`).
- Saved: nothing (planned minutes only).

#### Stage 2. Tap your project (`checkin`, 5 min)
No slides. Full text and behaviour in section 3.
- **Main move: tap your project tile.** Saved: the card id in this browser (`session-board:project:3`); every later answer and question carries it as `projectId`. A new project is a `session_board_projects` row on the Week 3 board.

#### Stage 3. Drop in (`breath`, 6 min)
No slides. Existing stage, unchanged: "Drop in and tune in", the shared breath, "Feet on the ground. Feel the land under you, wherever you're joining from."
- **Main move: "One word for how you're arriving".** Saved: `arrive` item, room.

#### Stage 4. What you came for (`prompt`, 5 min)
No slides.
- Lede: "Bring your questions on games and organising. They stay open all session, and I'll answer as many as I can as we go."

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| **`ask`** | "Your questions on games and organisation" · placeholder "Type a question and press Enter" | short text, many | project-tagged when picked | `ask` item, block `s3` |
| `hope` | "What do you want to leave with today, for your project?" · placeholder "One thing you want from today" | short text, up to 2 | project | `answer[hope]` |

Both walls show below, with the project's name on each chip.

#### Stage 5. What it's all for (`prompt`, 9 min)
On screen:
- Slide 1: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_0
- Slide 2: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_9
- Slide 3, only if the badge demo is confirmed live: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_18

Lede: "Gabor Maté measures a society by how well it meets human needs and helps people grow. We can measure our projects the same way."

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| `mate` | "Think of the organisation that takes most of your time: your work, a community, your family. How well does it meet your human needs?" Options: Hardly / A little / Some / Mostly / Fully | single tap | room, anonymous | `answer[mate]`, counts only |
| (private) | "Just for you. Right now, about my project, I feel ___ because I need ___." Hint: "This stays on your screen. Nothing you type here is saved or sent, to us or anyone." Second hint: "Look at what you wrote after 'because I need'. If it names a person, a thing or a plan, that's a strategy. Find the human need underneath it." Tap-to-fill words (from slide 2's Needs Wheel): Connection, Support, Trust, Safety, Respect, Understanding, Ease, Balance, Peace of mind, Freedom, Choice, Purpose, Contribution, Clarity, Play, Celebration | short text | the person's screen only | **nothing, anywhere**: no request, no browser storage, no dictation mic |
| **`purpose`** | "Your project's first line. All this is for ___" · placeholder "twelve families living well on land we heal together" · hint "One line. You'll come back to it near the end." | short text, one (a new one replaces it) | project | `answer[purpose]` |

When the badge demo isn't live, a link sits under the private card: "Practise speaking from human needs: Quest 10, Communication Patterns" (`/community/post/617`).

#### Stage 6. What your project is for (`needs`, step `pick`, 12 min)
On screen:
- Slide 4 (30 seconds): https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_23
- Slide 5: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_32

- Lede: "These are the ten human needs from the deck. Tap every one your project is here to meet, for your people and your land. Then plant three seeds on the ones at its heart. Your economy gets built around these."
- Quote panel: "Not a single human need requires a scarce resource. (Slide 5)"
- Bridge line: "Week 2's housing, food, water and air live inside Vitality. Joy lives in Play. Meaning and purpose live in Significance."

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| **`needs`** | The ten cards (section 4). Tap a card to pick it. | cards, up to 10 | project | `answer[needs]`, text = need id |
| **`top`** | "Plant a seed" on a picked card. Counter: "3 seeds left", "2 seeds left", "1 seed left", "All three planted". A fourth: "Three seeds each. Take one back to move it." | seeds, up to 3 | project | `answer[top]`, text = need id |
| `other` | "A human need that isn't here" · placeholder "Name it in a few words" | short text, up to 3 | project | `answer[other]` |

Room views: "Across the room", one bar per need ("Love · 6 projects · 4 seeds"), and the project's own view ("Amora so far: Love (3 of you), Play (2), Vitality (1)").

#### Stage 7. How deep, how wide (`needs`, step `depth`, 11 min)
On screen:
- Slide 6: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_41
- Slide 7: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_93
- Slide 12: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_102

Lede: "Take your three seeds one at a time. Mark where your people are with it today, where you want them in three years, and who it's for."

One card per seed (this person's seeds; if they planted none, the project's seeds; if the project has none: "Plant up to three seeds on the last stage first" with a "Go back" button).

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| **`g-<id>`** | "Where do you want them in three years?" Deprived / Unmet / Alive / Satisfied / Thriving. The chosen rung's meaning shows under it (section 4) | one tap per seed | project | `answer[g-<id>]`, text = rung id |
| `n-<id>` | "Where are your people with this today?" Same five rungs | one tap per seed | project | `answer[n-<id>]` |
| `b-<id>` | "Who is it for?" A few (10%) / Some (25%) / About half (50%) / Most (75%) / Everyone (100%) · hint "Childcare may be for the families with children. Clean water is for everyone." | one tap per seed | project | `answer[b-<id>]`, text = 10 to 100 |
| **`whole`** | "How much of your people's human needs does your project mean to meet?" A good neighbour (10%) / A real part (25%) / About half (50%) / Most of it (75%) / A whole world (100%) · hint "Ten percent is a good neighbour. A hundred percent is a whole world, and it needs a whole economy behind it." | one tap, once per project | project | `answer[whole]` |
| `pulse-a` | "How's this landing?" Clear / Want to go deeper / Too fast / Lost me | one tap | room, anonymous | `answer[pulse-a]`, counts only |

Room view: "The room's ladder", each seed on the table as a short line from today to goal, in its need's colour.

#### Stage 8. Living ways (`prompt`, 10 min)
On screen:
- Slide 8: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_120
- Slide 10: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_212
- Slide 13: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_288
- Slide 14: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_5_0
- Slide 15: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_294
- Also (if time): slide 9 https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_164 and slide 11 https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_270

Lede: "Every human need can be met by machines or by living allies. Living allies repair themselves, grow and adapt. Most projects use some of each."

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| **`living`** | "What could be the chestnut of your land: a living system that meets one of your seeds and mostly tends itself?" · placeholder "The need, and the living way" | short text, one | project | `answer[living]` |
| `allies` | "Which beings could hold a role on your land?" Nut and fruit trees / Fungi / Bees / Birds / Fish and water life / Beavers / Ducks and geese / Goats and sheep / Chickens / Worms and soil life | cards, up to 4 | project | `answer[allies]` |

#### Stage 9. Who meets each need (`needs`, step `meet`, 12 min)
On screen:
- Slide 19: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_478
- Slide 23: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_919
- Slide 28: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_639
- Slide 40: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1261
- Also (if time): slide 35 https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1016
- Go deeper (a link on the board; Rye keeps these off screen): slide 25 https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_578 and slide 26 https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_620

Lede: "A human need can be met by each household on its own ground, by circles of people in roles, by a market, or by one holder for everyone. Play is a fifth way. Each project mixes its own."

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| **`m-<id>`** | Per seed: "Who will meet this on your land?" Five cards (section 4) | one tap per seed | project | `answer[m-<id>]`, text = way key |
| `want` | "Name one thing your project will offer. Does it meet a human need or a want?" · placeholder "What it is, then need or want" | short text, up to 3 | project | `answer[want]` |
| `pulse-b` | "How's this landing?" Clear / Want to go deeper / Too fast / Lost me | one tap | room, anonymous | `answer[pulse-b]`, counts only |

Tips that open on a tap: "A market" shows "Rule of thumb from slide 40: keep human needs with roles, gifts and households. Markets can carry wants." "One holder for everyone" shows "Slide 39: this works when whoever holds the power acts for everyone's wellbeing."
Room view: "The room leans", seeds per way ("circles 11 · households 5 · play 4 · market 1 · one holder 0").

#### Stage 10. Who decides (`prompt`, 7 min)
On screen:
- Slide 37: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1104
- Slide 38: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1159

Lede: "When each household meets its own core human needs on its own ground, shared decisions come up less often and can take their time."

Options for both decide rows (from slides 37 and 38): A founder or a small board / Money or tokens vote / Circles decide what's theirs / Voice weighted by role / Elders or a wisdom council / Everyone, by consent or consensus / We play it out: rites, festivals, games / Not decided yet

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| **`decide-now`** | "How does your project decide today?" | one tap | project | `answer[decide-now]` |
| **`decide-aim`** | "How do you want to decide?" | one tap | project | `answer[decide-aim]` |
| `play` | "One game, rite or festival that could take the place of a meeting" · placeholder "A planting festival in place of the work-day meeting" | short text, one | project | `answer[play]` |

#### Stage 11. Circles and players (`prompt`, 8 min)
On screen:
- Slide 39: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1224
- Slide 41: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1378
- Slide 42: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1440
- Slide 46: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1612

Lede: "An economy is people coming together to meet each other's human needs. A whole economy needs enough roles, and enough players to fill them."

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| **`circles`** | "Which circles would your project start with? Tap up to four." Food & Fertility / Living Water / Nourishing Breath / Habitats & Material Libraries / Love Cultivation / Trust & Comms / Purpose & Ikigai / Festivals & Rites / Organize & Co-Create | cards, up to 4 | project | `answer[circles]` |
| **`players`** | "We need at least ___ players to start our Game." Under 6 / 6 to 12 / 13 to 30 / 31 to 150 / More than 150 | one tap | project | `answer[players]` |
| `players-now` | "How many are playing now?" Same five | one tap | project | `answer[players-now]` |
| `calls` | "Which circle calls you, and why?" · hint "Your Regenerative Ikigai: what you love creating, what you're good at, what the Renaissance needs, what earns tokens." · link "Your own R-Ikigai: the Co-Creator's Guide" (`/co-creators-guide`) | short text, one | project | `answer[calls]` |

#### Stage 12. From the centre out (`prompt`, 5 min, flex)
On screen:
- Slide 43: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1502
- Slide 47: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1777
- Slide 50: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1849
- Also (if time): slide 44 https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_1533

Lede: "A project grows from love, play and flow at its centre, out through trust, roles and markets. People come deeper in through rites of passage."

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| **`economies`** | "Which economy should hold most of your project's life?" Soul: love and family / Gift: belonging and care / Role: circles and roles / Market: prices and trade | one tap | project | `answer[economies]` |
| `rite` | "Name one rite that brings someone deeper into your project." · placeholder "A first season in a role, then a welcome circle" | short text, one | project | `answer[rite]` |

#### Stage 13. Your project in one breath (`needs`, step `room`, 8 min, flex)
On screen:
- Slide 56 (as the backdrop): https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_2276

Lede: "Each project reads what it's for, in about a minute. The rest of us listen and send thanks in the chat."

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| **`purpose`** (same key as stage 5, defined once) | "Polish your first line. All this is for ___" (prefilled with the current line) | short text, one | project | `answer[purpose]`, replaced |

Room view: one card per project, read from its answers (section 4.6). For example:

> **Toa Hermitage**
> All this is for twelve families living well on land we heal together.
> Seeds: Vitality, Love, Play.
> Vitality: Alive today, Thriving in three years, for everyone, met by a circle of people in roles.
> Love: Unmet today, Satisfied in three years, for everyone, met by festivals, rites and play.
> Play: Alive today, Thriving in three years, for most of us, met by festivals, rites and play.
> Means to meet about half of its people's human needs.
> Circles first: Food & Fertility, Festivals & Rites. Players to start: 6 to 12. Playing now: under 6.

Empty parts read "not chosen yet".

#### Stage 14. Your questions, and next week (`prompt`, 10 min, flex)
On screen:
- Slide 57: https://docs.google.com/presentation/d/1ouuAls8Rz_gR-0v_p5mc1EjdxL9WyrVT7g0JrV__pe4/edit#slide=id.g22bfe7ee262_0_2345

Lede: "Let's take your questions. Then each project names one move before Week 4, when we build all of this in Village OS."

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| (wall) | Every `ask` from the session, newest first, with project names. Facilitators see "Answered" on each | read; facilitator tap | | existing `chosen` flag on the `ask` row |
| `box` | "Which parts of the box are clear for your project today?" Vision, values, image: what's the Game? / Patterns of co-creation / Legal structures / Membranes, circles, roles and quests / Crowd pooling structure / Governance: the ongoing game to create the game | cards, up to 6 | project | `answer[box]` |
| **`move`** | "One move before Week 4" · placeholder "Read our card with our people and change what doesn't fit" | short text, one | project | `answer[move]` |
| `week4` | "What do you want to set up in Village OS next week?" Our human needs / Our circles and roles / Who decides what / Our first quests / Gratitude / How new people come in / Not sure yet | cards, up to 3 | project | `answer[week4]` |

Footer: "Legal structures come in Weeks 10 and 11. Pooling what everyone brings comes in Week 13."

#### Stage 15. Tell us (`prompt`, 5 min)
No slides.
- Lede: "Tell me how today landed. It shapes next week."

| Key | Board text | Input | Scope | Saved as |
|---|---|---|---|---|
| `landed` | "One thing that landed for you today" | short text, up to 2 | room | `answer[landed]`, public on the board |
| (feedback box) | "What do you want to dig into in Week 4?" with a checkbox "Share this with the cohort" (off by default) | long text | | `season_feedback.topic` through the existing `seasonSchedule.sendFeedback`, filed under Week 4 |
| (feedback box) | "Feedback on how I run these sessions" | long text | | `season_feedback.facilitation`, always private to organizers |
| **`useful`** | "How useful was today for your project?" Not yet / A little / Useful / Very / Just what we needed | one tap | room, anonymous | `answer[useful]`, counts only |

Button "Send". After sending: "Thank you. It's filed for Week 4." The box fills `projectName` from the check-in pick and `displayName` from the name kept in this browser.

#### Stage 16. Close (`close`, 3 min)
Existing copy: "One word as you leave. Thank you for bringing your projects to this table." Stats change for Week 3: "Projects checked in · Human needs named · Seeds planted · Questions asked".
- **Main move: one word.** Saved: `leave` item, room.

#### Stage 17. Get your Village OS (`getvillageos`, 1 min)
Existing last page, unchanged (ADR-69).

### 2.2 Clock and flex
- Checkpoints: stage 6 starts by 10:30, stage 9 by 11:03, stage 12 by 11:30, stage 14 by 11:43.
- Behind at a checkpoint: take that stage's "Also" slides out first.
- Flex, in this order: stage 12 drops to 1 minute (slide 50 and the economies tap), stage 13 drops to 4 minutes (30 seconds a project), stage 14 drops to 7 minutes. That gives back 11 minutes.
- Past that, the "+5 min" button in the cues panel adds five minutes to the stage the room is on.

---

## 3. Check-in: tap your project

### 3.1 Before the room arrives (Wednesday 09:15, after the last deploy)
The engineer, signed in as an admin, opens stage 2 and presses **"Bring in Season 2 projects"** (new facilitator procedure `importSeasonProjects`, modeled on `importRegister`, `server/routes/sessionBoard.ts:699-727`). For each Season 2 application in a status whose name is already public (submitted, under review, approved, active), the server:
- skips it if this board already has a card with that `applicationId`;
- links an existing card with the same folded name and no `applicationId`;
- or creates a card `{ name: projectName, applicationId, authorKey: facilitator }`, with the place only where the project page is public (approved or active).

It reads applications and never writes to them. Toast: "9 Season 2 projects brought in, 1 linked."

Then the engineer checks that Week 2's five projects are on the board (Amora, Toa Hermitage, Templeofroots.com, Sand Angel, Mindful Earth Farm) and adds any that has no application by hand with "Add your project". Strays and duplicates get the existing Hide.

### 3.2 What a person sees (signed in or guest, same screen)
- **Title:** "Tap your project"
- **Lede:** "Everything you add today is kept with your project's card, ready for Week 4 and the weeks after. Here with a teammate? Tap the same card."
- **Tiles**, one per visible card: the project name, and the place under it where it's public. The tile this browser picked, or a card this person wrote, is tagged "Yours".
- Above 12 tiles, a filter box: "Find your project".
- **Tap a tile:** "You're with Toa Hermitage." with "Change project" under it, and the existing name field: "Your name (optional). Only the facilitator sees it."
- **"Not on the list? Add your project"**: the existing add form (`AddProject`, `stages.tsx:756-784`) with "Project name", "Where on Earth", "Your name (optional)", and the button "Add it and check in". On success the new card is picked. Hint: "Haven't applied yet? Add it here today, and apply when you're ready at regencivics.earth/apply."
- **"I'm here to learn today"**: the chip reads "Here to learn", with the line "Ask, answer and give feedback as yourself. Tap a project any time to answer for it."
- Footnote: "No account needed. This browser remembers your pick."
- **Facilitators only**, on each card with no application: the existing "Link to an application" select (copied from `stages.tsx:921-926`).

### 3.3 What the system does
- The pick lives in this browser: `session-board:project:3` holds the card id, and `session-board:last-project` holds `{ name, applicationId, cardId, week: 3 }` for next week. Every read and write is wrapped in try/catch; with storage blocked, the pick lasts for the page's life.
- Every answer and question after check-in carries `projectId`. The server accepts any unhidden card on this board. Anyone can answer for any project, the same way anyone could add a pain point to any project in Week 2.
- Someone who changes project mid-session leaves their earlier rows with the first project. The facilitator sees both.
- Guest input stays in the board tables (`session_board_projects`, `session_board_items`), plus the feedback box's existing `season_feedback` store that `/season-schedule` already writes for guests. Nothing writes to `applications`, campaigns or Village OS.

### 3.4 How it stays attached across weeks
- **The card carries the application.** Imported cards have `applicationId` from the start. New cards get it when a facilitator links them with the existing select. That id is the canonical project: its page is `/project/{id}-{slug}` and its follow ref is `a{id}`.
- **The rows record who played for which project.** Each answer row holds the writer's key (`u:<id>` signed in, `k:<browser key>` as a guest) and the card. So Week 4 can find "the project this person answered for in Week 3" from Week 3's rows alone, with no new table.
- **Week 4's check-in** offers "Last week you were with Toa Hermitage. Same today?" from `session-board:last-project`, and later from the server read in section 7.
- **On the project page:** a panel that reads Week 3's answers onto `/project/:key` comes after Week 4 (SHIPPED_LOG already lists it as Next). It shows a card only when one of the project's stewards answered for it or a facilitator confirmed the link. On Wednesday Rye says "kept with your project". "On your project page" waits until that panel ships.

---

## 4. Human needs cards

### 4.1 Vocabulary
- **The cards use the deck's ten human needs**, with slide 5's labels and Village OS's ids and colours (`HUMAN_NEEDS` in Village OS `shared/needs.ts`, ids "never renamed"). Village OS copied this table from slide 5 of this deck, so Week 4 is a paste.
- A new `shared/humanNeeds.ts` in regen-civics holds the ids, labels, expressions, hues, rungs and rung meanings, with a test that pins them to Village OS's literal list (the way `server/site-copy.test.ts` pins `LOCAL_NEEDS`).
- Slide 4's first-pass labels (Self-Expression, Contribution & Community, Stability) stay on the slide. The cards carry slide 5's.
- **Slide 41's eight-spoke wheel is the circles set** on stage 11. The ten say what a project is for. The circles say who meets those human needs. Village OS splits it the same way: `village_needs` holds the purpose, and roles meet it through `need_links`.
- The site's seven (Housing, Food, Water, Air, Joy, Meaning, Purpose) stay as homepage copy. Stage 6's bridge line shows where they live inside the ten.
- **Words:** board copy says "human needs" or "what your project is for" every time. On the site, plain "needs" means crowdpool asks.

### 4.2 The ten cards (exact text)
Each card: a colour stripe on its edge (never the only sign), the label, a plain line, and the deck's words in small print.

| id | Label | Plain line | Small print (slide 5) | Stripe |
|---|---|---|---|---|
| `vitality` | Vitality & Survival Needs | The body's ground: breath, food, water, movement, a roof. | Clean air, organic food, living water, exercise, natural shelter | #009E73 |
| `significance` | Significance | Everyone here matters, and has a way to show it. | Self-expression, meaning, validation, feeling wanted, purpose | #E69F00 |
| `love` | Love | Real connection. Family, chosen or born. | Connection, communication, intimacy, interdependence, authentic community, family | #CC79A7 |
| `growth` | Growth | People keep growing in body, heart, mind and spirit. | Physical, emotional, intellectual and spiritual development | #56B4E9 |
| `contribution` | Contribution | Everyone here gets to give, to care, and to serve what they believe in. | Effectiveness, to give, care, and serve an idea greater than myself | #0072B2 |
| `routine` | Routine | Rhythms you can count on. Ground under your feet. | Consistency, stability, grounding | #946B2D |
| `diversity` | Diversity | Enough variety and challenge to stay awake. | Variety, adventure, challenge, surprise | #8B7DD8 |
| `autonomy` | Autonomy | Freedom to choose, space to be. | Freedom, space, independence | #33BBC5 |
| `play` | Play | Joy, humour and making things for the fun of it. | Joy, humor, passion, creativity | #F0E442 |
| `honesty` | Honesty | People say what's true and show up as themselves. | Authenticity, integrity, presence | #D55E00 |

### 4.3 Pick and plant (stage 6)
- Tap a card: it turns on and reads "Picked" (`aria-pressed`). Tap again: it turns off, and the server takes back this person's own `top`, `n-`, `g-`, `b-` and `m-` rows for that human need.
- On a picked card, "Plant a seed" plants one of three. A planted card moves to the front row and reads "Seed planted". A fourth: "Three seeds each. Take one back to move it." The server enforces three.
- "A human need that isn't here" writes a short note. Week 4 turns each one into a Village OS custom need (`custom:<slug>`) once the founder confirms it.

### 4.4 Depth and breadth (stage 7)
Rungs are the deck's (slide 6) and Village OS's `NEED_DEPTHS`, stored as `deprived`, `unmet`, `alive`, `satisfied`, `thriving`. Under the goal row, the chosen rung's meaning, worded for a project from Village OS's own `rungMeaning`:
- Deprived: "{Need} goes unmet here, and your project isn't taking that on."
- Unmet: "Your project sees {need} is short and hasn't built for it yet."
- Alive: "{Need} is alive here, and nobody can count on it yet."
- Satisfied: "Your people can count on your project for {need}."
- Thriving: "People come here for {need}. It's one of the reasons your project exists."

Breadth stores a whole percent (10, 25, 50, 75, 100), the way `village_needs.breadth_target_pct` does. The whole-project number stores the same stops and maps to Village OS's `needs.totality_target_pct`. Picked needs that never got a seed take Village OS's defaults in Week 4 (Satisfied, for everyone), and Week 4 says so.

### 4.5 Who meets it (stage 9)
Five cards per seed, in the deck's order from slide 38, with the power line from slide 35 or 38 in small print:

| Key | Card | Small print |
|---|---|---|
| `play` | Festivals, rites and play | Play-based co-creation. Love = diversity of games (slide 38) |
| `household` | Each household, on its own ground | Sovereign-based. Power doesn't build up (slide 35) |
| `circle` | A circle of people in roles | Role-based. Role is power (slide 35) |
| `market` | A market | Free market-based. Money is power (slide 35) |
| `holder` | One holder for everyone | Monopoly-based. Status is power (slide 35) |

### 4.6 One answer per project (`projectView`)
Each person answers for their project, so a project can hold several people's answers. One pure function, `projectView(items, projectId)` in `shared/humanNeeds.ts`, unit-tested, turns them into the project's card. Stage 6's project view, stage 13's room view, and Week 4's export all read it:
- A human need is picked for the project when any of its people picked it, shown with a count ("3 of you").
- The project's three seeds are the three needs with the most seeds across its people. A tie goes to the most recent.
- A single-answer row (today, goal, who it's for, who meets it, whole, decide, players, economy) shows the latest answer across its people. When people differ, a line under it says so: "2 of you say Unmet".
- A short-text answer (first line, chestnut, rite, move) shows the latest as the headline, with the others listed under it.
- Week 4 settles any differences inside Village OS, with the project's people together.

### 4.7 What's public and what stays private
- Project-level answers are public on the board, the same as Village OS, which treats what a village is for as "not a secret".
- The room views count projects. No person's name shows on a human needs card. Display names stay facilitator-only, as today.
- Anonymous prompts (`mate`, `pulse-a`, `pulse-b`, `useful`) store no name, and the public read returns only their counts. The row keeps the browser key so a second tap replaces the first.
- The "I feel ___ because I need ___" card never leaves the person's screen: no request, no browser storage, no dictation mic (browser speech recognition can send audio to a third party). Village OS keeps a member's own human needs private in `member_needs` for the same reason.

---

## 5. Feedback moments

| When | Where | What people give | Where it goes | Who sees it |
|---|---|---|---|---|
| Tonight and tomorrow morning | `/season-schedule`, "Help shape the next session" (exists) | What to cover on Wednesday; feedback on facilitation | `season_feedback`, filed under Week 3 | Shared notes show on stage 1 as "You asked us to cover". Private ones reach the organizers' list |
| Stage 2 | Tap your project | Which project, or "here to learn" | This browser, then `projectId` on every row | Tiles public |
| Stage 3 | Drop in | One word | `arrive` item | Everyone |
| Stage 4 | What you came for | Questions; one hope for the day | `ask` rows; `answer[hope]` | Everyone, on the walls |
| Every `prompt` and `needs` stage | Foot line, "Questions any time" | A question as it comes up | `ask` row, block `s<index>` | Everyone. The wall on stage 14 |
| Stage 5 | Maté's measure | How well their main organisation meets their human needs | `answer[mate]`, room, anonymous | Counts only |
| Stage 5 | The private card | I feel ___ because I need ___ | Nowhere | Only the person |
| Stages 7 and 9 | Pulse | Clear / Want to go deeper / Too fast / Lost me | `answer[pulse-a]`, `answer[pulse-b]` | Counts only. Rye glances and adjusts the pace |
| Stage 13 | Your project in one breath | Thanks for each project | The call's chat, read aloud | Everyone |
| Stage 14 | The wall | Rye answers; the facilitator marks "Answered" | `chosen` flag on the `ask` row | Everyone. Unanswered ones open Week 4 |
| Stage 14 | Next week | What to set up in Village OS | `answer[week4]` | Everyone. Rye's Week 4 running order |
| Stage 15 | Tell us | One thing that landed | `answer[landed]` | Everyone |
| Stage 15 | Tell us | What to dig into in Week 4 | `season_feedback.topic` via `seasonSchedule.sendFeedback`. During and after the session the next unstarted session is Week 4, so it files there (`nextSessionWeek`, `shared/seasonSchedule.ts:485`) | Organizers always. With "Share this with the cohort" ticked, it shows on Week 4's welcome as "You asked us to cover", with no new code |
| Stage 15 | Tell us | Feedback on how Rye runs the sessions | `season_feedback.facilitation` | Organizers only |
| Stage 15 | Tell us | How useful today was | `answer[useful]`, room, anonymous | Counts only |
| Stage 16 | Close | One word as you leave | `leave` item | Everyone |
| Until Monday, October 19 | The whole board stays open | Late answers from people who missed a stage | Same rows | Same |

Week 2 kept its feedback on `/season-schedule`. Week 3 brings that same box onto the board, writing to the same table, so the organizers' list and Week 4's welcome need no new reader.

---

## 6. Facilitator notes

These go into each stage's `cues` (the C key opens them on the board).

### 6.1 Before the session
- **Tonight, by 20:00:** decide on the Week 3 deck copy (section 6.4 and question 1). If yes, send the link to the engineer.
- **Tonight:** share `regencivics.earth/season-schedule` in the cohort's channels so people can send questions ahead. Public ones show on the Welcome.
- **Wednesday 08:30:** last deploy. **08:50:** verified. **09:00:** nothing deploys after this (every deploy reloads open board tabs within about 10 minutes).
- **09:15:** the engineer brings in Season 2 projects (section 3.1), adds any missing Week 2 project, hides strays, and closes Week 2's board so old tabs can't write there (it can be reopened any time).
- **09:30:** Rye opens the board signed in (the pill reads "You're facilitating") and reads the cues. Don't move stages: moving past the Welcome starts the session clock, and the first save fixes the stage list by position. If you do click through, open Cues and press "Restart the clocks", then go back to the Welcome.
- **09:58:** put `regencivics.earth/season2/week/3` in the chat. Deck in one window, board in the other.

### 6.2 Stage by stage

| # | What Rye says or does | Slides and timing | Skip or watch for |
|---|---|---|---|
| 1 Welcome | Greet people by name. "Open the board on your own screen and tap your project while we gather." Point to the QR. Read any "You asked us to cover" notes in one breath. | Deck waits on slide 1 | Press Start at 10:00, never earlier |
| 2 Tap your project | Share the board. "Tap your project. Not on the list? Add it, two fields. Here to learn? Tap that." Watch the tiles fill. | No slides. Let the trickle-in happen here | Two cards for one project: hide the stray. A new card with an application: link it with the select |
| 3 Drop in | Long exhale, six rounds. "We meet a few days after the new moon, early in the Design Season. Planting time." Then one word each. | No slides | |
| 4 What you came for | Read the first questions aloud and say where today answers them. "The ones we don't reach go first in stage 14." Ask for one hope per project. | No slides | |
| 5 What it's all for | Slide 1: Maté's two measures of a society, 1.5 minutes; our projects get measured the same way. Slide 2: the "I feel ___ because I need ___" frame and need versus strategy, 2.5 minutes. Then two quiet minutes: "This one stays on your screen. Nothing is saved or sent." Then the first line: "You'll polish it near the end." | 1, 2. Slide 3 only if you confirmed this morning that the DHO badge flow is live; otherwise one sentence pointing to Quest 10 on the board | Don't play the Maté video live. It stays on slide 1 for after |
| 6 What your project is for | Slide 4 for 30 seconds: "Organisations designed from the ground up to meet as many of our needs as possible." Slide 5: the Law of Abundance. "Tap every one you're here to meet, then plant three seeds." Five minutes of tapping. Share "Across the room" and read the most-picked needs and any nobody picked. Name the word: "human needs, so they stay apart from the crowdpool asks on the site." | 4 (0.5 min), 5 (3 min) | Read the bridge line for anyone who was in Week 2 |
| 7 How deep, how wide | Slide 6: depth and breadth; "these maps are for certain not empirically correct." Tell your origin story in two sentences: you looked for the civilization that would meet your family's needs, found it doesn't exist yet, and started making it. A project is a business designed to meet the needs of its own people. Slide 7 for one minute, with respect, crediting the Blackfoot perspective. Slide 12 as the bridge to infinite games. Say the ten percent and hundred percent line before the whole-project question. Glance at the pulse. | 6 (3 min), 7 (1 min), 12 (1.5 min) | Keep slide 7 short |
| 8 Living ways | Slide 8: machines and living allies. Slide 10: corn system and chestnut forest. Slide 13: read the forest story aloud and stop on "Until..." (2.5 minutes). Slide 14: play one clip, "Using Geese to Weed Your Orchard". Slide 15: one line on biomimicry. Land it: "Living creatures repair themselves." | 8 (1.5), 10 (2.5), 13 (2.5), 14 (1.5), 15 (0.5) | Show slide 10 only once its corn line is fixed (6.4). If it isn't: "The point stands. The corn number on this slide is off." Skip 9, 11 and 16 unless there's time. Skip the Benyus video |
| 9 Who meets each need | Slide 19: every economy is a game, and Monopoly is one. Slide 23: access to land, four ways. Slide 28: water, and "there is no market for free water." Ask out loud: "Who wins when this need is met, and who wins when it isn't?" Slide 40: keep human needs out of markets, and let markets carry wants. The board is open from slide 19. Read "the room leans" back. | 19 (2), 23 (1.5), 28 (1.5), 40 (2). Slide 35 for the power lines if there's time | Never show slide 24. Skip 17, 18, 20 to 22, 25 to 27 (25 and 26 are linked as "go deeper"), 29 to 34 and 36. Slides 31 and 32 carry strong health claims on a recorded session |
| 10 Who decides | Slide 37: the ways to decide, and the "Vitally" line. Slide 38: play-based co-creation, "Love = Diversity of Games". "A rite or a festival can take the place of a meeting." | 37 (2.5), 38 (2) | Run it in 6 minutes if behind |
| 11 Circles and players | Slide 39: when each economy works, and "an economy is people coming together to help meet each other's needs." Slide 41: "We need at least ___ players to start the Infinite Game." Slide 42: your own R-Ikigai; say "what earns tokens" for the slide's SEEDS line. Slide 46: cells that overlap can share and remix. | 39 (1.5), 41 (2), 42 (1), 46 (1) | Skip 45 |
| 12 From the centre out (flex) | Slide 43: membranes from tokens to love, play and flow. Slide 47: rites carry people inward, and rights grow with each one. Slide 50: soul, gift, role, market; "what share of our time do we want in each?" Rhyme: the site's own Rite of Passage quests, and Visitor, Friend, Citizen, Steward. | 43, 47, 50 (1.5 each) | Past 11:30: slide 50 and the economies tap only, 1 minute. Slides 43 and 45 say "R-Tokens": say $ReGen if it comes up |
| 13 Your project in one breath (flex) | Switch the share from the deck to the board. Slide 56 can sit behind it: "The map is not the territory." Give each project the floor with the share timer at 1 minute. Thanks go in the chat; read a few aloud. | 56 | More than 8 projects: 30 seconds each |
| 14 Your questions, and next week (flex) | Share the wall. Answer the top questions and tap "Answered" on each. Slide 57: "Today was step 2 of the box, patterns of co-creation. Next week is step 4: membranes, circles, roles and quests, in Village OS." Legal is Weeks 10 and 11. Crowd pooling is Week 13, said in one line. Each project names one move. Read the "set up next week" picks: that's Week 4's agenda. | 57 (1.5) | Slides 58 to 65 stay off screen (Week 13 material). Skip 60, 66, 67 and 68 |
| 15 Tell us | "Tell me how today landed. Tick share if you want your Week 4 topic on next week's welcome." Three quiet minutes. | No slides | |
| 16 Close | One word each. Invite a word of thanks: for someone here, for your land, or for yourself. Read the numbers. "The board stays open until Monday for anyone who missed a stage." Then press End session. | No slides | |
| 17 Get your Village OS | Leave it up as people go. `regencivics.earth/village-os` in the chat. | No slides | |

### 6.3 Running long
- The board ends the session on its own when the planned 120 minutes pass. After that, screens stop following the room and stage 1 turns into the Recap.
- Use the flex order in section 2.2 first.
- Then press **"+5 min"** in the cues panel. It adds five minutes to the stage the room is on, with no trip back to the Welcome.
- Rye reads the clock at each checkpoint in section 2.2.

### 6.4 Deck fixes before sharing
The board's slide links work only if the deck can be opened by link. A shared deck also shows its speaker notes and every slide. The recommendation is a copy named "PART 2 NEEDS, Week 3", which Rye presents from. Google usually keeps slide ids in a copy; the engineer checks three links after swapping the deck id, and regenerates the ids from the copy if any link fails.

**Make these before sharing:**
1. **Keep slides 1 to 57 in their places.** The board's slide numbers depend on it. Delete slides 58 to 68 from the copy: they're Week 13 material (58, 59, 61 to 65), an old event card (60), the dilemma grid (66), old season names (67) and a link out (68). Deleting from the end moves no numbers.
2. **Clear every speaker note.** They hold a swear word (31), a pasted 2023 Telegram message and "Short clip video coming 2023" (11), sentences that stop halfway (5, 41), and notes that belong to other slides (22 carries a food note; 35 carries 36's note).
3. **Slide 10:** "67 Billion pounds of corn" is about ten times low. US corn for grain in 2022 was about 13.7 billion bushels, roughly 770 billion pounds. That also breaks "Total country food production: <1 TRILLION POUNDS". Change the corn line and drop or restate the total. The chestnut figures on the slide (3 to 4 billion trees, about 3,000 pounds each, 9 to 12 trillion pounds) differ from the notes (4 to 5 billion trees, 12 to 15 trillion pounds); pick one set and label it a rough historic estimate.
4. **Slide 24:** remove the callout box that says a PMA owns the land and a DO governs inside it. Whether a PMA fits is an open question with the legal session. Keep the slide (so numbers hold) with its arrows, or replace the box with "Legal structures: Weeks 10 and 11".
5. **Slides 31 and 32:** the health claims are strong (the vaccine lines, "all healthcare needs", the Goldman Sachs overlay), and the Vitality Circle example starts with a leftover "Gene editing -". The session is recorded and the copy is public. Soften 31's claims and remove the leftover prefix, or turn both into a plain "Healthcare" title card so the numbers hold. Rye skips them live either way.
6. **Slide 42:** "What SEEDS WILL PAY YOU FOR" becomes "What earns tokens", the site's own R-Ikigai wording.

**Good to fix if there's time:**
7. **Slide 3:** a bare white placeholder for the DHO badge demo. If the badge isn't confirmed live, mark it "Skip slide" or point it at Quest 10, Communication Patterns.
8. **Slide 4:** its labels (Self-Expression, Contribution & Community, Stability) disagree with slide 5 (Significance, Contribution, Routine). The cards use slide 5. Match slide 4 to slide 5.
9. **Slide 11:** "Bears <300k" today conflicts with the notes, which call 200,000 a historic low. Check the source, or speak to the shape only.
10. **Slide 16:** an exact duplicate of slide 15. Mark it "Skip slide". Deleting it would move every number after it.
11. **Slides 17 and 18:** titles don't match their content ("Stress-Free Birth" shows mostly housing; "Nourishing Childhood" shows a housing festival). Retitle, or keep skipping both.
12. **Slide 20:** 2020 and 2021 Airbnb data and undated homelessness counts. Date them, or keep skipping.
13. **Slides 43 and 45:** "R-Tokens" and "Regen Tokens, Trade Amongst #ReFi" come from before the $ReGen name. Slide 45's text layer also holds placeholder labels "ABC" and "XYZ".
14. **Slide 6:** the text box about businesses for their own people covers the Dalai Lama quote image under it. Cosmetic.
15. **Slide 51:** a long chain list (Antelope, Celo, Eth, Holo, Polkadot, Telos), already trimmed on slide 52. Not shown this week.
16. **Slide 57:** the playlist screenshot is Season 1 from 2022, and its note says legal was covered in Season 1. Season 2 covers legal in Weeks 10 and 11; say it that way live.

**For Week 13, when slides 58 to 65 come back:** slides 62 to 64 have number slips. Row I says "30k + 100k over 222 weeks = 150k" while its hours come to $120k. Row E says 333 weeks in the role and "over 222 weeks" in the total. Slide 64's "Community Hrs/Wk 48" doesn't match its rows, which sum to 69. Roles Filled reads 6 of 12, 6 of 15 and 6 of 144. Slide 67's seasons should read Design, Resource, Build and Rest. The notes on 58, 59 and 61 ask people to "fill out the form in the show notes", which is YouTube-era wording.

---

## 7. Week 4 bridge

Week 3 collects answers in Village OS's own keys, so Week 4 needs no translation. The needs setup's screens 1 to 4 are Week 3 ground, and screens 5 and 6 are Week 4 ground.

### 7.1 What carries, field by field

| Week 3 row | Village OS field in Week 4 | Needs setup screen |
|---|---|---|
| `needs` (need ids) | `village_needs.need_key` (same ids) | 1. What this village is for |
| `top` | `village_needs.sort_order`, seeds first (1 to 3) | 1 |
| `other` | `village_needs.need_key` = `custom:<slug>` with its label, `is_custom = 1`, once the founder confirms | 1 |
| `g-<id>` | `village_needs.depth_target` (picked needs with no seed take the default, Satisfied) | 2. How far, on each |
| `b-<id>` | `village_needs.breadth_target_pct` (default 100) | 3. For how many |
| `whole` | game variable `needs.totality_target_pct` | 4. How much of each person's needs |
| `n-<id>` | No column. Week 4 shows it beside each goal as the gap to design for. Members' own readings come later from their private `member_needs` | 2 |
| `m-<id>` | Drafts for "What meets them": `circle` becomes a seat tagged to the need (`need_links`, `subject_type = role`); `play` an event; `household` a quest or a place; `market` a sink, for wants; `holder` one seat to look at together | 5. What meets them |
| `circles`, `players`, `players-now` | The first circles and how many seats; `needSeatings` then counts roles needed against roles filled per need | 5 and 6 |
| `living`, `allies` | Ideas for quests and places (`need_links` with quest or place) | 5 |
| `purpose` | A draft tagline, and the "what it is for" gap in `VillageSeed.purpose` | identity step |
| `decide-now`, `decide-aim`, `play` | Week 4's "deciding who decides what" and first agreements; the readiness item "The game's governance" | Week 4 agenda |
| `want`, `economies`, `rite` | Week 5 (Game Guide, economic system), Week 6 (growing the village), Weeks 8 and 9 (tokenomics) | later weeks |
| `box` | Where each project stands on the six-step box | Week 4 check-in |
| `move` | Week 4 opens with "Did your move happen?" | Week 4 |
| `week4` | Week 4's running order, by count | Rye's prep |
| `ask` not marked Answered | Week 4's opening questions | Week 4 |
| `season_feedback` topics filed under Week 4 | Week 4's welcome, "You asked us to cover" | automatic |

### 7.2 The export
One shared function, `toVillageOsScope(view)`, reads `projectView` and returns exactly the body Village OS's admin scope write takes (`PUT /api/admin/needs/scope`, `{ needs: [{ needKey, label?, depthTarget?, breadthTargetPct?, note?, sortOrder? }] }`), plus the totality number:

```json
{
  "needs": [
    { "needKey": "vitality", "depthTarget": "thriving", "breadthTargetPct": 100, "sortOrder": 1 },
    { "needKey": "love", "depthTarget": "satisfied", "breadthTargetPct": 100, "sortOrder": 2 },
    { "needKey": "play", "depthTarget": "thriving", "breadthTargetPct": 75, "sortOrder": 3 },
    { "needKey": "growth", "depthTarget": "satisfied", "breadthTargetPct": 100, "sortOrder": 4 }
  ],
  "totalityTargetPct": 50
}
```

Nothing in it is money, a token amount or a gate. Village OS's needs code already treats a need link as a description that gates nothing, and the export keeps that.

### 7.3 What to build between October 15 and 20 (all LATER)
1. **A Week 3 reader:** one project's Week 3 rows by `applicationId`, else by the person's key from section 3.4, else by card name with a facilitator's confirmation.
2. **Week 4's board:** its own design, a check-in that offers "Last week you were with Toa Hermitage. Same today?", and a stage "Your Week 3 answers" with a **"Copy for Village OS"** button that produces the JSON above.
3. **Village OS** (separate repo and session): a "Paste your card from ReGen Civics" step on the needs setup's screen 1. It validates through the existing all-or-nothing scope write, sets `needs.totality_target_pct`, and opens screens 1 to 4 filled in for the founder to confirm. Screens 5 and 6 are then Week 4's live work.
4. **Hosted villages** (accepted Season 2 projects with a `village_os_requests` row): a `needs` block on `VillageSeed` (`shared/villageOsOffer.ts:432-494`), with `CONSENT_DRAFT_LINE` naming the Week 3 card as a source.
5. **The project page panel** in section 3.4.

The Week 4 curriculum line ships Wednesday (section 8, M8), so the Close and the season pages say where Week 4 happens: "Putting the structure into practice in Village OS. Standing up your organisation, writing your first agreements, and deciding who decides what."

---

## 8. Build scope

### 8.1 Shapes (`shared/sessionBoard.ts`)

```ts
export type StageKind = /* existing 11 */ | "checkin" | "prompt" | "needs";

export type SlideRef = { n: number; id: string; also?: boolean; deeper?: boolean };
export type BoardPrompt = {
  key: string;                // /^[a-z0-9-]{1,16}$/, defined once per week, stored in items.block
  title: string;
  hint?: string;
  placeholder?: string;
  mode: "note" | "pick" | "private" | "ask";
  scope: "project" | "room";
  options?: readonly { key: string; label: string; small?: string; tip?: string }[];
  max?: number;               // pick: 1 replaces, N refuses past N. note: 1 replaces, else up to 5
  anonymous?: boolean;        // no name stored; the public read returns counts only
  words?: readonly string[];  // private: tap-to-fill chips, never sent
};
export type BoardStage = {
  /* existing */ kind; name; short; min; line; cues;
  lede?: string;
  slides?: SlideRef[];
  prompts?: (BoardPrompt | { ref: string })[];   // { ref } re-shows a prompt defined on an earlier stage
  step?: "pick" | "depth" | "meet" | "room";     // needs stages only
};
export const ITEM_KINDS = ["arrive", "leave", "pain", "opp", "game", "ask", "answer"] as const;
export function promptsForWeek(week: number): Map<string, BoardPrompt>;
```

The `needs` stages carry generated prompts: `needs` (10 options, up to 10), `top` (up to 3), and for each of the ten ids `n-<id>` and `g-<id>` (rungs, one), `b-<id>` (10/25/50/75/100, one) and `m-<id>` (five ways, one). The longest key, `g-significance`, is 14 characters, inside `block VARCHAR(16)`. `ask` rows take block `s<index>`.

### 8.2 MUST for Wednesday

| # | Piece | Files | Change | Est. | Ships in |
|---|---|---|---|---|---|
| M1 | `WEEK_3` (17 stages with cues, ledes, prompts, slide refs), `boardStages` branch, `boardWelcome(3)` words, deck id constant and `DECK_SHARED` flag; `shared/humanNeeds.ts` (ten needs, hues, rungs, rung meanings, breadth and whole stops, the five ways, the decide options, the nine circles) | `shared/sessionBoard.ts`, `shared/humanNeeds.ts` (new) | config | 1.5 h | Deploy 1 |
| M2 | Slide links in `StageHead` (`stages.tsx:65-74`): "On screen: slide 6 · slide 7", new-tab links, "Also" and "Go deeper" groups; plain numbers when `DECK_SHARED` is false. Linking out needs no CSP change | `stages.tsx` | small code | 0.4 h | Deploy 1 |
| M3 | Server. Kinds `ask` and `answer` in `ITEM_KINDS`, `maxTextFor` (300 each), the client union (`useSessionBoard.ts:258`). `ask` through `addItem`, with an optional `projectId` and block `s<index>`. A new `answer` procedure with its own limit (90 a minute, since a household on one wifi shares a guest limit): the key must be in `promptsForWeek(week)` and not private; a pick must be one of its options; `max` 1 replaces the caller's row on that key and project, and past `max` it refuses with "That's all of yours for this one. Take one back to change it."; the same option twice returns the existing row; room scope forces `projectId` null; anonymous stores no name; the project must be an unhidden card on this board; un-picking a human need takes back the caller's `top`, `n-`, `g-`, `b-` and `m-` rows for it. Answer rows count toward the 2000 per board and skip the 80-notes-per-person cap (each key's `max` bounds them). The public `get` returns anonymous keys as counts only | `shared/sessionBoard.ts`, `server/routes/sessionBoard.ts`, `server/lib/sessionBoard.ts`, `useSessionBoard.ts` | code, no migration | 1.4 h | Deploy 1 |
| M4 | Client `prompt` stage: `PromptBlock` for note, pick, private and ask; the "For Amora · Change" chip and the "Answering for the room" banner; the "Questions any time" foot line; the private field with no mic, no storage and no request. New branches in `SessionBoard.tsx:274-285` (an unknown kind renders Close today) and `WIDE` | `stages.tsx`, `SessionBoard.tsx`, `session-board.css` | code | 1.6 h | Deploy 1 |
| M5 | `checkin` stage: tiles over this board's cards, the filter, the pick in localStorage (try/catch), "Add it and check in" (existing `addProject`, auto-pick on success), "I'm here to learn today", a `useMyProject(week)` hook passed through `StageProps`; facilitator `importSeasonProjects` and its button | `stages.tsx`, `SessionBoard.tsx`, `server/routes/sessionBoard.ts`, `server/lib/sessionBoard.ts` | code | 1.2 h | Deploy 1 |
| M6 | Tell us: the feedback box calling the existing `seasonSchedule.sendFeedback` (no server change), with the share checkbox. "+5 min" in the cues panel (the existing `plan` action on the live stage) | `stages.tsx`, `SessionBoard.tsx` | small code | 0.5 h | Deploy 1 |
| M7 | `needs` stage kind: pick and plant cards, depth rows with rung meanings, meet rows, the room views (across the room, the ladder, the room leans), the project's own view, the stage 13 room card; `projectView(items, projectId)`, pure and unit-tested | `stages.tsx`, `shared/humanNeeds.ts`, `session-board.css` | code | 2.8 h | Deploy 2 |
| M8 | Close stats for Week 3 (today they read Week 2's opportunities and pain points, `stages.tsx:1171-1176`); the facilitator's "Answered" toggle on the wall (existing `curateItem` `chosen`); the Week 4 curriculum line (`shared/season2Curriculum.ts:57-59`); a DOMAIN-LANGUAGE entry for "Human needs (on a board)"; an ADR for prompt stages and answer rows keyed to Village OS ids (re-check the next ADR number on origin/main right before pushing) | `stages.tsx`, `shared/season2Curriculum.ts`, `.ai/docs/` | small code and docs | 0.6 h | Deploy 3 |
| V | Per deploy: tests, `pnpm gate`, `rg` for every new className in the CSS, CI's env-example, fund-claims, migration-number and schema-drift checks, `pnpm test`, `pnpm build`, a local run against the scratch MariaDB on 3307, `/ship`, the BUILD-PLAYBOOK tRPC checklist and `/security-review` for the two new procedures, push, poll the deploy, `gh run list` green, the board at 375 px | | | 1.2 h total | each |

About 11 hours in all, in three deploys.

**Tests to add or change:**
- `shared/sessionBoard.test.ts:78-88`: Week 3 sums to 120; the other weeks stay at 121.
- `:135`: Week 3's `leaveWith[0]` is the new line.
- The em-dash and banned-word sweeps cover ledes, prompts, options, hints and tips.
- Prompt keys are unique per week (a `ref` must point to a defined key), 16 characters or fewer, lowercase. Pick options are non-empty and unique. Slide ids match the deck list. The stage count stays at 21 or fewer.
- `HUMAN_NEEDS` ids, labels, hues and rungs are pinned to Village OS's literal list.
- Every `StageKind` has a component.
- Server: an unknown key is refused; a private key is refused; an option outside the list is refused; `max` 1 replaces; `max` 3 refuses a fourth; room scope drops `projectId`; anonymous keys come back as counts; un-picking cascades; the import skips linked applications and links a same-name card.
- `projectView`: seeds by count then recency; latest-wins rows with the "2 of you" line.
- The private field: a component test asserts no mutation and no storage call.

### 8.3 LATER (after Wednesday)
- `join`: a member mark per person per card, "3 here" counts on tiles, and picks that follow a signed-in person to any device.
- "Yours" pinned for signed-in stewards by the full steward rule (`server/lib/project-steward.ts:85-103`).
- "Welcome back" from the server, and the import carrying unlinked Week 2 and Week 3 cards forward with their `authorKey`.
- "Me too" on questions, and a "For Week 4" mark that copies an unanswered question into `season_feedback`.
- Thanks taps on project cards at stage 13.
- Ten seeds split across soul, gift, role and market (the deck's fuller version of stage 12).
- Custom human needs as their own cards.
- An opt-in, need-only count from the private card, shown at three or more.
- The section 7.3 builds: the Week 3 reader, Week 4's "Your Week 3 answers" with "Copy for Village OS", `toVillageOsScope`, the Village OS paste step, the `VillageSeed` needs block and its consent line, and the project page panel.
- The Recap showing the room's human needs (it reads recordings only today, `server/lib/weekRecap.ts`).
- Week 3 course clips, once an admin maps the recording's spans.
- A grace period before the session ends itself.
- A `projectRef` on board cards, so unlinked projects carry across weeks without leaning on names (a migration, numbered from 0297 or the next free number).

### 8.4 Migration
None. `kind` and `block` are free-text `VARCHAR(16)` and vote `target` is `VARCHAR(32)` (`drizzle/0283_session_boards.sql`). Guest input stays in the `session_board_*` tables and, through an existing procedure, `season_feedback`. Nothing writes to `applications`.

### 8.5 Deploy sequence
The full 17-stage list ships in the first deploy and never changes after it. A stage's kind can change at the same position, because nothing saves Week 3's state until the 09:15 import.

- **14:30 to 21:15:** M1 to M6, committed piece by piece.
- **Deploy 1 by 21:30.** Stages 6, 7, 9 and 13 run as `prompt` kind on their final keys: stage 6 shows `needs` and `top` as chips; stage 7 shows `whole` and the ten `g-<id>` goal rows; stage 9 shows the ten `m-<id>` rows; stage 13 shows `purpose` with the room's lines. If nothing else lands, the session runs on this, and the data is already in its final shape.
- **Go or no-go at 22:30.** If deploy 1 isn't verified, ship Plan B instead and stop.
- **21:30 to 00:15:** M7. **Deploy 2 by 00:30**, switching stages 6, 7, 9 and 13 to `needs`. If it isn't green by 01:00, roll back to deploy 1's kinds and leave it there.
- **Wednesday 07:00 to 08:15:** M8. **Deploy 3 by 08:30**, verified by 08:50 (`pnpm railway:deploys` reaches SUCCESS, or a live build marker if the Railway CLI is logged out; `gh run list` green; the board loads on a phone).
- **09:00:** freeze. **09:15:** the import (section 3.1).
- Test every flow against the local scratch database. Production checks are reads plus the 09:15 import. Nobody types into the production Week 3 board as a test.

**Plan B (config only, plus M2's slide links):** Welcome 5, Drop in 8, Project circle 30 (add your project), Seed the game 50 (the five blocks as the design worksheet: What we play for holds the human needs), Roundtables ahead 18 (one move), Close 8, Get your Village OS 1 = 120. The human needs cards run on the slides and in the chat, and Rye posts `regencivics.earth/season-schedule` for feedback, the way Week 2 did.

---

## 9. Risks and open questions for Rye

### 9.1 Questions (each with a recommendation)
1. **Can the deck be opened by everyone on the board?** The links only work if it can, and a shared deck shows its notes and every slide. *Recommend:* make the Week 3 copy tonight with the six fixes in section 6.4, present from it, and send the link by 20:00. Without it, the board shows slide numbers with no links.
2. **Which human needs go on the cards?** *Recommend:* the deck's ten, with slide 5's labels and Village OS's ids, plus slide 41's eight circles for roles. The site's seven stay on the homepage, and one line on stage 6 shows where they live inside the ten. This makes Week 4 a paste.
3. **Who can tap a project?** *Recommend:* anyone, with no sign-in. Tiles come from Season 2 applications whose names are already public, and you hide strays. On Wednesday say "kept with your project". The project page shows Week 3 answers only once a steward answered for the card or you confirmed the link.
4. **The private "I feel ___ because I need ___" card.** *Recommend:* fully private this week, with no count of any kind. Village OS keeps a member's own human needs private by design.
5. **The slide 3 badge demo and the videos.** *Recommend:* skip the DHO badge demo unless you confirm on Wednesday morning that the flow is live, and point to Quest 10 on the board. Play one clip from slide 14 (geese weeding an orchard). The Maté, Benyus and "Why Are We Inside?" videos stay on their slides for after.
6. **Week 4's curriculum line.** *Recommend:* "Putting the structure into practice in Village OS. Standing up your organisation, writing your first agreements, and deciding who decides what." It ships Wednesday morning unless you change it.
7. **Close Week 2's board at 09:15?** *Recommend:* yes, so old tabs can't write into last week. It reopens with one tap.

### 9.2 Risks handled in this design
- **The session ends itself** at 120 planned minutes. Flex stages, checkpoints and "+5 min" cover it (section 6.3).
- **Stage positions lock after the first save.** The whole list ships in deploy 1, and nobody opens Week 3 as facilitator or types into it until the 09:15 import.
- **Deploys reload open tabs** within about 10 minutes. The last deploy lands by 08:30, and nothing deploys after 09:00.
- **Rate limits on shared wifi.** Guests on one connection share one limit. Answers get their own limit of 90 a minute.
- **The per-person note cap** (80 per board) would trip on a needs stage full of taps. Answer rows skip it, and each key's own limit bounds them.
- **Different answers from one project's people** show as "2 of you say Unmet" and get settled in Week 4.
- **The Recap reads recordings only**, so Week 3's cards won't appear there. The board itself stays up as the week's record.
- **Number keys reach stages 1 to 9 only.** Arrows reach the rest.
- **Hypha:** the board links nothing on Hypha. Any later DHO link goes through the Hypha Bridge (STEERING section 6).
- **Money and legal:** the board says nothing about money. Crowd pooling is a one-line pointer to Week 13, legal structures a pointer to Weeks 10 and 11, and slide 24 stays off screen.
- **Two lanes, two repos:** the Village OS paste step lives in the village-os repo and needs its own session. Workflow agents here write only in this worktree.
