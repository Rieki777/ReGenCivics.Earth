import { useEffect, useImperativeHandle, useRef, useState, type ElementType, type InputHTMLAttributes, type Ref } from "react";

export type DebouncedSearchHandle = {
  /** Empties the box (or sets it to `value`) at once and drops unsent text. */
  reset: (value?: string) => void;
};

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  /** Called once typing pauses for `delay` ms, with the box's text. */
  onChange: (value: string) => void;
  delay?: number;
  /** The field to render, such as the shared `Input`; a plain `<input>` by default. */
  as?: ElementType;
  /** For Clear buttons: `handle.current.reset()` empties the box even while text is unsent. */
  handle?: Ref<DebouncedSearchHandle>;
};

/**
 * A search box that keeps its own text and tells the page once typing
 * pauses, so a keystroke re-renders the box and not the page and the list
 * it filters (STEERING.md section 13). A change to `value` from outside the
 * box (a link that fills the search) shows up in it. A Clear button calls
 * `handle.current.reset()` as well as clearing its own state: when the page
 * already holds "" and the box has unsent text, `value` does not change and
 * the box could not see the clear. Text still unsent when the box unmounts
 * (a tab switch right after typing) is sent then.
 */
export function DebouncedSearchInput({ value, onChange, delay = 200, as: Field = "input", handle, ...inputProps }: Props) {
  const [text, setText] = useState(value);
  const sent = useRef(value);
  const textRef = useRef(text);
  textRef.current = text;
  const latestOnChange = useRef(onChange);
  latestOnChange.current = onChange;

  useImperativeHandle(handle, () => ({
    reset: (next = "") => {
      sent.current = next;
      setText(next);
    },
  }), []);

  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    if (text === sent.current) return;
    const timer = setTimeout(() => {
      sent.current = text;
      latestOnChange.current(text);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, delay]);

  useEffect(() => () => {
    if (textRef.current !== sent.current) latestOnChange.current(textRef.current);
  }, []);

  return <Field {...inputProps} value={text} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)} />;
}
