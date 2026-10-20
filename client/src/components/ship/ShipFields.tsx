/**
 * Form pieces for the Ship's forms that keep a keystroke local. When every
 * field of a long form re-renders on each key, typing lags on a phone, so:
 *
 * - ShipField and ShipCheckField are memoized: typing in one field re-renders
 *   that field alone. Hand them a stable onValue / onChecked (a useState setter).
 * - useTextStore + LiveText hold text that a big component only reads when it
 *   submits. The text lives outside that component's state, so a keystroke
 *   re-renders what LiveText wraps (the field, a button that depends on it)
 *   and nothing else.
 */
import { memo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NeedsOffersFields } from "@/components/NeedsOffersFields";

/** A labelled text field. With `rows` it is a textarea. */
export const ShipField = memo(function ShipField({
  id,
  label,
  value,
  onValue,
  rows,
  type,
  min,
  max,
  hint,
  className = "space-y-2",
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onValue: (value: string) => void;
  rows?: number;
  type?: string;
  /** Number inputs only. */
  min?: number;
  max?: number;
  /** A short line of help under the field. */
  hint?: string;
  /** The wrapper's classes; "" leaves the wrapper bare. */
  className?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <div className={className || undefined}>
      <Label htmlFor={id}>{label}</Label>
      {rows ? (
        <Textarea id={id} value={value} onChange={(e) => onValue(e.target.value)} rows={rows} {...rest} />
      ) : (
        <Input id={id} type={type} min={min} max={max} value={value} onChange={(e) => onValue(e.target.value)} {...rest} />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
});

/** A checkbox with its label beside it. */
export const ShipCheckField = memo(function ShipCheckField({
  id,
  label,
  checked,
  onChecked,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChecked: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChecked(Boolean(v))} />
      <Label htmlFor={id} className="font-normal leading-snug">
        {label}
      </Label>
    </div>
  );
});

/** The shared needs/offers pair, skipped while another field is typed in. */
export const ShipNeedsOffers = memo(NeedsOffersFields);

export type TextStore = {
  get: () => string;
  set: (value: string) => void;
  subscribe: (onChange: () => void) => () => void;
};

/**
 * One field's text, kept out of the calling component's state. Read it with
 * get() on submit and clear it with set(""); render the field (and anything
 * that depends on the text) inside <LiveText>.
 */
export function useTextStore(): TextStore {
  const [store] = useState<TextStore>(() => {
    let value = "";
    const listeners = new Set<() => void>();
    return {
      get: () => value,
      set: (next) => {
        if (next === value) return;
        value = next;
        listeners.forEach((listener) => listener());
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
  });
  return store;
}

/** Renders children(text) and re-renders only that when the store's text changes. */
export function LiveText({ store, children }: { store: TextStore; children: (text: string) => ReactNode }) {
  const text = useSyncExternalStore(store.subscribe, store.get);
  return <>{children(text)}</>;
}
