#!/usr/bin/env node
/**
 * Backfill forum threads for approved/active applications that don't have one yet.
 * Uses the same template as the approval hook in server/routes/applications.ts.
 *
 * --dry-run : (default) prints which applications are missing forum threads
 * --execute : creates the forum posts
 *
 * Run: DATABASE_URL=... node scripts/backfill-forum-threads.mjs [--dry-run|--execute]
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const execute = process.argv.includes('--execute');

function buildThreadContent(app) {
  const typeLabel = app.projectType === 'early_stage' ? 'early-stage' : 'mature';
  const landStatusLabel = {
    owned: 'owned',
    leased: 'leased',
    committed: 'committed to purchase',
    seeking: 'seeking land',
  };

  // Build community metrics line
  const metrics = [];
  if (app.projectSizeHectares) metrics.push(`${app.projectSizeHectares} hectares`);
  if (app.currentPeopleCount) metrics.push(`${app.currentPeopleCount} people currently`);
  if (app.intendedPeopleCount) metrics.push(`${app.intendedPeopleCount} intended`);

  // Build mixed use label
  let mixedUseStr = '';
  try {
    const mu = JSON.parse(app.mixedUse ?? '[]');
    if (Array.isArray(mu) && mu.length) mixedUseStr = mu.join(', ');
  } catch { /* ignore */ }

  const lines = [
    `**${app.projectName}** is a ${typeLabel} regenerative land project based in ${app.location}${app.country ? `, ${app.country}` : ''}.`,
    '',
    `**Vision**`,
    app.vision,
    '',
    `**Land status:** ${landStatusLabel[app.landStatus] ?? app.landStatus}`,
    metrics.length ? `**Scale:** ${metrics.join(' | ')}` : '',
    mixedUseStr ? `**Uses:** ${mixedUseStr}` : '',
    app.meetingFrequency ? `**Community gathering:** ${app.meetingFrequency.replace(/_/g, ' ')}` : '',
    '',
    `**Regenerative practices**`,
    app.regenerativePractices,
    '',
    `**Governance approach**`,
    app.governanceApproach,
    '',
    `**Community engagement**`,
    app.communityEngagement,
    '',
    `**Team:** ${app.teamDescription} (${app.teamSize} people)`,
    '',
    `**Current funding:** ${app.currentFunding || 'Not disclosed'}`,
    `**Funding needs:** ${app.fundingNeeds}`,
    '',
    app.timeCommitment ? `**Time commitment:** ${app.timeCommitment}` : '',
    app.websiteUrl ? `**Website:** ${app.websiteUrl}` : '',
    '',
    `---`,
    `Follow this thread for updates from the team. Ask questions, offer support, or share resources below.`,
    '',
    `[Apply to support this project](/apply) | [View on map](/map)`,
  ];

  return lines
    .filter(l => l !== null && l !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

let conn;
try {
  conn = await mysql.createConnection(DATABASE_URL);

  // Ensure active-projects category exists
  const [cats] = await conn.execute(
    `SELECT id FROM forumCategories WHERE slug = 'active-projects' LIMIT 1`
  );

  let categoryId;
  if (cats.length > 0) {
    categoryId = cats[0].id;
  } else if (execute) {
    const [result] = await conn.execute(
      `INSERT INTO forumCategories (name, slug, description, sortOrder, createdAt)
       VALUES ('Active Projects', 'active-projects', 'Land projects approved by ReGen Civics. Follow updates, ask questions, and connect with the teams.', 99, NOW())`
    );
    categoryId = result.insertId;
    console.log(`Created "active-projects" category (id: ${categoryId})`);
  } else {
    console.log('WARNING: active-projects category does not exist. It will be created on --execute.');
    categoryId = null;
  }

  // Get team account id (authorId = 1 in the approval hook, but we'll match the team email too)
  const [teamRows] = await conn.execute(
    `SELECT id FROM users WHERE email = 'team@regencivics.earth' LIMIT 1`
  );
  const authorId = teamRows.length > 0 ? teamRows[0].id : 1;

  // Find approved/active applications without a matching forum thread
  // The approval hook creates titles like: "ProjectName - Location"
  const [apps] = await conn.execute(`
    SELECT a.*
    FROM applications a
    WHERE a.status IN ('approved', 'active')
      AND NOT EXISTS (
        SELECT 1 FROM forumPosts fp
        WHERE fp.categoryId = ?
          AND (
            fp.title = CONCAT(a.projectName, ' - ', a.location)
            OR fp.title = a.projectName
            OR fp.title LIKE CONCAT('%', a.projectName, '%')
          )
      )
    ORDER BY a.projectName
  `, [categoryId ?? 0]);

  if (apps.length === 0) {
    console.log('All approved/active applications already have forum threads. Nothing to do.');
  } else {
    console.log(`Found ${apps.length} application(s) without forum threads:\n`);

    for (const app of apps) {
      const title = `${app.projectName} - ${app.location}`;
      console.log(`  ${execute ? 'Creating' : '[DRY RUN] Would create'}: "${title}"`);

      if (execute && categoryId) {
        const content = buildThreadContent(app);
        await conn.execute(
          `INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned, postType, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 1, 'discussion', NOW(), NOW())`,
          [categoryId, authorId, title, content]
        );
      }
    }

    if (execute) {
      console.log(`\nCreated ${apps.length} forum thread(s).`);
    } else {
      console.log('\nDry run. Pass --execute to create these forum threads.');
    }
  }
} catch (err) {
  console.error('Failed:', err.message);
  process.exit(1);
} finally {
  if (conn) await conn.end();
}
