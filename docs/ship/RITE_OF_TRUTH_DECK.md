# The Rite of Truth Deck

The oracle deck drawn on the Saturday rite of the Love Voyage (Sanctuary of Love
season). The crew pulls a card, sits by the fire, and takes turns answering the
prompt. The draw is ceremonial and never scored.

- **Data:** `client/src/data/riteOfTruthCards.ts` (source of truth for titles,
  sections, depths, epigraphs, prompts, image filenames).
- **UI:** `client/src/components/ship/RiteOfTruthDeck.tsx` (the draw mechanic and
  card face), placed inside the Captain's Book at `/ship/voyage#rite-of-truth`.
- **Deep link:** the Saturday "Rite of Truth" card on `/ship/theme` links here, so
  the copy "There are prompt cards in the Captain's Book" is now true.
- **Art:** `client/public/images/ship/rite-cards/card-NN-slug.webp`. Prompts live in
  `RITE_OF_TRUTH_ART_PROMPTS.md` in this folder.

## Draw mechanic

Session-scoped, held in `sessionStorage` under `ship.rite-of-truth.v1`. Within a
session the deck is walked once with no repeats: each draw removes that card, so
33 pulls show the whole deck exactly once, then it reshuffles whole. A new
session (or the "Reshuffle the deck" button) starts a fresh shuffle. Nothing
touches tokens, scoring, or server state.

## The 33 cards

Each card: title, section, depth (Light or Deep), epigraph (the quoted line), and
the prompt (the truth question).

### Keystone

**01. The Fire** (Deep)
> Fire burns up the stories, the maladaptions, the perspectives that no longer serve us. We start and end by the fire.

Name one story or belief you are ready to let burn tonight. Speak it aloud, then release it to the flames.

### Imagine the Pleasures

**02. The Forgotten Pleasure** (Light)
> There's a pleasure in this life we've forgotten how to feel.

Name one pleasure you have forgotten how to feel. Speak it back into being.

**03. Sun-Ripe** (Light)
> Bite into the sunlight, juice exploding ecstasy.

Share a simple sensory pleasure you love, a taste, a warmth, a sound, and why it delights you.

**04. Pleasure as Compass** (Deep)
> Pleasure is our compass, pleasure is the sign.

What is one thing your body knows is true that your mind keeps arguing with?

**05. The Shade You'll Become** (Deep)
> You'll become the shade for seven generations more of children who will play.

What do you want to still be giving long after you are gone? Speak the legacy you are planting.

### Children

**06. Who You Look Up To** (Light)
> Who do the children look up to?

Who did you look up to at twelve, and who looks up to you now? Speak both names.

**07. The Mirror** (Light)
> The children are our clearest mirror.

What has a child taught you that you did not expect?

**08. Present, Not Performing** (Deep)
> They're not broken, they're responding to a world with nothing real to say.

Where in your life are you performing instead of being present? Name the audience you are playing to.

**09. What You'll Refuse to Pass On** (Deep)
> You were also handed a world you didn't choose or dream.

What were you handed that you are still healing from? What will you refuse to pass on?

### Addiction to Addition

**10. Add, Don't Subtract** (Light)
> It's not about subtraction, that's the old way.

What would you add to your life this moon, rather than take away?

**11. What Truly Nourishes** (Light)
> Add what's missing in.

Name one thing you already add to your life that truly nourishes you. Where could you offer yourself more of it?

**12. The Signal** (Deep)
> Every craving is a signal, every urge a cry for help.

Name one thing you reach for to fill the in-between. Say aloud the real need underneath it.

**13. No More Shame** (Deep)
> Shame never healed anyone, judgment never set us free.

Offer yourself one sentence of compassion you have been withholding. Say it out loud.

### Cult to Culture

**14. The Holy Hunger** (Light)
> The hunger was always holy, the longing was always true.

What longing brought you to this fire? Name the hunger honestly. It was always holy.

**15. Books Wide Open** (Light)
> We put the books wide open.

Name one thing you are grateful is out in the open here, nothing hidden.

**16. Where You Stepped Aside** (Deep)
> One voice became THE voice, and the rest of us just stepped aside.

Where have you handed your voice away to someone else's? Name where you would take it back.

**17. What You Leave at the Door** (Deep)
> When you have to leave yourself at the door just to be welcome here.

What part of yourself do you leave at the door to belong? Bring it to the table now.

### We Are The Land

**18. From I to We** (Light)
> From the I, I, I to the WE, WE, WE.

Name one thing you have been carrying as "mine" that could become "ours" with this crew.

**19. Come Here With a Crew** (Light)
> We didn't come here randomly, we came here with a crew.

Who at this fire feels like part of your crew, and what drew you together?

**20. Refined by Fire** (Deep)
> All our suffering wasn't random. It was refining us, preparing us for something great.

Name a hardship that forged you. What did it make you strong enough to do?

**21. Why You Came** (Deep)
> We crossed the veils of amnesia to be here now, we took the sacred vow.

If you chose to be here in these times, what did you come to do? Speak the mission you feel.

### Love-Based Civilization

**22. Shared Needs** (Light)
> We come together to identify all our shared needs and devise a way to meet them all.

Name one need you have been carrying alone that someone here might share. Then ask the table.

**23. Gratitude as Currency** (Light)
> What gratitude might you receive that would leave you jumping for joy?

Speak gratitude to one person at this fire, specific enough that they feel it in their chest.

**24. Provision Without Possession** (Light)
> The pleasures aren't ours alone.

What could you meet more easily by sharing it than by owning it? Name one thing you would pool with this crew.

**25. Belonging** (Light)
> Real community, real land, real purpose.

When did you last feel you truly belonged? What was present then that you could invite back into your days?

**26. Love Multiplies Capacity** (Light)
> In a thriving body with a thriving mind, all other quests become joyful and easeful.

Tell a time love made you more capable than you are alone: stronger, braver, more resourceful. Tell the whole story.

**27. What the Land Would Give You** (Light)
> Extending past our human selves to all of existence.

Which of your needs could the land meet, if you let it: water, medicine, awe, rest? Name one, and how you would receive it.

**28. Love as a Nutrient** (Deep)
> Love is a nutrient. The more we are in love, the more our bodies are nourished.

Name a need alive in you right now: food, rest, safety, touch. How would meeting it with love change the way you meet it?

**29. The Garden Loves You Back** (Deep)
> When you love a garden, it loves you back.

Where do you give love and receive nothing? Where do you receive and give nothing back? Name one relationship you would bring into balance.

**30. Enough** (Deep)
> We built a civilization on scarcity because we believed there would never be enough love.

Where do you still act as if there isn't enough? What becomes possible the moment you trust there is?

**31. Reverence Changes the Yield** (Deep)
> When love is in the hands that harvest, the tree fundamentally knows.

Where would your work bear more fruit if you did it with reverence instead of force? Give one real example.

**32. The Need Under the Anger** (Deep)
> It's not what others do, but the images we create in our heads that produce our anger.

Name someone you have blamed. What need of yours went unmet? Speak the need, not the blame.

**33. One Body** (Deep)
> Healing ourselves, our communities, our bioregions, and our Earth, which are all the same thing.

Name one act of love toward yourself that is also an act of love toward the whole. Commit to it aloud.
