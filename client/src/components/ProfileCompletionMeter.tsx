/**
 * ProfileCompletionMeter
 * Shows profile completeness as a horizontal progress bar + checklist.
 */

import { useState } from "react";

interface ProfileCompletionMeterProps {
  profile: {
    displayName?: string | null;
    bio?: string | null;
    questInterests?: string | null;
    avatarUrl?: string | null;
    [key: string]: unknown;
  };
  questsCompleted: string[];
}

interface Step {
  label: string;
  done: boolean;
}

function getSteps(
  profile: ProfileCompletionMeterProps["profile"],
  questsCompleted: string[]
): Step[] {
  return [
    {
      label: "Display name set",
      done: Boolean(profile.displayName && profile.displayName.trim().length > 0),
    },
    {
      label: "Bio written",
      done: Boolean(profile.bio && profile.bio.length > 20),
    },
    {
      label: "Focus areas selected",
      done: Boolean(profile.questInterests && profile.questInterests.trim().length > 0),
    },
    {
      label: "First quest completed",
      done: questsCompleted.length > 0,
    },
    {
      label: "Avatar uploaded",
      done: Boolean(profile.avatarUrl && profile.avatarUrl.trim().length > 0),
    },
  ];
}

export function ProfileCompletionMeter({ profile, questsCompleted }: ProfileCompletionMeterProps) {
  const [tooltip, setTooltip] = useState<number | null>(null);

  const steps = getSteps(profile, questsCompleted);
  const doneCount = steps.filter((s) => s.done).length;
  const percentage = Math.round((doneCount / steps.length) * 100);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8e4",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#1a472a",
            letterSpacing: "0.01em",
          }}
        >
          Profile Strength
        </span>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#1a472a",
          }}
        >
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "6px",
          background: "#e8f5e8",
          borderRadius: "3px",
          overflow: "hidden",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            background: "#7dd87d",
            borderRadius: "3px",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Checklist */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        {steps.map((step, idx) => (
          <li
            key={step.label}
            style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}
          >
            <span
              style={{
                fontSize: "14px",
                color: step.done ? "#7dd87d" : "#b0c4b8",
                flexShrink: 0,
                lineHeight: 1,
              }}
              aria-hidden="true"
            >
              {step.done ? "✓" : "○"}
            </span>
            <span
              style={{
                fontSize: "13px",
                color: step.done ? "#1a472a" : "#4a7c59",
                opacity: step.done ? 1 : 0.75,
                cursor: step.done ? "default" : "pointer",
              }}
              onMouseEnter={() => { if (!step.done) setTooltip(idx); }}
              onMouseLeave={() => setTooltip(null)}
            >
              {step.label}
            </span>
            {tooltip === idx && !step.done && (
              <span
                style={{
                  position: "absolute",
                  left: "140px",
                  top: "-2px",
                  background: "#1a472a",
                  color: "#fff",
                  fontSize: "11px",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                Visit your profile to update.
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProfileCompletionMeter;
