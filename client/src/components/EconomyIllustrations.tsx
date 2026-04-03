/**
 * EconomyIllustrations - SVG illustrations for the /economy page sections.
 * Lightweight, theme-matched, no external images needed.
 */

/** Hero: circular flow of value through communities */
export function EconomyHeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 400" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="eco-hero-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4A017" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="eco-hero-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7dd87d" stopOpacity="0" />
          <stop offset="30%" stopColor="#7dd87d" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#D4A017" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Central glow */}
      <circle cx="400" cy="200" r="180" fill="url(#eco-hero-glow)" />

      {/* Circular flow paths */}
      <ellipse cx="400" cy="200" rx="160" ry="80" fill="none" stroke="#7dd87d" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="8 6">
        <animateTransform attributeName="transform" type="rotate" from="0 400 200" to="360 400 200" dur="60s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="400" cy="200" rx="220" ry="110" fill="none" stroke="#D4A017" strokeWidth="0.8" strokeOpacity="0.15" strokeDasharray="12 8">
        <animateTransform attributeName="transform" type="rotate" from="360 400 200" to="0 400 200" dur="80s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="400" cy="200" rx="280" ry="140" fill="none" stroke="#7dd87d" strokeWidth="0.6" strokeOpacity="0.1" strokeDasharray="16 12">
        <animateTransform attributeName="transform" type="rotate" from="0 400 200" to="360 400 200" dur="100s" repeatCount="indefinite" />
      </ellipse>

      {/* Community nodes */}
      {[
        { x: 400, y: 100 },
        { x: 540, y: 150 },
        { x: 560, y: 250 },
        { x: 400, y: 300 },
        { x: 240, y: 250 },
        { x: 260, y: 150 },
      ].map((pos, i) => (
        <g key={i}>
          <circle cx={pos.x} cy={pos.y} r="12" fill="#1a472a" stroke="#7dd87d" strokeWidth="1.5" strokeOpacity="0.5" />
          <circle cx={pos.x} cy={pos.y} r="5" fill="#7dd87d" fillOpacity="0.6">
            <animate attributeName="fillOpacity" values="0.4;0.8;0.4" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      {/* Connecting lines between nodes */}
      <line x1="400" y1="100" x2="540" y2="150" stroke="url(#eco-hero-line)" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="540" y1="150" x2="560" y2="250" stroke="url(#eco-hero-line)" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="560" y1="250" x2="400" y2="300" stroke="url(#eco-hero-line)" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="400" y1="300" x2="240" y2="250" stroke="url(#eco-hero-line)" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="240" y1="250" x2="260" y2="150" stroke="url(#eco-hero-line)" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="260" y1="150" x2="400" y2="100" stroke="url(#eco-hero-line)" strokeWidth="1" strokeOpacity="0.3" />

      {/* Floating tokens on the orbits */}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={`token-${i}`} r="3" fill="#D4A017" fillOpacity="0.7">
          <animateMotion dur={`${12 + i * 4}s`} repeatCount="indefinite">
            <mpath href={`#orbit-${i % 2}`} />
          </animateMotion>
        </circle>
      ))}
      <ellipse id="orbit-0" cx="400" cy="200" rx="160" ry="80" fill="none" />
      <ellipse id="orbit-1" cx="400" cy="200" rx="220" ry="110" fill="none" />
    </svg>
  );
}

/** Three Tools: contribution scores, gratitude, proposals as interconnected forms */
export function ThreeToolsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 300" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="tool-glow-1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7dd87d" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7dd87d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tool-glow-2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4A017" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tool-glow-3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a8e6a8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#a8e6a8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Connecting threads */}
      <path d="M 200 150 Q 400 100 400 150" fill="none" stroke="#D4A017" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4">
        <animate attributeName="strokeDashoffset" values="0;-16" dur="4s" repeatCount="indefinite" />
      </path>
      <path d="M 400 150 Q 400 100 600 150" fill="none" stroke="#D4A017" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4">
        <animate attributeName="strokeDashoffset" values="0;-16" dur="4s" repeatCount="indefinite" />
      </path>
      <path d="M 200 150 Q 400 200 600 150" fill="none" stroke="#7dd87d" strokeWidth="0.8" strokeOpacity="0.2" strokeDasharray="6 6">
        <animate attributeName="strokeDashoffset" values="0;-24" dur="6s" repeatCount="indefinite" />
      </path>

      {/* Tool 1: Contribution Scores - Bar chart */}
      <g transform="translate(200, 150)">
        <circle r="70" fill="url(#tool-glow-1)" />
        <circle r="45" fill="none" stroke="#7dd87d" strokeWidth="1" strokeOpacity="0.3" />
        {/* Bar chart bars */}
        {[-20, -8, 4, 16].map((x, i) => {
          const heights = [25, 35, 20, 40];
          return (
            <rect
              key={i}
              x={x}
              y={-heights[i]}
              width="8"
              height={heights[i]}
              rx="2"
              fill="#7dd87d"
              fillOpacity="0.6"
            >
              <animate
                attributeName="height"
                values={`${heights[i]};${heights[i] + 8};${heights[i]}`}
                dur={`${3 + i * 0.3}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="y"
                values={`${-heights[i]};${-heights[i] - 8};${-heights[i]}`}
                dur={`${3 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </rect>
          );
        })}
        <text y="25" textAnchor="middle" fill="#7dd87d" fillOpacity="0.5" fontSize="10" fontFamily="var(--font-display)">SCORES</text>
      </g>

      {/* Tool 2: Gratitude - Heart */}
      <g transform="translate(400, 150)">
        <circle r="70" fill="url(#tool-glow-2)" />
        <circle r="45" fill="none" stroke="#D4A017" strokeWidth="1" strokeOpacity="0.3" />
        {/* Heart shape */}
        <path
          d="M 0 8 C -4 -4, -18 -8, -18 2 C -18 12, 0 22, 0 22 C 0 22, 18 12, 18 2 C 18 -8, 4 -4, 0 8 Z"
          fill="#D4A017"
          fillOpacity="0.5"
          transform="scale(1.3)"
        >
          <animate attributeName="fillOpacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
        </path>
        {/* Radiating sparks */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <line
            key={i}
            x1={Math.cos((angle * Math.PI) / 180) * 22}
            y1={Math.sin((angle * Math.PI) / 180) * 22}
            x2={Math.cos((angle * Math.PI) / 180) * 32}
            y2={Math.sin((angle * Math.PI) / 180) * 32}
            stroke="#D4A017"
            strokeWidth="1.5"
            strokeOpacity="0.4"
            strokeLinecap="round"
          >
            <animate attributeName="strokeOpacity" values="0.2;0.6;0.2" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </line>
        ))}
        <text y="32" textAnchor="middle" fill="#D4A017" fillOpacity="0.5" fontSize="10" fontFamily="var(--font-display)">GRATITUDE</text>
      </g>

      {/* Tool 3: Proposals - Council circle */}
      <g transform="translate(600, 150)">
        <circle r="70" fill="url(#tool-glow-3)" />
        <circle r="45" fill="none" stroke="#a8e6a8" strokeWidth="1" strokeOpacity="0.3" />
        {/* Circle of figures */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const x = Math.cos((angle * Math.PI) / 180) * 22;
          const y = Math.sin((angle * Math.PI) / 180) * 22;
          return (
            <circle key={i} cx={x} cy={y} r="4" fill="#a8e6a8" fillOpacity="0.5">
              <animate attributeName="fillOpacity" values="0.3;0.7;0.3" dur={`${2.5 + i * 0.2}s`} repeatCount="indefinite" />
            </circle>
          );
        })}
        {/* Center glow */}
        <circle r="8" fill="#a8e6a8" fillOpacity="0.2">
          <animate attributeName="r" values="6;10;6" dur="4s" repeatCount="indefinite" />
          <animate attributeName="fillOpacity" values="0.15;0.3;0.15" dur="4s" repeatCount="indefinite" />
        </circle>
        <text y="32" textAnchor="middle" fill="#a8e6a8" fillOpacity="0.5" fontSize="10" fontFamily="var(--font-display)">PROPOSALS</text>
      </g>
    </svg>
  );
}

/** Food Foundation: soil, roots, and growing things */
export function FoodFoundationIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 300" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="food-soil" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5a3a1a" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#3a2210" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="food-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a472a" stopOpacity="0" />
          <stop offset="100%" stopColor="#1a472a" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Sky zone */}
      <rect x="0" y="0" width="800" height="160" fill="url(#food-sky)" />

      {/* Soil zone */}
      <path d="M 0 160 Q 200 145 400 155 Q 600 165 800 150 L 800 300 L 0 300 Z" fill="url(#food-soil)" />

      {/* Underground roots */}
      {[
        "M 200 170 Q 180 200 150 240 Q 130 260 100 280",
        "M 200 170 Q 220 210 250 250 Q 270 270 300 290",
        "M 400 165 Q 370 200 340 240 Q 320 260 310 280",
        "M 400 165 Q 430 200 460 240 Q 480 260 490 280",
        "M 600 160 Q 580 190 560 230 Q 540 260 530 280",
        "M 600 160 Q 630 200 660 240 Q 680 265 700 280",
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#D4A017" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round">
          <animate attributeName="strokeOpacity" values="0.15;0.4;0.15" dur={`${4 + i * 0.5}s`} repeatCount="indefinite" />
        </path>
      ))}

      {/* Root network connections underground */}
      <path d="M 150 240 Q 250 230 340 240 Q 450 250 560 230" fill="none" stroke="#D4A017" strokeWidth="0.8" strokeOpacity="0.15" strokeDasharray="4 6">
        <animate attributeName="strokeDashoffset" values="0;-20" dur="8s" repeatCount="indefinite" />
      </path>

      {/* Plants above ground */}
      {/* Plant 1: small crop */}
      <g transform="translate(200, 155)">
        <line x1="0" y1="0" x2="0" y2="-30" stroke="#5a9e3a" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="-8" cy="-25" rx="8" ry="5" fill="#7dd87d" fillOpacity="0.6" transform="rotate(-30 -8 -25)" />
        <ellipse cx="8" cy="-20" rx="7" ry="4.5" fill="#7dd87d" fillOpacity="0.5" transform="rotate(25 8 -20)" />
        <ellipse cx="-5" cy="-35" rx="6" ry="4" fill="#7dd87d" fillOpacity="0.7" transform="rotate(-15 -5 -35)" />
      </g>

      {/* Plant 2: tree */}
      <g transform="translate(400, 150)">
        <line x1="0" y1="0" x2="0" y2="-60" stroke="#5a3a1a" strokeWidth="4" strokeLinecap="round" />
        <line x1="0" y1="-35" x2="-20" y2="-50" stroke="#5a3a1a" strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1="-40" x2="18" y2="-55" stroke="#5a3a1a" strokeWidth="2" strokeLinecap="round" />
        <circle cx="0" cy="-70" r="30" fill="#4a7c59" fillOpacity="0.5" />
        <circle cx="-15" cy="-60" r="18" fill="#7dd87d" fillOpacity="0.3" />
        <circle cx="12" cy="-65" r="15" fill="#5a9e3a" fillOpacity="0.4" />
        {/* Fruit */}
        <circle cx="-10" cy="-52" r="4" fill="#D4A017" fillOpacity="0.7">
          <animate attributeName="fillOpacity" values="0.5;0.8;0.5" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="15" cy="-58" r="3.5" fill="#D4A017" fillOpacity="0.6">
          <animate attributeName="fillOpacity" values="0.4;0.7;0.4" dur="5s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Plant 3: smaller crop */}
      <g transform="translate(600, 152)">
        <line x1="0" y1="0" x2="0" y2="-25" stroke="#5a9e3a" strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1="-10" x2="-12" y2="-22" stroke="#5a9e3a" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="0" y1="-12" x2="14" y2="-20" stroke="#5a9e3a" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="0" cy="-30" rx="6" ry="4" fill="#7dd87d" fillOpacity="0.6" />
        <ellipse cx="-14" cy="-25" rx="5" ry="3.5" fill="#7dd87d" fillOpacity="0.5" />
        <ellipse cx="16" cy="-23" rx="5.5" ry="3" fill="#7dd87d" fillOpacity="0.55" />
      </g>

      {/* Sun/light effect */}
      <circle cx="700" cy="30" r="40" fill="#D4A017" fillOpacity="0.08">
        <animate attributeName="fillOpacity" values="0.05;0.12;0.05" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="700" cy="30" r="20" fill="#D4A017" fillOpacity="0.15" />
    </svg>
  );
}

/** Harvest: tree distributing tokens to communities */
export function HarvestIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 400" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="harvest-trunk-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4A017" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="harvest-trunk" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8B6914" />
          <stop offset="100%" stopColor="#5a3a1a" />
        </linearGradient>
      </defs>

      {/* Central tree trunk */}
      <rect x="390" y="120" width="20" height="180" rx="4" fill="url(#harvest-trunk)" fillOpacity="0.6" />
      <circle cx="400" cy="200" r="60" fill="url(#harvest-trunk-glow)" />

      {/* Branches */}
      <path d="M 400 140 Q 350 100 300 80" fill="none" stroke="#8B6914" strokeWidth="4" strokeOpacity="0.5" strokeLinecap="round" />
      <path d="M 400 140 Q 450 100 500 80" fill="none" stroke="#8B6914" strokeWidth="4" strokeOpacity="0.5" strokeLinecap="round" />
      <path d="M 400 160 Q 340 130 280 120" fill="none" stroke="#8B6914" strokeWidth="3" strokeOpacity="0.4" strokeLinecap="round" />
      <path d="M 400 160 Q 460 130 520 120" fill="none" stroke="#8B6914" strokeWidth="3" strokeOpacity="0.4" strokeLinecap="round" />

      {/* Canopy */}
      <ellipse cx="400" cy="90" rx="140" ry="70" fill="#4a7c59" fillOpacity="0.25" />
      <ellipse cx="360" cy="85" rx="80" ry="50" fill="#7dd87d" fillOpacity="0.1" />
      <ellipse cx="440" cy="80" rx="70" ry="45" fill="#5a9e3a" fillOpacity="0.12" />

      {/* Falling tokens */}
      {[
        { x: 340, delay: 0 },
        { x: 380, delay: 1.5 },
        { x: 420, delay: 0.8 },
        { x: 460, delay: 2.2 },
        { x: 360, delay: 3.1 },
        { x: 440, delay: 1.2 },
        { x: 310, delay: 2.8 },
        { x: 490, delay: 0.5 },
      ].map((token, i) => (
        <circle key={i} r="4" fill="#D4A017" fillOpacity="0.7">
          <animate attributeName="cx" values={`${token.x};${token.x + (i % 2 === 0 ? -30 : 30)}`} dur="6s" begin={`${token.delay}s`} repeatCount="indefinite" />
          <animate attributeName="cy" values="130;320" dur="6s" begin={`${token.delay}s`} repeatCount="indefinite" />
          <animate attributeName="fillOpacity" values="0.8;0.3;0" dur="6s" begin={`${token.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Community circles at the base */}
      {[
        { x: 200, y: 340 },
        { x: 320, y: 350 },
        { x: 400, y: 355 },
        { x: 480, y: 350 },
        { x: 600, y: 340 },
      ].map((pos, i) => (
        <g key={i}>
          <circle cx={pos.x} cy={pos.y} r="20" fill="#1a472a" stroke="#7dd87d" strokeWidth="1" strokeOpacity="0.3" />
          <circle cx={pos.x} cy={pos.y} r="8" fill="#D4A017" fillOpacity="0.2">
            <animate attributeName="fillOpacity" values="0.15;0.4;0.15" dur={`${3 + i * 0.4}s`} repeatCount="indefinite" />
          </circle>
          {/* Small dots representing people */}
          {[0, 72, 144, 216, 288].map((angle, j) => (
            <circle
              key={j}
              cx={pos.x + Math.cos((angle * Math.PI) / 180) * 13}
              cy={pos.y + Math.sin((angle * Math.PI) / 180) * 13}
              r="2.5"
              fill="#7dd87d"
              fillOpacity="0.4"
            />
          ))}
        </g>
      ))}

      {/* Underground root connections */}
      <path d="M 200 360 Q 260 375 320 365 Q 360 360 400 370 Q 440 380 480 365 Q 540 355 600 360" fill="none" stroke="#D4A017" strokeWidth="1.5" strokeOpacity="0.15" strokeDasharray="6 4">
        <animate attributeName="strokeDashoffset" values="0;-20" dur="8s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}
