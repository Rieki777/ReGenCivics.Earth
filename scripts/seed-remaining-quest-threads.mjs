// seed-remaining-quest-threads.mjs
// Creates forum posts for Welcome Aboard Quests 2, 4, 8, 9 in the onboarding-quests category
// Run with: DATABASE_URL=... node scripts/seed-remaining-quest-threads.mjs [--dry-run] [--execute]
//
// After running, copy the IDs output below and patch welcomeAboardQuests.ts:
//   Quest 2 forumUrl: /community/post/<id>
//   Quest 4 forumUrl: /community/post/<id>
//   Quest 8 forumUrl: /community/post/<id>
//   Quest 9 forumUrl: /community/post/<id>

import mysql from 'mysql2/promise'

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute')

const ONBOARDING_CATEGORY_SLUG = 'onboarding-quests'
const TEAM_EMAIL = 'team@regencivics.earth'

const QUEST_POSTS = [
  {
    questNumber: 2,
    title: 'Welcome Quest 2: Write Your Regenerative Origin Story',
    body: `The Moment Everything Shifted: Your Origin Story

This is where we collect the stories of how we each found our way here. Every origin story is different. Every one matters.

To complete Quest 2:
1. Write your Regenerative Origin Story below. What woke you up? How did you get here? A paragraph is enough. A page is welcome.
2. Share it on social media and link to your post in your comment here.

When we share our stories, we recognise each other.`,
    seeds: [
      {
        author: 'Amara Diallo',
        handle: '@amara_soilstories',
        body: 'I grew up watching my grandmother tend her garden in Dakar with a kind of attention I did not understand until much later. She never called it regenerative but she was composting before I knew the word. I came to this work after a decade in finance, realising the money was flowing everywhere except toward the land. ReGen Civics is the first place I have seen both things held together. Post: instagram.com/p/example_origin1',
      },
      {
        author: 'Luca Andersson',
        handle: '@luca_regen_north',
        body: 'Mine is embarrassingly simple: I watched a documentary about soil microbes at 2am and could not sleep for three days after. Something just clicked. I started reading everything, quit a comfortable job, and spent two years on a farm in southern Sweden. I still do not know where I am going but I know what direction I am facing. Shared on X: x.com/luca_regen_north/status/example_origin',
      },
      {
        author: 'Fatimah Osei',
        handle: '@fatimah_ecosystems',
        body: 'I came to this through grief, honestly. A river I grew up swimming in ran dry when I was 22. I needed somewhere to put that grief that was not just rage. Regenerative work gave me somewhere to put it that also builds something. That is the whole answer. Post: linkedin.com/posts/example_origin',
      },
    ],
  },
  {
    questNumber: 4,
    title: 'Welcome Quest 4: Connect with Your Bioregion',
    body: `Bioregional Wisdom: What Does Your Land Teach That Others Should Know?

This is our bioregional atlas: a growing map of where ReGen Civics players are rooted and what they are discovering about their home places.

To complete Quest 4:
1. Research your bioregion. (Try watershedproject.org or inaturalist.org as a starting point.)
2. Share three things you discovered and what surprised you in the comments below.
3. Post on social media about your bioregion and link to your post here.

The more we know our places, the better we can tend them.`,
    seeds: [
      {
        author: 'Astrid Bergholm',
        handle: '@astrid_nordmark',
        body: 'I am in the Angermanälven watershed in northern Sweden. A river system I had never thought about even though I drink from it. Discovered that the area has one of Scandinavia\'s last wild salmon runs. And that three centuries ago, this whole hillside was open pasture with 40+ farm families. Now it is mostly spruce monoculture. Shared: instagram.com/p/example7',
      },
      {
        author: 'Emmanuel Kariuki',
        handle: '@emmanuel_mtaro',
        body: 'I live in Nairobi but I learned I am in the Nairobi River watershed. A river so degraded most residents do not know it flows beneath them. Found a local restoration group I am now volunteering with. Three things: I live in the Ngong Hills bioregion, the area was historically Maasai grazing territory, and there are 600+ bird species within 50km of where I sit. Post: x.com/emmanuel_mtaro/status/example7',
      },
      {
        author: 'Siobhan Ni Mhurchu',
        handle: '@siobhan_bogland',
        body: 'I am in the west of Ireland in the Connaught blanket bog ecoregion. One of the rarest habitats on Earth and largely destroyed in the 20th century. What surprised me: intact bogs in my county store more carbon per hectare than tropical rainforest. I had no idea. Post: linkedin.com/posts/example7',
      },
    ],
  },
  {
    questNumber: 8,
    title: 'Welcome Quest 8: Refer an Organisation Project',
    body: `Who Should Be in the Alliance? Make Your Nominations

Behind every piece of healing land is a web of organisations making it possible. This is where we build that web together.

To complete Quest 8:
1. Share regencivics.earth with any organisations in your network that support regenerative land: legal aid, carbon markets, seed libraries, water engineering, ecological education, regenerative finance, and beyond.
2. Comment below: who did you reach out to, and why are they a good fit for the Alliance?

If an organisation you referred joins the Alliance, you earn a 2,222 $ReGen bonus.`,
    seeds: [
      {
        author: 'Nkechi Okonkwo',
        handle: '@nkechi_regenlaw',
        body: 'I work adjacent to environmental law and shared this with two firms specialising in land trusts and commons governance. Also reached out to a regenerative agriculture certification body. These are exactly the kinds of organisations the Alliance needs. Post: instagram.com/p/example3',
      },
      {
        author: 'Sven Lindqvist',
        handle: '@sven_regenfinance',
        body: 'Shared with a Nordic regenerative finance organisation and a circular economy accelerator. The concept of organisations earning tokens for contributing is exciting to them. Post: linkedin.com/posts/example3',
      },
      {
        author: 'Amara Diallo',
        handle: '@amara_agroforestry',
        body: 'I am part of an agroforestry technical assistance network and shared this across our whole community. Probably 30+ organisations. The referral bonus really motivates people to follow through. Post: x.com/amara_agroforestry/status/example3',
      },
    ],
  },
  {
    questNumber: 9,
    title: 'Welcome Quest 9: Refer a Land Project',
    body: `Land is where healing begins. This is where we celebrate every land project that finds its way into the Alliance through one of us.

To complete Quest 9:
1. Share regencivics.earth with any land project stewards you know: farms, rewilding initiatives, food forests, regenerative homesteads, community gardens, you name it.
2. Come back and comment below: share who you reached out to and why, or link to a social post inviting land projects in.

If a project you referred joins the Alliance, you earn a 2,222 $ReGen bonus.`,
    seeds: [
      {
        author: 'Marisela Vega-Torres',
        handle: '@marisela_tierra',
        body: 'I sent the link to the folks running Bosque de Luz, a 40-acre food forest project in Costa Rica I have been volunteering with. Also messaged three permaculture groups. Post: instagram.com/p/example2. Fingers crossed they apply.',
      },
      {
        author: 'Callum Ashford',
        handle: '@callum_rewild',
        body: 'Shared this with the Dartmoor Wilder Grazing project in the UK. They are doing incredible work with mob-grazing and native tree planting. Also sent to two community land trust networks I am part of. Post: x.com/callum_rewild/status/example2',
      },
      {
        author: 'Preethi Sundaram',
        handle: '@preethi_farmcircles',
        body: 'I run a network connecting small-scale organic farmers across South India and shared this with about 15 project leads in our WhatsApp group. Posted on LinkedIn about the referral bonus too. That alone got a lot of interest. Post: linkedin.com/posts/example2',
      },
    ],
  },
]

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL)

  // Get category ID
  const [[category]] = await conn.execute(
    'SELECT id FROM forumCategories WHERE slug = ? LIMIT 1',
    [ONBOARDING_CATEGORY_SLUG]
  )
  if (!category) {
    console.error(`ERROR: Category not found: ${ONBOARDING_CATEGORY_SLUG}`)
    await conn.end()
    process.exit(1)
  }
  const categoryId = category.id
  console.log(`Category "${ONBOARDING_CATEGORY_SLUG}" id=${categoryId}`)

  // Get author ID
  const [[author]] = await conn.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [TEAM_EMAIL]
  )
  if (!author) {
    console.error(`ERROR: User not found: ${TEAM_EMAIL}`)
    await conn.end()
    process.exit(1)
  }
  const authorId = author.id
  console.log(`Author "${TEAM_EMAIL}" id=${authorId}`)

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Processing ${QUEST_POSTS.length} quest posts...\n`)

  const results = []

  for (const quest of QUEST_POSTS) {
    const [[existing]] = await conn.execute(
      'SELECT id FROM forumPosts WHERE title = ? LIMIT 1',
      [quest.title]
    )

    if (existing) {
      console.log(`SKIP (exists): Q${quest.questNumber} "${quest.title}" -> post #${existing.id}`)
      results.push({ questNumber: quest.questNumber, postId: existing.id, created: false })
      continue
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would create: Q${quest.questNumber} "${quest.title}" in category ${categoryId}`)
      results.push({ questNumber: quest.questNumber, postId: null, created: false })
      continue
    }

    const [res] = await conn.execute(
      'INSERT INTO forumPosts (title, content, authorId, categoryId, isPinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
      [quest.title, quest.body, authorId, categoryId]
    )
    const postId = res.insertId

    // Seed example comments
    for (const seed of quest.seeds) {
      const commentBody = `[EXAMPLE contribution - fictional account]\n\n**${seed.author}** (${seed.handle})\n\n${seed.body}`
      await conn.execute(
        'INSERT INTO forumReplies (postId, authorId, content, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
        [postId, authorId, commentBody]
      )
    }

    console.log(`CREATED: Q${quest.questNumber} "${quest.title}" -> post #${postId} (${quest.seeds.length} seed comments)`)
    results.push({ questNumber: quest.questNumber, postId, created: true })
  }

  await conn.end()

  console.log('\n=== RESULTS ===')
  console.log('Patch these into client/src/data/welcomeAboardQuests.ts:\n')
  for (const r of results) {
    if (r.postId) {
      console.log(`  Quest ${r.questNumber}: forumUrl: "/community/post/${r.postId}",`)
    } else {
      console.log(`  Quest ${r.questNumber}: (dry run - no ID assigned)`)
    }
  }
  console.log('\nDone.')
}

main().catch(console.error)
