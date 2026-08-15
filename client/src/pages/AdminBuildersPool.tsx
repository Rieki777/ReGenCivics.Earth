/**
 * The builders' pool, operator view (ADR-50).
 * Route: /admin/builders-pool
 *
 * The full statement: who is owed, where it goes, why a share is waiting, and
 * the export a treasury tool consumes. Everything the public page withholds.
 *
 * THERE IS NO PAY BUTTON, AND THERE CANNOT BE ONE. This page reads a statement
 * and records that a human executed it somewhere else. The transfers happen in
 * Hypha, from the treasury, by a person. `server/blockchain.ts` is read-only,
 * no wallet, no signing, and nothing behind this page can move a token.
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
  "no-account": "No ReGen Civics account for that handle yet",
  "no-address": "Account found, no Base address linked in their profile",
  "unusable-address": "The linked address is not a valid Base address",
  "below-floor": "Share is under the dust floor, so it is not sent",
};

export default function AdminBuildersPool() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = !!user && (user.role === "admin" || user.role === "superadmin");
  const [note, setNote] = useState("");

  const statement = trpc.modulePool.adminStatement.useQuery(undefined, { enabled: isAdmin });
  const cycleNumber = statement.data?.cycleNumber;
  const exported = trpc.modulePool.adminExport.useQuery(
    { cycleNumber: cycleNumber ?? 0 },
    { enabled: isAdmin && typeof cycleNumber === "number" },
  );
  const markExecuted = trpc.modulePool.markExecuted.useMutation({
    onSuccess: () => {
      toast.success("Recorded. The statement now says a human executed it.");
      statement.refetch();
      setNote("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (authLoading || (isAdmin && statement.isLoading)) return <TaoSpinner fullPage size={72} />;

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Admins only</h1>
        <a href={getLoginUrl()} className="underline">Sign in</a>
      </div>
    );
  }

  const s = statement.data;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">The $ReGen builders' pool</h1>
        <Link href="/builders-pool" className="underline text-sm">See the public page</Link>
      </div>

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
              <dl className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div><dt className="opacity-60">Pool</dt><dd className="text-lg font-semibold">{fmt(s.pool)}</dd></div>
                <div><dt className="opacity-60">Carried in</dt><dd className="text-lg font-semibold">{fmt(s.carryIn)}</dd></div>
                <div><dt className="opacity-60">Payable</dt><dd className="text-lg font-semibold">{fmt(s.paid)}</dd></div>
                <div><dt className="opacity-60">Accrued</dt><dd className="text-lg font-semibold">{fmt(s.accrued)}</dd></div>
                <div><dt className="opacity-60">Unallocated</dt><dd className="text-lg font-semibold">{fmt(s.unallocated)}</dd></div>
              </dl>
              <p className="text-sm opacity-70 mt-4">
                {fmt(s.pool)} + {fmt(s.carryIn)} = {fmt(s.paid)} + {fmt(s.accrued)} + {fmt(s.unallocated)}.
                {" "}
                {s.pool + s.carryIn === s.paid + s.accrued + s.unallocated
                  ? "The statement balances."
                  : "The statement does NOT balance. Do not execute it."}
              </p>
              {s.snapshotHash ? (
                <p className="text-xs opacity-50 mt-2 font-mono break-all">snapshot {s.snapshotHash}</p>
              ) : null}
              <p className="text-sm opacity-70 mt-4">
                Roster: {s.roster.ok} answered, {s.roster.carried} counted from a stored list,
                {" "}{s.roster.absent} could not be counted.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Lines</CardTitle>
              <CardDescription>Every module that drew a share, and where it stands.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="opacity-60">
                  <tr>
                    <th scope="col" className="py-2 pr-4">Module</th>
                    <th scope="col" className="py-2 pr-4">Builder</th>
                    <th scope="col" className="py-2 pr-4">Handle</th>
                    <th scope="col" className="py-2 pr-4">Villages</th>
                    <th scope="col" className="py-2 pr-4">Amount</th>
                    <th scope="col" className="py-2 pr-4">Address</th>
                    <th scope="col" className="py-2">State</th>
                  </tr>
                </thead>
                <tbody>
                  {s.lines.map((l: any) => (
                    <tr key={l.moduleId} className="border-t border-black/10 dark:border-white/10">
                      <td className="py-2 pr-4 font-mono">{l.moduleId}</td>
                      <td className="py-2 pr-4">{l.builtBy ?? ""}</td>
                      <td className="py-2 pr-4 font-mono">{l.builtByAccount ?? ""}</td>
                      <td className="py-2 pr-4">{l.villages}</td>
                      <td className="py-2 pr-4">{fmt(l.amount)}</td>
                      <td className="py-2 pr-4 font-mono text-xs break-all">{l.address ?? ""}</td>
                      <td className="py-2">{WHY[l.state] ?? l.state}</td>
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
                Payable lines only. Copy this into the treasury tool, make the transfers in
                Hypha, then record what happened below.
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
              <CardTitle>Record the execution</CardTitle>
              <CardDescription>
                This writes down what you did in Hypha. It does not move anything, and nothing
                here can. Paste the transaction hashes.
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
