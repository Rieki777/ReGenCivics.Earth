import type { GiftLine } from "@shared/characterSheet";

function money(value: number, symbol: string): string {
  return `${symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function GiftRecord({
  lines,
  quietLine,
  empty,
  currencySymbol,
}: {
  lines: GiftLine[];
  quietLine: string;
  empty: boolean;
  currencySymbol: string;
}) {
  return (
    <div className="sheet-record" aria-label="Gift record">
      <h3 className="sheet-display sheet-h2">Gift record</h3>
      {empty ? (
        <p className="sheet-quiet">Nothing on this sheet yet.</p>
      ) : (
        <ul className="sheet-record">
          {lines.map((line, index) => (
            <li key={`${line.kind}-${line.capital}-${index}`} className="sheet-row">
              <span>{line.label}</span>
              <span>
                {line.description}
                {line.kind === "role" ? " · future role" : ""}
              </span>
              <span className="sheet-row-value">{money(line.value, currencySymbol)}</span>
            </li>
          ))}
        </ul>
      )}
      {quietLine ? <p className="sheet-quiet">{quietLine}</p> : null}
    </div>
  );
}
