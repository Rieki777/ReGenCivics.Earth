import { POOL_CAPITALS, POOL_EVERYDAY } from "@shared/characterSheet";
import { CAPITAL_LABELS } from "@shared/crowdpoolingTaxonomy";

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
