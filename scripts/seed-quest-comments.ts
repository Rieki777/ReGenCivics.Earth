/**
 * seed-quest-comments.ts — Seeds 3 comments per Welcome Aboard quest forum post.
 *
 * Usage: DATABASE_URL=... RYE_USER_ID=1 npx tsx scripts/seed-quest-comments.ts [--reset]
 *
 * - Finds each quest forum post by title (creates the post if missing)
 * - Inserts 3 seed comments per post from persona voices
 * - Uses INSERT IGNORE to be idempotent on re-runs
 * - Assigns comments to the Rye user ID (default 1)
 * - Pass --reset to delete all forumReplies + forumPosts before seeding
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const RYE_USER_ID = parseInt(process.env.RYE_USER_ID ?? "1", 10);
const RESET = process.argv.includes("--reset");

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

interface SeedComment {
  persona: string;
  content: string;
}

interface QuestPost {
  title: string;
  categorySlug: string;
  body: string;
  comments: SeedComment[];
}

const QUEST_POSTS: QuestPost[] = [
  {
    title: "The Welcome Aboard Quests: How Are You Finding It?",
    categorySlug: "quests-gameplay",
    body: `This is the place to share your experience on the ReGen Civics site and give constructive feedback. There are no wrong answers here. Whether you loved it, found it confusing, or have big ideas for how to make it better, we want to hear it all.

To complete Quest 1:
1. Leave a comment below sharing your honest thoughts about the site. What is working? What could be improved? What excited you?
2. Post your thoughts on social media too (link to your post in your comment here).

Your voice helps us build something extraordinary together.`,
    comments: [
      {
        persona: "Solange Beaumont",
        content: `I found the quests section a bit hard to find at first. Took me a while to realise it was in the profile section. Once I found it though, I was hooked. The token reward structure is really clever. Would love to see a brief onboarding flow that introduces first-time visitors to the Game concept right away. Shared this on my Instagram: [Solange's Instagram post](https://instagram.com/p/example1)`,
      },
      {
        persona: "Tobias Wrenfield",
        content: `Really impressed by the scope of what is being built here. My main feedback is that the "How It Works" section on the home page could be even more visual, maybe a short animated explainer. The vision is big and new visitors need to feel it quickly before they commit to exploring further. Posted a thread on X about it: [Tobias's X thread](https://x.com/tobias_earthwise/status/example)`,
      },
      {
        persona: "Yemi Adeyinka",
        content: `As someone who has been in the regenerative agriculture space for years, it is refreshing to see governance and game mechanics applied to ecosystem stewardship. Two suggestions: clearer explanations of what $ReGen and RGVoice tokens actually do on-chain, and a map view of all the land projects. Would draw me back daily. LinkedIn post here: [Yemi's LinkedIn post](https://linkedin.com/posts/example)`,
      },
    ],
  },
  {
    title: "The Moment Everything Shifted: Your Origin Story",
    categorySlug: "general",
    body: `This is where we collect the stories of how we each found our way here. Every origin story is different. Every one matters.

To complete Quest 2:
1. Write your Regenerative Origin Story below. What woke you up? How did you get here? A paragraph is enough. A page is welcome.
2. Share it on social media and link to your post in your comment here.

When we share our stories, we recognise each other.`,
    comments: [
      {
        persona: "Amara Diallo",
        content: `I grew up watching my grandmother tend her garden in Dakar with a kind of attention I did not understand until much later. She never called it regenerative but she was composting before I knew the word. I came to this work after a decade in finance, realising the money was flowing everywhere except toward the land. ReGen Civics is the first place I have seen both things held together. Post: [Amara's Instagram post](https://instagram.com/p/example_origin1)`,
      },
      {
        persona: "Luca Andersson",
        content: `Mine is embarrassingly simple: I watched a documentary about soil microbes at 2am and could not sleep for three days after. Something just clicked. I started reading everything, quit a comfortable job, and spent two years on a farm in southern Sweden. I still do not know where I am going but I know what direction I am facing. Shared on X: [Luca's X post](https://x.com/luca_regen_north/status/example_origin)`,
      },
      {
        persona: "Fatimah Osei",
        content: `I came to this through grief, honestly. A river I grew up swimming in ran dry when I was 22. I needed somewhere to put that grief that was not just rage. Regenerative work gave me somewhere to put it that also builds something. That is the whole answer. Post: [Fatimah's LinkedIn post](https://linkedin.com/posts/example_origin)`,
      },
    ],
  },
  {
    title: "Quest 3, Do a Regenerative Act: Show Us What You Did",
    categorySlug: "quests-gameplay",
    body: `This is our collective log of real regenerative actions taken by ReGen Civics players in the physical world. Every act counts. Every act is a vote for the world we want.

To complete Quest 3:
1. Do one real, intentional regenerative act today, however small.
2. Share what you did below. A photo, a description, anything real.
3. Post about it on social media and link to your post in your comment.

When we witness each other doing, something shifts.`,
    comments: [
      {
        persona: "Mireille Fontenot",
        content: `I planted six native wildflowers along the verge outside my building. Had to check first that it was not illegal in my council (it nearly was). But it is done. My small act of guerrilla rewilding. Post: [Mireille's Instagram post](https://instagram.com/p/example6). Already inspired my neighbour to do the same.`,
      },
      {
        persona: "Josue Ramirez",
        content: `I spent an hour picking up plastic along a 300-metre stretch of the river near my house. It is something I walk past every day and look away from. Not anymore. Post: [Josue's X post](https://x.com/josue_tierra_libre/status/example6). And a commitment to do it monthly.`,
      },
      {
        persona: "Hana Kowalczyk",
        content: `My regenerative act was starting my first compost bin. I have wanted to do this for two years and Quest 3 made me actually do it. It is just a box in the corner of my balcony for now, but it is alive. Shared the setup on TikTok: [Hana's TikTok video](https://tiktok.com/@hana_ferments/example6).`,
      },
    ],
  },
  {
    title: "Bioregional Wisdom: What Does Your Land Teach That Others Should Know?",
    categorySlug: "land-projects",
    body: `This is our bioregional atlas: a growing map of where ReGen Civics players are rooted and what they are discovering about their home places.

To complete Quest 4:
1. Research your bioregion. (Try [Watershed Project](https://watershedproject.org) or [iNaturalist](https://inaturalist.org) as a starting point.)
2. Share three things you discovered and what surprised you in the comments below.
3. Post on social media about your bioregion and link to your post here.

The more we know our places, the better we can tend them.`,
    comments: [
      {
        persona: "Astrid Bergholm",
        content: `I am in the Angermanälven watershed in northern Sweden. A river system I had never thought about even though I drink from it. Discovered that the area has one of Scandinavia's last wild salmon runs. And that three centuries ago, this whole hillside was open pasture with 40+ farm families. Now it is mostly spruce monoculture. Shared: [Astrid's Instagram post](https://instagram.com/p/example7)`,
      },
      {
        persona: "Emmanuel Kariuki",
        content: `I live in Nairobi but I learned I am in the Nairobi River watershed. A river so degraded most residents do not know it flows beneath them. Found a local restoration group I am now volunteering with. Three things: I live in the Ngong Hills bioregion, the area was historically Maasai grazing territory, and there are 600+ bird species within 50km of where I sit. Post: [Emmanuel's X post](https://x.com/emmanuel_mtaro/status/example7)`,
      },
      {
        persona: "Siobhan Ni Mhurchu",
        content: `I am in the west of Ireland in the Connaught blanket bog ecoregion. One of the rarest habitats on Earth and largely destroyed in the 20th century. What surprised me: intact bogs in my county store more carbon per hectare than tropical rainforest. I had no idea. Post: [Siobhan's LinkedIn post](https://linkedin.com/posts/example7)`,
      },
    ],
  },
  {
    title: "Quest 5: Make Friends and Support",
    categorySlug: "general",
    body: `This is where we build the connective tissue of the Alliance. Not projects, not tokens, just people finding each other and choosing to show up.

To complete Quest 5:
1. Find someone in the community you have not connected with yet. Reach out: leave a comment, respond to their origin story, answer a question they asked, or just introduce yourself.
2. Share the connection below. Who did you reach out to, and why?
3. Post something on social media about the value of real community in regenerative work, and link to it in your comment here.

A community that notices its members is a community worth belonging to.`,
    comments: [
      {
        persona: "Baraka Njoroge",
        content: `I read Valentina's origin story and sent her a message because she mentioned translation between indigenous land knowledge and policy language. That is exactly the gap I keep running into in my systems design work. We ended up on a 90-minute call. That call would not have happened without this quest. Post: [Baraka's X post](https://x.com/baraka_systems/status/example_friends)`,
      },
      {
        persona: "Clara van den Berg",
        content: `I welcomed three people who posted their origin stories this week. One of them is a filmmaker in Lagos working on exactly the kind of land documentation I want to do. We are already planning a collaboration. This is what the platform is for. Post: [Clara's LinkedIn post](https://linkedin.com/posts/example_friends)`,
      },
      {
        persona: "Dario Marchetti",
        content: `I answered a question in the forum that had been sitting unanswered for four days. Small thing. But the person replied saying it was the first time they felt like someone had actually seen them on the platform. That is everything. Post: [Dario's Instagram post](https://instagram.com/p/example_friends)`,
      },
    ],
  },
  {
    title: "Quest 6: Pledge Your Gift",
    categorySlug: "general",
    body: `This is our community gift registry: a living document of what ReGen Civics players bring to the Regenerative Renaissance.

To complete Quest 6:
1. Write your Gift Pledge (1-5 sentences): What gift do you bring? What would you contribute if you knew it was needed?
2. Share it below.
3. Post it publicly on social media and link to it in your comment here.

When we name our gifts, they become real. When we witness each other's gifts, a network activates.`,
    comments: [
      {
        persona: "Valentina Cruz",
        content: `My gift is translation. Not just language (I speak Spanish, English, and Nahuatl) but translation between worlds. Between indigenous land knowledge and policy language. Between local wisdom and global movements. I pledge to spend at least 2 hours a week using this gift for the Alliance. Post: [Valentina's Instagram post](https://instagram.com/p/example8)`,
      },
      {
        persona: "Baraka Njoroge",
        content: `I am a systems designer and I pledge to apply that lens to the governance challenges that regenerative land projects face. How do you make equitable decisions across a distributed land alliance? That is my question and my gift. Post: [Baraka's X post](https://x.com/baraka_systems/status/example8)`,
      },
      {
        persona: "Clara van den Berg",
        content: `I am a filmmaker and I pledge to document three land projects in the ReGen Civics Alliance over the next year. Real stories, told with care. Stories are how movements move. This is my contribution. Post: [Clara's LinkedIn post](https://linkedin.com/posts/example8)`,
      },
    ],
  },
  {
    title: "Foundational Series Watch Party: Questions and Reactions",
    categorySlug: "learning-resources",
    body: `This is where we share what struck us from the Foundational Series. The four videos are posted in this thread. Watch them, then share your reflections below.

What resonated? What surprised you? What questions did it open up? What would you share with a friend to bring them into this world?

To complete Quest 7:
1. Watch the Foundational Series (all 4 videos, or as many as you can).
2. Write a reflection, summary, or creative response in the comments below.
3. Share your response on social media and link to it here.

This is an invitation to bring others into the vision.`,
    comments: [
      {
        persona: "Dario Marchetti",
        content: `Just finished all four videos and my biggest takeaway is the concept of "coordinating at the speed of trust." We have all the solutions. What we lack is the governance layer to connect them. ReGen Civics is proposing exactly that. Wrote a summary article: [Dario's Medium article](https://medium.com/@dario_regen/example5)`,
      },
      {
        persona: "Fatimah Osei",
        content: `Video 3 shifted something in me. The idea that we are not building an organisation but an ecosystem hit differently. I have been in too many movements that became institutions and lost their aliveness. The game framing could be the antidote. Shared on Instagram: [Fatimah's Instagram post](https://instagram.com/p/example5)`,
      },
      {
        persona: "Luca Andersson",
        content: `I wrote a short invitation post for my network after watching: "If you have been wondering what regenerative civilisation actually looks like in practice, start here." Three friends have already reached out asking how to join. Post: [Luca's X post](https://x.com/luca_regen_north/status/example5)`,
      },
    ],
  },
  {
    title: "Who Should Be in the Alliance? Make Your Nominations",
    categorySlug: "alliance-partners",
    body: `Behind every piece of healing land is a web of organisations making it possible. This is where we build that web together.

To complete Quest 8:
1. Share [regencivics.earth](https://regencivics.earth) with any organisations in your network that support regenerative land: legal aid, carbon markets, seed libraries, water engineering, ecological education, regenerative finance, and beyond.
2. Comment below: who did you reach out to, and why are they a good fit for the Alliance?

If an organisation you referred joins the Alliance, you earn a 2,222 $ReGen bonus.`,
    comments: [
      {
        persona: "Nkechi Okonkwo",
        content: `I work adjacent to environmental law and shared this with two firms specialising in land trusts and commons governance. Also reached out to a regenerative agriculture certification body. These are exactly the kinds of organisations the Alliance needs. Post: [Nkechi's Instagram post](https://instagram.com/p/example3)`,
      },
      {
        persona: "Sven Lindqvist",
        content: `Shared with a Nordic regenerative finance organisation and a circular economy accelerator. The concept of organisations earning tokens for contributing is exciting to them. Post: [Sven's LinkedIn post](https://linkedin.com/posts/example3)`,
      },
      {
        persona: "Amara Diallo",
        content: `I am part of an agroforestry technical assistance network and shared this across our whole community. Probably 30+ organisations. The referral bonus really motivates people to follow through. Post: [Amara's X post](https://x.com/amara_agroforestry/status/example3)`,
      },
    ],
  },
  {
    title: "Quest 9: Refer a Land Project",
    categorySlug: "land-projects",
    body: `Land is where healing begins. This is where we celebrate every land project that finds its way into the Alliance through one of us.

To complete Quest 9:
1. Share [regencivics.earth](https://regencivics.earth) with any land project stewards you know: farms, rewilding initiatives, food forests, regenerative homesteads, community gardens, you name it.
2. Come back and comment below: share who you reached out to and why, or link to a social post inviting land projects in.

If a project you referred joins the Alliance, you earn a 2,222 $ReGen bonus.`,
    comments: [
      {
        persona: "Marisela Vega-Torres",
        content: `I sent the link to the folks running Bosque de Luz, a 40-acre food forest project in Costa Rica I have been volunteering with. Also messaged three permaculture groups. Post: [Marisela's Instagram post](https://instagram.com/p/example2). Fingers crossed they apply.`,
      },
      {
        persona: "Callum Ashford",
        content: `Shared this with the Dartmoor Wilder Grazing project in the UK. They are doing incredible work with mob-grazing and native tree planting. Also sent to two community land trust networks I am part of. Post: [Callum's X post](https://x.com/callum_rewild/status/example2)`,
      },
      {
        persona: "Preethi Sundaram",
        content: `I run a network connecting small-scale organic farmers across South India and shared this with about 15 project leads in our WhatsApp group. Posted on LinkedIn about the referral bonus too. That alone got a lot of interest. Post: [Preethi's LinkedIn post](https://linkedin.com/posts/example2)`,
      },
    ],
  },
  {
    title: "Quest Ideas: What Should Be a Quest That Isn't Yet?",
    categorySlug: "quests-gameplay",
    body: `This is where the next generation of ReGen Civics quests is born. You are invited to be a co-creator of the Game.

The best quest ideas:
- Are tied to real regenerative action or connection
- Draw on the creator's gifts or life purpose
- Add value across multiple forms of capital
- Can scale to coordinate thousands of people
- Are genuinely fun, or moving, or beautiful to do

To complete Quest 10:
1. Share your quest idea below: title, description, and what value it creates.
2. Post it on social media too and link to your post in your comment.

The highest-voted quest idea will be implemented into the Game, earning the creator an additional 1,111 $ReGen.`,
    comments: [
      {
        persona: "Izabela Nowak",
        content: `My dream quest (had this idea at 3am): "The Mycelium Quest." Players map every connection they have to someone doing regenerative work, visualise their personal network as a mycelium diagram, and share it. The value: making invisible connective tissue visible. Post: [Izabela's Instagram post](https://instagram.com/p/example4)`,
      },
      {
        persona: "Kweku Mensah",
        content: `Quest idea: "The Seed Sovereignty Quest." Save seeds from something you grew, document it, and gift them to someone else in the community. Creates living chains of seed stewardship across the Alliance. Post: [Kweku's X post](https://x.com/kweku_earthgames/status/example4). Already getting traction.`,
      },
      {
        persona: "Rosa Villareal",
        content: `I woke up with this one: "The Ancestor Quest." Interview an elder in your community about how land was cared for when they were young. Record a few minutes, transcribe the wisdom, and share it in the forum. Our elders carry irreplaceable ecological knowledge. We are losing it fast. Post: [Rosa's LinkedIn post](https://linkedin.com/posts/example4)`,
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL!);

  // Optionally wipe existing forum content before re-seeding
  if (RESET) {
    console.log("Resetting forum posts...");
    await conn.execute("DELETE FROM forumReplies");
    await conn.execute("DELETE FROM forumPosts");
    console.log("Forum cleared.");
  }

  let postsCreated = 0;
  let commentsInserted = 0;
  let commentsSkipped = 0;

  for (let qi = 0; qi < QUEST_POSTS.length; qi++) {
    const qp = QUEST_POSTS[qi];

    // Find the category
    const [catRows] = await conn.execute<any[]>(
      "SELECT id FROM forumCategories WHERE slug = ? LIMIT 1",
      [qp.categorySlug]
    );
    let categoryId: number | null = catRows[0]?.id ?? null;

    if (!categoryId) {
      console.warn(`  ⚠ Category slug "${qp.categorySlug}" not found — skipping quest ${qi + 1}`);
      continue;
    }

    // Find or create the post
    const [postRows] = await conn.execute<any[]>(
      "SELECT id FROM forumPosts WHERE title = ? AND categoryId = ? LIMIT 1",
      [qp.title, categoryId]
    );

    let postId: number;
    if (postRows[0]) {
      postId = postRows[0].id;
    } else {
      const createdAt = daysAgo(25 - qi * 2);
      const [result] = await conn.execute<any>(
        `INSERT INTO forumPosts (categoryId, authorId, title, content, viewCount, replyCount, isPinned, createdAt, updatedAt, lastReplyAt, lastReplyBy)
         VALUES (?, ?, ?, ?, 0, 0, 1, ?, ?, ?, ?)`,
        [categoryId, RYE_USER_ID, qp.title, qp.body, createdAt, createdAt, createdAt, RYE_USER_ID]
      );
      postId = result.insertId;
      postsCreated++;
      console.log(`  ✅ Created post: "${qp.title}" (id=${postId})`);
    }

    // Seed comments
    for (let ci = 0; ci < qp.comments.length; ci++) {
      const c = qp.comments[ci];
      const commentDate = daysAgo(20 - qi * 2 - ci);
      try {
        await conn.execute(
          `INSERT IGNORE INTO forumReplies (postId, authorId, content, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?)`,
          [postId, RYE_USER_ID, `**${c.persona}:** ${c.content}`, commentDate, commentDate]
        );
        commentsInserted++;
      } catch (err: any) {
        if (err.code === "ER_DUP_ENTRY") {
          commentsSkipped++;
        } else {
          console.error(`  ✗ Error inserting comment for post ${postId}:`, err.message);
          commentsSkipped++;
        }
      }
    }

    // Update reply count on the post
    await conn.execute(
      "UPDATE forumPosts SET replyCount = (SELECT COUNT(*) FROM forumReplies WHERE postId = ?) WHERE id = ?",
      [postId, postId]
    );
  }

  await conn.end();
  console.log(`\nSeed complete:`);
  console.log(`  Posts created: ${postsCreated}`);
  console.log(`  Comments inserted: ${commentsInserted}`);
  console.log(`  Comments skipped: ${commentsSkipped}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
