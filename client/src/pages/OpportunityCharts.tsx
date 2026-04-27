/**
 * Recharts-backed chart components for the /opportunity page.
 *
 * Why this file is separate: recharts is ~150KB gzipped and the charts
 * here all live inside collapsible sections. Most visitors close the page
 * without expanding any of them, so we lazy-load this whole module from
 * Opportunity.tsx via React.lazy and only fetch recharts when a chart
 * actually renders.
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type AllocationDatum = { name: string; value: number; color: string };

export function AllocationDonut({ data }: { data: AllocationDatum[] }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 bg-white/5 rounded-xl p-5 border border-white/10">
      <PieChart width={200} height={200}>
        <Pie
          data={data}
          cx={100}
          cy={100}
          innerRadius={60}
          outerRadius={90}
          dataKey="value"
          isAnimationActive
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}%`} />
      </PieChart>
      <div className="space-y-2 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: d.color }}
            />
            <span className="text-white/70">{d.name}</span>
            <span className="ml-auto font-bold" style={{ color: d.color }}>
              {d.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const GP_GOVERNANCE_DATA: AllocationDatum[] = [
  { name: "Council of Domain Experts", value: 40, color: "#7dd87d" },
  { name: "Land Projects", value: 20, color: "#9de89d" },
  { name: "Alliance Organizations", value: 20, color: "#bbf7d0" },
  { name: "Investors (YOU)", value: 20, color: "#ffd700" },
];

export function GPGovernancePie() {
  return (
    <PieChart width={160} height={160}>
      <Pie
        data={GP_GOVERNANCE_DATA}
        cx={80}
        cy={80}
        innerRadius={45}
        outerRadius={75}
        dataKey="value"
        isAnimationActive
      >
        {GP_GOVERNANCE_DATA.map((entry, i) => (
          <Cell key={i} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip formatter={(value) => `${value}%`} />
    </PieChart>
  );
}

const COMPARABLE_FUND_DATA = [
  { name: "PE Sustainable\nReal Assets", irr: 14, color: "#9de89d" },
  { name: "Venture Capital", irr: 18, color: "#9de89d" },
  { name: "ReGen Civics\n(Target)", irr: 15, color: "#ffd700" },
];

export function TargetIRRBars() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={COMPARABLE_FUND_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
        <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} unit="%" />
        <Tooltip formatter={(value) => `${value}% IRR`} />
        <Bar dataKey="irr" radius={[4, 4, 0, 0]}>
          {COMPARABLE_FUND_DATA.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
