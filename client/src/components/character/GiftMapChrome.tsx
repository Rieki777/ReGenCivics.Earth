import { Link } from "wouter";
import { POOL_CAPITALS, POOL_EVERYDAY } from "@shared/characterSheet";
import { CAPITAL_LABELS } from "@shared/crowdpoolingTaxonomy";
import { CONTRIBUTOR_DOOR, CROWDPOOLING_WORDING, HOW_IT_WORKS } from "@shared/crowdpoolCopy";
import { GAME_NEEDS, GAME_NEEDS_LABEL, READINESS_HREF } from "@shared/crowdpoolReadiness";

const STEPS = ["Choose", "Gifts now", "Future roles", "Your sheet", "Share"];

export function PathChoices({
  path,
  onChange,
}: {
  path: "project" | "general";
  onChange: (path: "project" | "general") => void;
}) {
  return (
    <fieldset className="sheet-section">
      <legend className="sr-only">Where these gifts go</legend>
      <div className="sheet-paths">
        <label className={path === "project" ? "sheet-path sheet-path-on" : "sheet-path"}>
          <input
            type="radio"
            name="gift-path"
            checked={path === "project"}
            onChange={() => onChange("project")}
          />
          <span className="sheet-display sheet-path-title">Apply to a specific project</span>
          <span className="sheet-path-body">One land project on this sheet.</span>
        </label>
        <label className={path === "general" ? "sheet-path sheet-path-on" : "sheet-path"}>
          <input
            type="radio"
            name="gift-path"
            checked={path === "general"}
            onChange={() => onChange("general")}
          />
          <span className="sheet-display sheet-path-title">Map my gifts (general)</span>
          <span className="sheet-path-body">A sheet you can share with many projects.</span>
        </label>
      </div>
    </fieldset>
  );
}

function Node({ capital }: { capital: (typeof POOL_CAPITALS)[number] }) {
  const everyday = POOL_EVERYDAY[capital];
  return (
    <div className="sheet-node">
      <span className="sheet-display sheet-node-name">{CAPITAL_LABELS[capital].label}</span>
      {everyday ? <span className="sheet-node-sub">{everyday}</span> : null}
    </div>
  );
}

export function GiftPoolDiagram() {
  return (
    <section className="sheet-section" aria-labelledby="how-gifts-pool">
      <h2 id="how-gifts-pool" className="sheet-display sheet-h2">How gifts pool</h2>
      <div
        className="sheet-pool-narrow"
        aria-label="Living, Material, Financial, Experiential, Social, and Cultural pool into one land project."
      >
        {POOL_CAPITALS.map((capital) => <Node key={capital} capital={capital} />)}
        <div className="sheet-node sheet-node-project">
          <span className="sheet-display sheet-node-name">Land project</span>
          <span className="sheet-node-sub">the pool</span>
        </div>
      </div>
      <svg className="sheet-pool-wide" viewBox="0 0 1000 240" role="img" aria-label="Living, Material, Financial, Experiential, Social, and Cultural pool into one land project.">
        {POOL_CAPITALS.map((capital, index) => {
          const col = index % 3;
          const row = index < 3 ? 0 : 1;
          const x = 24 + col * 184;
          const y = row === 0 ? 28 : 148;
          const everyday = POOL_EVERYDAY[capital];
          return (
            <g key={capital}>
              <rect x={x} y={y} width="168" height="64" rx="14" fill="var(--sheet-raised)" stroke="var(--sheet-edge)" />
              <text x={x + 84} y={everyday ? y + 28 : y + 38} textAnchor="middle" fill="var(--sheet-ink)" fontSize="16" fontFamily="var(--sheet-display)">
                {CAPITAL_LABELS[capital].label}
              </text>
              {everyday ? (
                <text x={x + 84} y={y + 48} textAnchor="middle" fill="var(--sheet-dim)" fontSize="12">
                  {everyday}
                </text>
              ) : null}
              <path
                d={`M ${x + 168} ${y + 32} C ${x + 250} ${y + 32}, 700 ${row === 0 ? 90 : 150}, 748 ${120}`}
                fill="none"
                stroke="var(--sheet-living)"
                strokeWidth="2"
              />
            </g>
          );
        })}
        <rect x="748" y="58" width="220" height="124" rx="16" fill="var(--sheet-raised)" stroke="var(--sheet-gold)" />
        <text x="858" y="112" textAnchor="middle" fill="var(--sheet-gold-lit)" fontSize="20" fontFamily="var(--sheet-display)">Land project</text>
        <text x="858" y="136" textAnchor="middle" fill="var(--sheet-dim)" fontSize="14">the pool</text>
      </svg>
    </section>
  );
}

export function QuestLine() {
  return (
    <section className="sheet-section" aria-labelledby="gift-quest">
      <h2 id="gift-quest" className="sr-only">Quest line</h2>
      <ol className="sheet-quest">
        {STEPS.map((step, index) => (
          <li key={step}>
            <span className="sheet-display sheet-quest-n">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LockedMatch() {
  return (
    <section className="sheet-section sheet-panel" aria-labelledby="project-matching">
      <h2 id="project-matching" className="sheet-display sheet-h2">Coming soon: project matching</h2>
      <p className="sheet-muted">
        When 111 land-project campaigns are active, this sheet will suggest projects that fit these gifts.
      </p>
      <div className="sheet-locked-slots">
        <div className="sheet-slot">Hidden</div>
        <div className="sheet-slot">Hidden</div>
        <div className="sheet-slot">Hidden</div>
      </div>
      <p className="sheet-quiet">Opens at 111+ active campaigns.</p>
    </section>
  );
}

/**
 * What a contributor looks for first (build spec 2026-10-01, section 16.2):
 * what happens to an offer, that money never moves through the site, what
 * happens if a campaign doesn't complete, and a short path to open needs.
 * The steps are HOW_IT_WORKS and the paragraph CROWDPOOLING_WORDING, verbatim.
 * The needs projects are meeting are one line of text, no chips, so nothing
 * looks tappable; before the move they showed only inside the Ready list.
 */
export function HowHelpingWorks() {
  return (
    <section className="sheet-section sheet-panel" aria-labelledby="helping-works">
      <h2 id="helping-works" className="sheet-display sheet-h2">{CONTRIBUTOR_DOOR.heading}</h2>
      <ol className="list-decimal pl-5 space-y-2">
        {HOW_IT_WORKS.map((step) => (
          <li key={step.title}>
            <strong>{step.title}.</strong> <span className="sheet-muted">{step.body}</span>
          </li>
        ))}
      </ol>
      <p className="sheet-muted mt-3">{CROWDPOOLING_WORDING}</p>
      <p className="sheet-muted mt-2">{GAME_NEEDS_LABEL}: {GAME_NEEDS.join(", ")}.</p>
      <div className="sheet-actions">
        <Link href="/campaigns?tab=needs" className="sheet-action sheet-action-gold inline-flex items-center">
          {CONTRIBUTOR_DOOR.needsButton}
        </Link>
        <Link href="/campaigns" className="sheet-link inline-flex min-h-11 items-center">
          {CONTRIBUTOR_DOOR.browse}
        </Link>
      </div>
    </section>
  );
}

/** One quiet line for a land project that wandered in: the list lives on the creator front door. */
export function ProjectLine() {
  return (
    <p className="sheet-quiet sheet-section">
      {CONTRIBUTOR_DOOR.projectLead}{" "}
      <Link href={READINESS_HREF} className="sheet-link">
        {CONTRIBUTOR_DOOR.projectLink}
      </Link>
    </p>
  );
}
