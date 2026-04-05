/**
 * Seed the "Heal the Land, Heal Ourselves" blog post.
 * Run: source .env && node scripts/seed-heal-the-land-blog.mjs
 */
import mysql from "mysql2/promise";

const content = `Something is wrong with how we've framed the problem.

When we talk about ecological crisis, we talk about carbon parts per million, about species loss percentages, about ocean acidification rates. All of that is real. But it leaves something out: the human being standing in a parking lot, eating food from a plastic container, who hasn't put their hands in soil in years. Maybe decades. Maybe ever.

We frame land health and human health as two separate problems. They are not. They are the same problem, wearing different faces.

The Church of the Regenerative Earth was built on one core belief: we are the land. Not symbolically. We are literally made of the same stuff: the same water, the same minerals, the same microbial communities. When the land loses its living complexity, we lose ours. When the land heals, we feel it. In our bodies. In our moods. In our sense of purpose and belonging.

This is why we built Heal the Land, Heal Ourselves.

## What the program actually is

It starts with food. Our bioregion here on the Big Island of Hawaii, and our partner land projects wherever they exist, offer free or heavily discounted regeneratively grown food to anyone in the community who needs it. No application. No means test. No shame. Food is a sacred good. You need it, you are welcome to it.

People who receive food are invited to gardening days. Not required. Invited. These are not volunteer shifts. They are community days: part work, part ceremony, part shared meal, part music. People come to tend a garden and discover the garden tends them back.

Some of those people feel something shift. They want to go deeper. For those who are ready, we offer land residency: extended time living alongside a land project that is being restored. The land heals through their care. They heal through the land's care. These happen together, not sequentially.

## Why dis-ease dissolves in soil

This is not a metaphor we're reaching for. The research is catching up to what indigenous people have known for millennia: the human microbiome is fundamentally shaped by contact with living soil ecosystems.

But beyond the biochemistry, there is something harder to measure and just as real: purpose. Meaning. The experience of mattering to something larger than yourself.

Chronic depression, addiction, purposelessness: these are not random failures of individual brain chemistry. They are, in large part, the symptoms of a species that has been severed from its ecological home. When you bring someone back into genuine relationship with the living Earth, something reorganizes.

## We need land project partners

The program is designed. The community is building. What we need now is ground.

We are looking for land project partners: regenerative farms, food forests, permaculture estates, ecological restoration projects that want to host this program.

In exchange, the Church offers something concrete: free Game Building for the land project's local food system. Custom quest curriculum, token rewards for contribution, governance tools, food system coordination, and community onboarding support.

You bring the land. We bring the game. Together we build something better.

Apply at [regencivics.earth/land](/land#heal-program) and tell us about your land, your vision, and what healing you are working toward.

The land is waiting. The people are waiting. We just need somewhere to meet.

*Church of the Regenerative Earth  |  regencivics.earth*`;

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Check if already exists
  const [existing] = await conn.execute(
    "SELECT id FROM blogEdits WHERE slug = 'heal-the-land-heal-ourselves'"
  );
  if (existing.length > 0) {
    console.log("Blog post already exists, skipping");
    await conn.end();
    return;
  }

  await conn.execute(
    "INSERT INTO blogEdits (slug, content, updatedAt) VALUES (?, ?, NOW())",
    ["heal-the-land-heal-ourselves", content]
  );
  console.log("Blog post seeded: heal-the-land-heal-ourselves");
  await conn.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
