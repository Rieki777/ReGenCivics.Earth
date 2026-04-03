export default function SeasonalRhythmSection() {
  const seasons = [
    {
      emoji: "❄️",
      name: "Winter",
      color: "#93c5fd",
      months: "Dec – Mar",
      theme: "Building & Preparing",
      description:
        "The quiet season. We plan, build infrastructure, and prepare the soil for what comes next. Internal work, deep conversations, strategy sessions.",
      roles: ["Builders", "Strategists", "Stewards"],
      current: true,
    },
    {
      emoji: "🌸",
      name: "Spring",
      color: "#7dd87d",
      months: "Mar – Jun",
      theme: "Incubation & Growth",
      description:
        "New projects sprout. The incubator opens, land projects apply, and the community rallies around what wants to grow.",
      roles: ["Incubators", "Mentors", "Scouts"],
      current: false,
    },
    {
      emoji: "☀️",
      name: "Summer",
      color: "#fbbf24",
      months: "Jun – Sep",
      theme: "Festivals & Village Building",
      description:
        "We gather in person. Festivals, land visits, village builds, and the energy of shared physical work under open sky.",
      roles: ["Organizers", "Hosts", "Land Partners"],
      current: false,
    },
    {
      emoji: "🍂",
      name: "Fall",
      color: "#d4a574",
      months: "Sep – Dec",
      theme: "Rest & Reflection",
      description:
        "Harvest what grew. Reflect on what worked, compost what didn't, and let the community rest before the next cycle begins.",
      roles: ["Harvesters", "Storytellers", "Council Members"],
      current: false,
    },
  ];

  const festivalSteps = [
    {
      label: "Reflect",
      description: "Look back at the season. What grew? What composted? What surprised us?",
    },
    {
      label: "Co-Create",
      description: "Shape the priorities and direction for the next season together.",
    },
    {
      label: "Choose",
      description: "Commit to roles, quests, and projects for the coming cycle.",
    },
  ];

  const rhythmPoints = [
    "Seasons set the pace. Each season has a clear theme, and quests shift to match.",
    "Gratitude flows at the full moon. Recognition and appreciation happen on a lunar schedule.",
    "Harvest happens at the season's end. We gather the fruits, share the stories, name what worked.",
    "Composting follows harvest. What didn't serve gets released with care, making room for new growth.",
    "Natural time keeps us honest. No sprints. No quarterly targets. The land doesn't rush, and we follow its lead.",
  ];

  return (
    <section
      style={{
        background: "linear-gradient(180deg, #0d2818 0%, #1a472a 50%, #0d2818 100%)",
        color: "#e2e8f0",
        padding: "5rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
        {/* 1. Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #b8860b, #daa520)",
              color: "#1a1a1a",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              marginBottom: "1rem",
            }}
          >
            How We Coordinate
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.25rem",
              fontWeight: 700,
              color: "#ffffff",
              margin: 0,
            }}
          >
            The Rhythm of the Infinite Game
          </h2>
        </div>

        {/* 2. Two Layers Intro */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginBottom: "3rem",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: "1rem",
              padding: "1.5rem",
              border: "1px solid rgba(125,216,125,0.15)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#7dd87d",
                margin: "0 0 0.5rem",
              }}
            >
              Macro: The Four Seasons
            </h3>
            <p style={{ margin: 0, lineHeight: 1.6, color: "#cbd5e1" }}>
              Solstice to solstice, roughly 91 days each. The big arcs of our
              year, from building to growing to gathering to resting.
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: "1rem",
              padding: "1.5rem",
              border: "1px solid rgba(125,216,125,0.15)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#7dd87d",
                margin: "0 0 0.5rem",
              }}
            >
              Micro: The Lunar Cycle
            </h3>
            <p style={{ margin: 0, lineHeight: 1.6, color: "#cbd5e1" }}>
              New moon to new moon, roughly 29.5 days. The heartbeat within each
              season. Gratitude, reflection, and energy follow the moon.
            </p>
          </div>
        </div>

        {/* 3. Four Season Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
            marginBottom: "3.5rem",
          }}
        >
          {seasons.map((s) => (
            <div
              key={s.name}
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: "1rem",
                padding: "1.5rem",
                border: `1px solid ${s.color}33`,
                position: "relative",
              }}
            >
              {s.current && (
                <span
                  style={{
                    position: "absolute",
                    top: "0.75rem",
                    right: "0.75rem",
                    background: s.color,
                    color: "#0d2818",
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "9999px",
                  }}
                >
                  Current Season
                </span>
              )}
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{s.emoji}</div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: s.color,
                  margin: "0 0 0.125rem",
                }}
              >
                {s.name}
              </h3>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#94a3b8",
                  margin: "0 0 0.25rem",
                }}
              >
                {s.months}
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#e2e8f0",
                  margin: "0 0 0.5rem",
                }}
              >
                {s.theme}
              </p>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#cbd5e1", margin: "0 0 0.75rem" }}>
                {s.description}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {s.roles.map((role) => (
                  <span
                    key={role}
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      background: `${s.color}1a`,
                      color: s.color,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "9999px",
                      border: `1px solid ${s.color}33`,
                    }}
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 4. Season Festival */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "3.5rem",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "1rem",
            padding: "2rem 1.5rem",
            border: "1px solid rgba(125,216,125,0.1)",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#ffffff",
              margin: "0 0 0.5rem",
            }}
          >
            The Seasonal Festival
          </h3>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.875rem",
              margin: "0 0 2rem",
              maxWidth: "32rem",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            At the turn of each season, the community gathers (online or in person) for a
            festival that marks the transition. Three movements:
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1.25rem",
              maxWidth: "48rem",
              margin: "0 auto 1.5rem",
            }}
          >
            {festivalSteps.map((step, i) => (
              <div key={step.label}>
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #7dd87d, #1a472a)",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "1rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  {i + 1}
                </div>
                <h4
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: "#7dd87d",
                    margin: "0 0 0.25rem",
                  }}
                >
                  {step.label}
                </h4>
                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", margin: 0, lineHeight: 1.5 }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>
            Festivals fall near the solstices and equinoxes. The exact date flexes to fit the
            community's energy.
          </p>
        </div>

        {/* 5. Lunar Pulse */}
        <div style={{ marginBottom: "3.5rem" }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#ffffff",
              textAlign: "center",
              margin: "0 0 1.5rem",
            }}
          >
            The Lunar Pulse
          </h3>

          {/* Moon phase gradient bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(90deg, #1e293b 0%, #334155 25%, #e2e8f0 50%, #334155 75%, #1e293b 100%)",
              borderRadius: "9999px",
              padding: "0.75rem 1.5rem",
              marginBottom: "1.5rem",
              maxWidth: "32rem",
              margin: "0 auto 1.5rem",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>🌑</span>
            <span style={{ fontSize: "1.5rem" }}>🌓</span>
            <span style={{ fontSize: "1.5rem" }}>🌕</span>
            <span style={{ fontSize: "1.5rem" }}>🌗</span>
            <span style={{ fontSize: "1.5rem" }}>🌑</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: "1rem",
                padding: "1.5rem",
                border: "1px solid rgba(226,232,240,0.15)",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🌕</div>
              <h4
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  color: "#e2e8f0",
                  margin: "0 0 0.375rem",
                }}
              >
                Full Moon Energy
              </h4>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#cbd5e1", margin: 0 }}>
                Peak visibility. Gratitude rounds happen here. Players recognize each other's
                contributions, and the community celebrates what's been built since the last full
                moon.
              </p>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: "1rem",
                padding: "1.5rem",
                border: "1px solid rgba(226,232,240,0.15)",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🌑</div>
              <h4
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  color: "#e2e8f0",
                  margin: "0 0 0.375rem",
                }}
              >
                New Moon Energy
              </h4>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#cbd5e1", margin: 0 }}>
                Quiet beginnings. Intentions are set, new quests open, and the cycle resets. A
                good time to start something, plant a seed, or simply rest.
              </p>
            </div>
          </div>
        </div>

        {/* 6. How the Game Follows the Rhythm */}
        <div style={{ marginBottom: "3.5rem" }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#ffffff",
              margin: "0 0 1.25rem",
            }}
          >
            How the Game Follows the Rhythm
          </h3>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {rhythmPoints.map((point, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  fontSize: "0.925rem",
                  lineHeight: 1.6,
                  color: "#cbd5e1",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "50%",
                    background: "#7dd87d",
                    marginTop: "0.5rem",
                  }}
                />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* 7. Philosophy Note */}
        <div
          style={{
            textAlign: "center",
            maxWidth: "40rem",
            margin: "0 auto",
            padding: "1.5rem",
            borderTop: "1px solid rgba(125,216,125,0.15)",
          }}
        >
          <p
            style={{
              fontStyle: "italic",
              fontSize: "0.95rem",
              lineHeight: 1.7,
              color: "#94a3b8",
              margin: 0,
            }}
          >
            We organize around biological cycles because we are biological beings. The seasons
            and the moon have coordinated life on this planet for billions of years. We are
            simply remembering how to listen.
          </p>
        </div>
      </div>
    </section>
  );
}

export { SeasonalRhythmSection };
