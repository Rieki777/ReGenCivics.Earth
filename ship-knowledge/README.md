# Teaching the Shipwright

The Shipwright only answers from approved knowledge chunks, so everything she knows comes from
this folder, the admin UI, or resolved maintenance cases. Three ways to teach her, easiest first.

## 1. Paste it in the admin UI (no terminal)

Go to `/admin/ship`, open the **Shipwright** tab, and use **Teach the Shipwright**. Title,
system, paste the text, done. It is live for her on the next question. Best for one-off facts:
a fix that worked, a part number, a quirk you discovered on the road.

## 2. Drop a markdown file in this folder (bulk)

Write a file like `2006-fleetwood-revolution-le.md`. Each `##` section becomes one chunk:

    ## Generator won't start: first checks | system: generator | source: Onan manual p.12 | type: manual
    Check the main tank is above a quarter (the generator pickup sits high), then...

Then run:

    npx tsx scripts/import-ship-knowledge.ts ship-knowledge/your-file.md --dry-run   # preview
    npx tsx scripts/import-ship-knowledge.ts ship-knowledge/your-file.md             # import

Re-running is safe: same titles get updated, new titles get added. Or just ask Claude:
"add what's in this PDF to the Shipwright's knowledge" and it will chunk it into a pack and import.

## 3. Approve resolved cases (the flywheel)

Every question a voyager asks the Shipwright logs a maintenance case. When a case gets fixed,
resolve it in the Shipwright admin tab with what worked, then hit **Into knowledge**. Her answers
get better with every voyage, from real fixes on this actual coach.

## Writing chunks that work

One fact per chunk. Lead with the symptom or the question a voyager would ask, then the answer.
Plain language, short sentences, no em-dashes. Include the source so the Keeper can verify.
Systems: chassis, engine, propane, electrical, plumbing, slides, generator, appliances, starlink,
water_filtration, tires_brakes, hvac, general.

Safety rails are code, not knowledge: propane, brakes, steering, chassis air, burning smells,
fire, and CO always short-circuit to make-safe guidance no matter what a chunk says.
