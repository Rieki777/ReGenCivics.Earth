/**
 * The builders' pool, operator view (ADR-50, ADR-51).
 * Route: /admin/builders-pool
 *
 * The full statement: what each module earned, who is owed, where it goes, why
 * a share is waiting, and the handoff that sends one. Everything the public
 * page withholds.
 *
 * THERE IS NO PAY BUTTON HERE, AND THERE CANNOT BE ONE. "Open in Hypha"
 * creates a Hypha Bridge handoff and gives you a link. Hypha's own form, in the
 * treasury's space, with that space's own members deciding, is where a transfer
 * happens. `server/blockchain.ts` is read-only, no wallet, no signing, and
 * nothing behind this page can move a token.
 *
 * WHAT THIS PAGE MAY NOT DO, learned the hard way: imply a setting exists that
 * does not. The pool amount is read from the database and the page says what it
 * FOUND. It used to be described in code as something an operator sets in the
 * admin UI, and there was no row to set.
 */
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { TaoSpinner } from "@/components/TaoSpinner";

const fmt = (n: number) => n.toLocaleString("en-US");

/** Plain sentences for the operator, one per state. */
const WHY: Record<string, string> = {
  payable: "Ready to send",
  recycled: "Built here, so this goes back to the gratitude pool",
  unattested: "A village names an outside builder this hub has not reviewed. Held",
  "no-account": "No ReGen Civics account for that handle yet",
  "no-address": "Account found, no Base address linked in their profile",
  "unusable-address": "The linked address is not a valid Base address",
  "below-floor": "Share is under the dust floor, so it is not sent",
};

export default function AdminBuildersPool() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = !!user && (user.role === "admin" || user.role === "superadmin");
  const [note, setNote] = useState("");

  const query = trpc.modulePool.adminStatement.useQuery(undefined, { enabled: isAdmin });
  const s = query.data?.statement ?? null;
  const poolVariable = query.data?.poolVariable ?? null;
  const cycleNumber = s?.cycleNumber;
  const exported = trpc.modulePool.adminExport.useQuery(
    { cycleNumber: cycleNumber ?? 0 },
    { enabled: isAdmin && typeof cycleNumber === "number" },
  );
  const markExecuted = trpc.modulePool.markExecuted.useMutation({
    onSuccess: () => {
      toast.success("Recorded. The statement now says a human executed it.");
      query.refetch();
      setNote("");
    },
    onError: (err) => toast.error(err.message),
  });
  const openPayout = trpc.modulePool.openPayout.useMutation({
    onSuccess: (result) => {
      toast.success(result.reused ? "This share already has a handoff. Opening it." : "Handoff created.");
      query.refetch();
      window.open(result.bridgeUrl, "_blank", "noopener,noreferrer");
    },
    onError: (err) => toast.error(err.message),
  });

  if (authLoading || (isAdmin && query.isLoading)) return <TaoSpinner fullPage size={72} />;

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Admins only</h1>
        <a href={getLoginUrl()} className="underline">Sign in</a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">The $ReGen builders' pool</h1>
        <Link href="/builders-pool" className="underline text-sm">See the public page</Link>
      </div>

      {/*
        The pool amount, stated from what the database holds. Two different
        sentences for two different situations, because "set to 0" and "there is
        no row to set" need different things done about them and telling an
        operator the first when the second is true is how somebody spends an
        afternoon looking for a field.
      */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Custom Game Module Creators Pool</CardTitle>
          <CardDescription>
            {poolVariable?.exists
              ? "The amount this pool pays out each lunar cycle. A ReGen Civics setting and never a village one: change it in Admin, Game Variables, and the next cycle settles at the new amount."
              : "There is no pool.regen_per_cycle row in game_variables."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {poolVariable?.exists ? (
            <p className="text-sm">
              <span className="text-2xl font-semibold">{fmt(poolVariable.value)}</span> $ReGen per lunar cycle
              {poolVariable.minValue !== null && poolVariable.maxValue !== null ? (
                <span className="opacity-60">
                  {" "}(allowed {fmt(poolVariable.minValue)} to {fmt(poolVariable.maxValue)})
                </span>
              ) : null}
              {poolVariable.value === 0 ? (
                <span className="block mt-2 opacity-70">
                  At 0 the statement is still written every cycle and every module still earns its
                  proportion of nothing, so a cycle at 0 pays nobody and recycles nothing.
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-sm">
              The statement job reads this key and falls back to 0, so every cycle settles at 0 and
              nothing is paid or recycled. The admin Game Variables panel edits an existing row by
              id, so it cannot create this one. Apply migration
              {" "}<span className="font-mono">0228_module_pool_reach_and_payout.sql</span>{" "}
              with <span className="font-mono">npx tsx scripts/run-migration.ts --all</span>, then
              set the amount here.
            </p>
          )}
        </CardContent>
      </Card>

      {!s ? (
        <Card>
          <CardHeader>
            <CardTitle>No statement yet</CardTitle>
            <CardDescription>
              A statement is written after a lunar cycle closes, by the daily cron at
              /api/cron/module-pool-statement. You can also run
              `npx tsx scripts/module-pool-statement.ts --dry-run` to see what the next one
              would say.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Cycle {s.cycleNumber}</CardTitle>
              <CardDescription>
                {new Date(s.cycleStartsAt).toISOString().slice(0, 10)} to{" "}
                {new Date(s.cycleEndsAt).toISOString().slice(0, 10)}, status {s.status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                <div><dt className="opacity-60">Pool</dt><dd className="text-lg font-semibold">{fmt(s.pool)}</dd></div>
                <div><dt className="opacity-60">Carried in</dt><dd className="text-lg font-semibold">{fmt(s.carryIn)}</dd></div>
                <div><dt className="opacity-60">Payable</dt><dd className="text-lg font-semibold">{fmt(s.paid)}</dd></div>
                <div><dt className="opacity-60">Accrued</dt><dd className="text-lg font-semibold">{fmt(s.accrued)}</dd></div>
                <div><dt className="opacity-60">Recycled</dt><dd className="text-lg font-semibold">{fmt(s.recycled)}</dd></div>
                <div><dt className="opacity-60">Unallocated</dt><dd className="text-lg font-semibold">{fmt(s.unallocated)}</dd></div>
              </dl>
              <p className="text-sm opacity-70 mt-4">
                {fmt(s.pool)} + {fmt(s.carryIn)} = {fmt(s.paid)} + {fmt(s.accrued)} + {fmt(s.recycled)} + {fmt(s.unallocated)}.
                {" "}
                {s.pool + s.carryIn === s.paid + s.accrued + s.recycled + s.unallocated
                  ? "The statement balances."
                  : "The statement does NOT balance. Do not execute it."}
              </p>
              {s.recycled > 0 ? (
                <p className="text-sm opacity-70 mt-2">
                  {fmt(s.recycled)} $ReGen was earned by modules built here and went into the ReGen
                  Civics gratitude pool, where the community gives it out.
                </p>
              ) : null}
              {s.snapshotHash ? (
                <p className="text-xs opacity-50 mt-2 font-mono break-all">snapshot {s.snapshotHash}</p>
              ) : null}
              <p className="text-sm opacity-70 mt-4">
                Roster: {s.roster.ok} answered, {s.roster.carried} counted from a stored report,
                {" "}{s.roster.absent} could not be counted.
              </p>
              {s.rosterDetail.some((r: any) => r?.refusedBecause) ? (
                <ul className="text-xs opacity-60 mt-2 space-y-1">
                  {s.rosterDetail
                    .filter((r: any) => r?.refusedBecause)
                    .map((r: any) => (
                      <li key={r.id}>
                        <span className="font-mono">{r.id}</span>: {r.refusedBecause}
                      </li>
                    ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Lines</CardTitle>
              <CardDescription>
                Every module that drew a share, and where it stands. Reach is the sum of each
                village's own share of active members who opened it, capped at one per village.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="opacity-60">
                  <tr>
                    <th scope="col" className="py-2 pr-4">Module</th>
                    <th scope="col" className="py-2 pr-4">Builder</th>
                    <th scope="col" className="py-2 pr-4">Handle</th>
                    <th scope="col" className="py-2 pr-4">Reach</th>
                    <th scope="col" className="py-2 pr-4">Members</th>
                    <th scope="col" className="py-2 pr-4">Amount</th>
                    <th scope="col" className="py-2 pr-4">State</th>
                    <th scope="col" className="py-2">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {s.lines.map((l: any) => (
                    <tr key={l.moduleId} className="border-t border-black/10 dark:border-white/10">
                      <td className="py-2 pr-4 font-mono">{l.moduleId}</td>
                      <td className="py-2 pr-4">{l.builtBy ?? ""}{l.platformBuilt ? " (built here)" : ""}</td>
                      <td className="py-2 pr-4 font-mono">{l.builtByAccount ?? ""}</td>
                      <td className="py-2 pr-4">{l.reach.toFixed(3)}</td>
                      <td className="py-2 pr-4">{l.membersReached}</td>
                      <td className="py-2 pr-4">{fmt(l.amount)}</td>
                      <td className="py-2 pr-4">{WHY[l.state] ?? l.state}</td>
                      <td className="py-2">
                        {l.paidAt ? (
                          <span className="opacity-70">
                            Paid{l.paidTxHash ? ` (${String(l.paidTxHash).slice(0, 10)})` : ""}
                          </span>
                        ) : l.state === "payable" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={openPayout.isPending}
                            onClick={() => openPayout.mutate({ cycleNumber: s.cycleNumber, moduleId: l.moduleId })}
                          >
                            {l.bridgeKey ? "Reopen in Hypha" : "Open in Hypha"}
                          </Button>
                        ) : (
                          <span className="opacity-50">Nothing to send</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.lines.length === 0 ? <p className="opacity-70 py-4">No module drew a share this cycle.</p> : null}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Export</CardTitle>
              <CardDescription>
                Payable lines only. The Hypha handoff above is the path that comes back with a
                transaction hash on it. This export is for a treasury tool that works another way.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs whitespace-pre overflow-x-auto p-3 rounded bg-black/5 dark:bg-white/5">
                {exported.data?.csv ?? "Loading."}
              </pre>
              {exported.data ? (
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(exported.data.csv);
                    toast.success("CSV copied.");
                  }}
                >
                  Copy CSV
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record an execution made outside the handoff</CardTitle>
              <CardDescription>
                A note, and only a note. It writes down what you say you did and nothing here
                checks it against the chain. A share sent through the Hypha handoff above is
                stamped with its own transaction when the space executes it, so this is for a
                payment made somewhere that cannot reach us.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {s.status === "executed" ? (
                <div className="text-sm">
                  <p className="opacity-70">
                    Executed {s.executedAt ? new Date(s.executedAt).toISOString().slice(0, 10) : ""}
                    {s.executedBy ? ` by ${s.executedBy}` : ""}.
                  </p>
                  <pre className="text-xs whitespace-pre-wrap mt-2 opacity-80">{s.executionNote}</pre>
                </div>
              ) : (
                <>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Transaction hashes, one per line"
                    rows={4}
                  />
                  <Button
                    className="mt-3"
                    disabled={!note.trim() || markExecuted.isPending}
                    onClick={() => markExecuted.mutate({ cycleNumber: s.cycleNumber, note })}
                  >
                    Mark cycle {s.cycleNumber} executed
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
