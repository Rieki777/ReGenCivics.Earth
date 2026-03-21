# Migration Rollback Scripts

Each `*.down.sql` file reverses the corresponding forward migration in `drizzle/`.

## Naming convention

```
{migration-name}.down.sql
```

## How to run a rollback

Connect to your Railway MySQL database and execute the rollback script:

```bash
# Using mysql CLI
mysql -h <host> -P <port> -u <user> -p<password> <database> < drizzle/rollback/0066_entity_notes.down.sql

# Or pipe through Railway CLI if you have it configured
railway run mysql < drizzle/rollback/0066_entity_notes.down.sql
```

## Order of rollback

Always roll back in **reverse migration order** (newest first). For example:

```
0066_entity_notes.down.sql          ← roll back this first
0065_admin_notifications.down.sql
0064_application_events.down.sql
0063_banned_emails.down.sql
0060_quest_forum_thread_id.down.sql
0059_onboarding_quests_category.down.sql
```

## Important warnings

- **Check for data** before rolling back any migration that drops tables or columns.
  Foreign-key cascades will delete child rows automatically.
- Drizzle ORM does not track rollbacks — after running a `.down.sql`, you must also
  remove or roll back the corresponding Drizzle snapshot in `drizzle/meta/` if you
  want `drizzle-kit push` to regenerate correctly.
- The `0059_onboarding_quests_category.down.sql` rollback deletes a forum category row.
  Move or archive posts in that category first.
