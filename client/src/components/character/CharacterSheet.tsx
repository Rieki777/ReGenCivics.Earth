/**
 * Village OS character sheet, local to ReGen Civics.
 * Round portrait, class, party rail, standing row. No guessed numbers.
 * The maturity arc draws only when both rung numbers are passed in.
 */
import { useState } from "react";
import { ARCHETYPES } from "@shared/archetypes";
import {
  arcDash,
  archetypeByKey,
  classPortraitSrc,
  type PortraitPresentation,
  visibleStanding,
  type StandingFigures,
} from "@shared/characterSheet";

export type CharacterSheetProps = {
  displayName: string;
  primaryKey: string | null;
  partyKeys: string[];
  portraitPresentation: PortraitPresentation | null;
  /** A future pull may pass a portrait URL the village serves. */
  portraitUrl?: string | null;
  stageIndex?: number | null;
  stageCount?: number | null;
  standing?: StandingFigures;
  editable?: boolean;
  signedIn?: boolean;
  statusLine?: string;
  emptyMessage?: string;
  onChoose?: (key: string) => void;
  onFront?: (key: string) => void;
  onPortrait?: (presentation: PortraitPresentation | null) => void;
  signInHref?: string;
};

function money(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function CharacterSheet({
  displayName,
  primaryKey,
  partyKeys,
  portraitPresentation,
  portraitUrl,
  stageIndex,
  stageCount,
  standing,
  editable = false,
  signedIn = false,
  statusLine = "",
  emptyMessage,
  onChoose,
  onFront,
  onPortrait,
  signInHref = "/sign-in",
}: CharacterSheetProps) {
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const [picking, setPicking] = useState(false);
  const primary = archetypeByKey(primaryKey);
  const arc = arcDash(
    typeof stageIndex === "number" && typeof stageCount === "number" && stageCount > 0
      ? Math.max(0, Math.min(1, (stageIndex + 1) / stageCount))
      : null,
  );
  const portrait = portraitUrl
    || classPortraitSrc(primaryKey, portraitPresentation);
  const showPortrait = Boolean(portrait) && !broken.hero;
  const figures = standing ? visibleStanding(standing) : null;
  const initial = primary ? primary.name.replace(/^The\s+/i, "").slice(0, 1) : "";

  return (
    <section className="sheet-panel" aria-label="Character">
      <div className="sheet-hero">
        <div className="sheet-portrait">
          {arc && (
            <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <circle cx="130" cy="130" r="122" fill="none" stroke="var(--sheet-edge)" strokeWidth="3" />
              <circle
                cx="130"
                cy="130"
                r="122"
                fill="none"
                stroke="var(--sheet-gold)"
                strokeWidth="6"
                strokeLinecap="round"
                transform="rotate(-90 130 130)"
                strokeDasharray={arc.circumference.toFixed(1)}
                strokeDashoffset={arc.offset.toFixed(1)}
              />
            </svg>
          )}
          {!arc && (
            <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <circle cx="130" cy="130" r="122" fill="none" stroke="var(--sheet-edge)" strokeWidth="3" />
            </svg>
          )}
          <div className="sheet-portrait-face">
            {showPortrait ? (
              <img
                src={portrait ?? ""}
                alt={primary ? `${primary.name}, class illustration` : ""}
                onError={() => setBroken((b) => ({ ...b, hero: true }))}
              />
            ) : (
              <span className="sheet-display sheet-portrait-letter">{initial}</span>
            )}
          </div>
        </div>
        <div>
          <p className="sheet-kicker">Village OS character</p>
          <h2 className="sheet-display sheet-h1">{displayName}</h2>
          {primary ? (
            <p className="sheet-class">
              {primary.name}
              {primary.subtitle ? ` · ${primary.subtitle}` : ""}
            </p>
          ) : signedIn ? (
            <p className="sheet-muted">{emptyMessage || "No class chosen yet."}</p>
          ) : (
            <p className="sheet-muted">
              Sign in to keep a class on your profile.{" "}
              <a className="sheet-link" href={signInHref}>Sign in</a>
            </p>
          )}
        </div>
      </div>

      {partyKeys.length > 0 && (
        <div className="sheet-party">
          {partyKeys.map((key) => {
            const archetype = archetypeByKey(key);
            const src = portraitUrl && key === primaryKey
              ? portraitUrl
              : classPortraitSrc(key, portraitPresentation);
            const label = archetype?.name ?? key;
            return (
              <button
                key={key}
                type="button"
                className={key === primaryKey ? "sheet-party-card sheet-party-card-on" : "sheet-party-card"}
                aria-pressed={key === primaryKey}
                aria-label={`Front ${label}`}
                disabled={!editable}
                onClick={() => onFront?.(key)}
              >
                <span className="sheet-party-art">
                  {src && !broken[key] ? (
                    <img
                      src={src}
                      alt=""
                      onError={() => setBroken((b) => ({ ...b, [key]: true }))}
                    />
                  ) : (
                    <span className="sheet-display sheet-party-letter">
                      {label.replace(/^The\s+/i, "").slice(0, 1)}
                    </span>
                  )}
                </span>
                {key === primaryKey ? <span className="sheet-star" aria-hidden="true">★</span> : null}
              </button>
            );
          })}
        </div>
      )}
      {partyKeys.length > 1 && editable ? (
        <p className="sheet-quiet">Tap a class to front your sheet.</p>
      ) : null}

      {figures && (
        <div className="sheet-standing">
          {figures.brings !== undefined && (
            <div className="sheet-figure">
              <b className="sheet-display sheet-gold">{money(figures.brings)}</b>
              <span>Brings to land projects</span>
            </div>
          )}
          {figures.gifts !== undefined && (
            <div className="sheet-figure">
              <b className="sheet-display sheet-living">{figures.gifts}</b>
              <span>Gifts recorded</span>
            </div>
          )}
          {figures.roles !== undefined && (
            <div className="sheet-figure">
              <b className="sheet-display">{figures.roles}</b>
              <span>Future roles</span>
            </div>
          )}
        </div>
      )}

      {editable && (
        <div className="sheet-section">
          <button type="button" className="sheet-text-btn" aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
            {primary ? "Change class" : "Choose a class"}
          </button>
          {picking && (
            <div className="sheet-classes" role="group" aria-label="Classes">
              {ARCHETYPES.map((archetype) => (
                <button
                  key={archetype.key}
                  type="button"
                  className="sheet-class-btn"
                  aria-pressed={archetype.key === primaryKey}
                  onClick={() => {
                    onChoose?.(archetype.key);
                    setPicking(false);
                  }}
                >
                  <span className="sheet-display">{archetype.name}</span>
                  <span className="sheet-muted"> {archetype.subtitle}</span>
                </button>
              ))}
            </div>
          )}
          {primary && onPortrait && (
            <div className="sheet-actions" role="group" aria-label="Class illustration">
              <button type="button" className="sheet-text-btn" aria-pressed={portraitPresentation === "f"} onClick={() => onPortrait("f")}>
                Illustration one
              </button>
              <button type="button" className="sheet-text-btn" aria-pressed={portraitPresentation === "m"} onClick={() => onPortrait("m")}>
                Illustration two
              </button>
              <button type="button" className="sheet-text-btn" aria-pressed={portraitPresentation === null} onClick={() => onPortrait(null)}>
                Letter only
              </button>
            </div>
          )}
        </div>
      )}
      <p aria-live="polite" className="sr-only">{statusLine}</p>
    </section>
  );
}
