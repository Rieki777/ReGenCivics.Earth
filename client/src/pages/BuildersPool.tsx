/**
 * This cycle's builders' pool.
 * Route: /builders-pool
 *
 * ReGen Civics distributes a pool of $ReGen each lunar cycle across the free
 * third-party modules villages are running. A module with a price is out of the
 * pool: its builder is paid by the villages running it.
 *
 * WHAT THIS PAGE MAY SHOW, AND WHY THE LINE IS THERE (ADR-50). Module ids,
 * builder credits, village COUNTS, and amounts. Never which village runs what.
 * Each village already publishes its own module list in its own signed
 * documents, and a village speaking for itself is a different object from this
 * site joining those lists into a cross-village map of who runs what, published
 * by a party none of them asked to speak for. The server enforces this: the
 * public procedures never carry a village name, a builder address, or the
 * reason a share is waiting. This page cannot render what it is not sent.
 */

import { Link } from "wouter";
import { Coins, Moon } from "lucide-react";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { BackButton } from "@/components/BackButton";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";

const display = { fontFamily: "var(--font-display)" } as const;

const fmt = (n: number) => n.toLocaleString("en-US");
const day = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

export default function BuildersPool() {
  const current = trpc.modulePool.current.useQuery();
  const history = trpc.modulePool.history.useQuery({ limit: 12 });
  const terms = trpc.modulePool.terms.useQuery();

  const statement = current.data;

  return (
    <PageWrapper>
      <SEO
        title="The $ReGen builders' pool"
        description="Every lunar cycle, ReGen Civics shares a pool of $ReGen across the free modules that villages are running. Here is what this cycle came to."
      />
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-16">
        <BackButton />

        <AnimatedSection>
          <div className="flex items-center gap-3 mb-4">
            <Coins className="w-7 h-7 text-[#7dd87d]" aria-hidden="true" />
            <h1 className="text-3xl md:text-5xl font-bold" style={display}>
              The $ReGen builders' pool
            </h1>
          </div>
          <p className="text-lg text-white/80 max-w-2xl">
            Every lunar cycle, ReGen Civics shares a pool of $ReGen across the modules that
            villages are running. Modules that are free to use are in the pool. A module that
            charges a price is paid by the villages using it, so it is not.
          </p>
          <p className="text-white/60 mt-3 max-w-2xl">
            The split follows how many villages run each module. We publish the counts, never
            which village runs what.
          </p>
        </AnimatedSection>

        {statement ? (
          <AnimatedSection>
            <section className="mt-10 bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <Moon className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
                <h2 className="text-2xl font-bold" style={display}>
                  Cycle {statement.cycleNumber}
                </h2>
                <span className="text-white/50 text-sm">
                  closed {day(statement.cycleEndsAt)}
                </span>
              </div>

              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div>
                  <dt className="text-white/50 text-sm">Pool</dt>
                  <dd className="text-xl font-semibold">{fmt(statement.pool)} $ReGen</dd>
                </div>
                <div>
                  <dt className="text-white/50 text-sm">Sent to builders</dt>
                  <dd className="text-xl font-semibold">{fmt(statement.paid)} $ReGen</dd>
                </div>
                <div>
                  <dt className="text-white/50 text-sm">Waiting to be claimed</dt>
                  <dd className="text-xl font-semibold">{fmt(statement.accrued)} $ReGen</dd>
                </div>
                <div>
                  <dt className="text-white/50 text-sm">Villages counted</dt>
                  <dd className="text-xl font-semibold">
                    {statement.roster.ok + statement.roster.carried} of {statement.roster.total}
                  </dd>
                </div>
              </dl>

              {statement.roster.carried > 0 || statement.roster.absent > 0 ? (
                <p className="text-white/50 text-sm mt-4">
                  {statement.roster.carried > 0
                    ? `${statement.roster.carried} village${statement.roster.carried === 1 ? " was" : "s were"} unreachable and counted from the last list we had. `
                    : ""}
                  {statement.roster.absent > 0
                    ? `${statement.roster.absent} village${statement.roster.absent === 1 ? "" : "s"} could not be counted this cycle.`
                    : ""}
                </p>
              ) : null}

              {statement.modules.length > 0 ? (
                <div className="mt-8 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-white/50">
                      <tr>
                        <th scope="col" className="py-2 pr-4 font-medium">Module</th>
                        <th scope="col" className="py-2 pr-4 font-medium">Built by</th>
                        <th scope="col" className="py-2 pr-4 font-medium">Villages</th>
                        <th scope="col" className="py-2 pr-4 font-medium">Share</th>
                        <th scope="col" className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.modules.map((m) => (
                        <tr key={m.moduleId} className="border-t border-white/10">
                          <td className="py-3 pr-4 font-mono">{m.moduleId}</td>
                          <td className="py-3 pr-4">{m.builtBy ?? ""}</td>
                          <td className="py-3 pr-4">{m.villages}</td>
                          <td className="py-3 pr-4">{fmt(m.amount)} $ReGen</td>
                          <td className="py-3 text-white/60">{m.settled ? "Sent" : "Waiting"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-white/60 mt-6">
                  No module drew from the pool this cycle.
                </p>
              )}

              {statement.snapshotHash ? (
                <p className="text-white/40 text-xs mt-6 font-mono break-all">
                  snapshot {statement.snapshotHash}
                </p>
              ) : null}
            </section>
          </AnimatedSection>
        ) : (
          <AnimatedSection>
            <section className="mt-10 bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-3" style={display}>
                No cycle has closed yet
              </h2>
              <p className="text-white/70">
                Every module in the platform today was built by ReGen Civics, so the pool has
                nobody outside to pay. The first cycle with a line in it will show up here.
              </p>
            </section>
          </AnimatedSection>
        )}

        {terms.data && terms.data.payableModules.length > 0 ? (
          <AnimatedSection>
            <section className="mt-8">
              <h2 className="text-xl font-bold mb-3" style={display}>
                Modules the pool can pay
              </h2>
              <ul className="text-white/70 space-y-1">
                {terms.data.payableModules.map((m) => (
                  <li key={m.moduleId}>
                    <span className="font-mono">{m.moduleId}</span>, built by {m.builtBy}
                  </li>
                ))}
              </ul>
            </section>
          </AnimatedSection>
        ) : null}

        {history.data && history.data.length > 1 ? (
          <AnimatedSection>
            <section className="mt-8">
              <h2 className="text-xl font-bold mb-3" style={display}>
                Earlier cycles
              </h2>
              <ul className="text-white/70 space-y-1">
                {history.data.map((h) => (
                  <li key={h.cycleNumber}>
                    Cycle {h.cycleNumber}, closed {day(h.cycleEndsAt)}: {fmt(h.paid)} $ReGen to builders
                  </li>
                ))}
              </ul>
            </section>
          </AnimatedSection>
        ) : null}

        <AnimatedSection>
          <p className="text-white/50 text-sm mt-10">
            Modules are built for the villages listed on the{" "}
            <Link href="/network" className="underline hover:text-white">network page</Link>.
            To be paid from the pool, a builder holds a ReGen Civics account with their Hypha
            account and Base address linked in their profile.
          </p>
        </AnimatedSection>
      </div>
    </PageWrapper>
  );
}
