/**
 * Put the Interoperability Circle on a break and tell everyone signed up.
 *
 *   npx tsx scripts/interop-circle-pause.ts            # dry run: who would get the email
 *   npx tsx scripts/interop-circle-pause.ts --send     # pause, cancel the weeks, send
 *
 * Sets interop_circle_paused, runs the sync (which cancels every upcoming
 * week and turns off its reminders), then emails each person still signed up.
 * A site setting records who was sent the notice, so running it twice does not
 * mail anyone twice. Resume from Admin > Events > Interoperability Circle.
 */
import "dotenv/config";
import { getDb, getSiteSetting, setSiteSetting } from "../server/db";
import { circleMembers, sendCirclePauseNotice, syncInteropCircle } from "../server/lib/interopCircle";
import { INTEROP_PAUSED_SETTING } from "@shared/interopCircle";

const SENT_SETTING = "interop_circle_pause_notice_sent";

async function main() {
  const send = process.argv.includes("--send");
  const database = await getDb();
  if (!database) throw new Error("No database");

  const members = await circleMembers(database);
  const sent = new Set<string>(JSON.parse((await getSiteSetting(SENT_SETTING)) ?? "[]"));
  const todo = members.filter((m) => !sent.has(m.email.toLowerCase()));
  console.log(`${members.length} signed up, ${todo.length} not yet told.`);
  if (!send) {
    console.log("Dry run. Pass --send to pause the Circle and send.");
    return;
  }

  await setSiteSetting(INTEROP_PAUSED_SETTING, "1");
  const result = await syncInteropCircle({ force: true });
  console.log("Sync:", result);

  for (const m of todo) {
    const r = await sendCirclePauseNotice(m);
    const who = m.email.replace(/^(.).*@/, "$1***@");
    if (r.status !== "sent") {
      console.log(`Not sent to ${who}: ${r.status}`);
      continue;
    }
    sent.add(m.email.toLowerCase());
    await setSiteSetting(SENT_SETTING, JSON.stringify([...sent]));
    console.log(`Sent to ${who} (${r.id})`);
  }
}

main().then(() => process.exit(0), (err) => {
  console.error(err);
  process.exit(1);
});
