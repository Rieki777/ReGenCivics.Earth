/**
 * Stage 0 after the session: the full recap. Facts first.
 * There is no per-person check model for these tasks, so next steps
 * are a list. A signed-in player follows a task link to its page.
 */
import { trpc } from "@/lib/trpc";
import type { RecapItem } from "@shared/recapDigest";

function Lines({ items }: { items: RecapItem[] }) {
  if (!items.length) return null;
  return (
    <ul className="sb-recap-list">
      {items.map((item) => (
        <li key={item.text}>
          {item.href ? <a className="sb-link" href={item.href}>{item.text}</a> : item.text}
          {item.note ? <span className="sb-recap-note"> ({item.note})</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function SessionRecap({ week }: { week: number }) {
  const recap = trpc.sessionBoard.recap.useQuery({ week }, { retry: false, staleTime: 60_000 });
  if (recap.isLoading) return <p className="sb-empty">Opening the recap.</p>;
  const data = recap.data;
  if (!data) return <p className="sb-empty">The recap didn't load. Refresh the page.</p>;
  const bare = data.gist.length === 0 && data.insights.length === 0 && data.steps.length === 0 && data.watches.length === 0;
  if (bare) return null;

  return (
    <div className="sb-recap">
      <p className="sb-kicker">Week {week} recap</p>
      <h1 className="sb-hero">{data.title}</h1>
      {data.gist.length ? (
        <section>
          <h2 className="sb-h3">The gist</h2>
          <ul className="sb-recap-list">
            {data.gist.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>
      ) : null}
      {data.insights.length ? (
        <section>
          <h2 className="sb-h3">Key insights</h2>
          <Lines items={data.insights} />
        </section>
      ) : null}
      {data.steps.length ? (
        <section>
          <h2 className="sb-h3">Your next steps</h2>
          <Lines items={data.steps} />
        </section>
      ) : null}
      {data.watches.length ? (
        <div className="sb-recap-actions">
          {data.watches.map((watch, index) => (
            <a key={watch.href} className={index === 0 ? "sb-btn sb-primary" : "sb-btn"} href={watch.href}>
              {watch.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
