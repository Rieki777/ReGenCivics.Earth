import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, render, screen, fireEvent } from "@testing-library/react";
import { useRef, useState } from "react";
import {
  useDictation,
  dictationSupported,
  DICTATION_DENIED_MESSAGE,
  DICTATION_SENSITIVE_MESSAGE,
  DICTATION_UNSUPPORTED_MESSAGE,
} from "./useDictation";
import { DictationButton } from "./DictationButton";

class FakeSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  aborted = false;

  start() {
    if (this.started) throw new Error("already started");
    this.started = true;
    FakeSpeechRecognition.latest = this;
  }

  stop() {
    this.started = false;
    this.onend?.();
  }

  abort() {
    this.aborted = true;
    this.started = false;
    this.onend?.();
  }

  static latest: FakeSpeechRecognition | null = null;
}

function installSpeech() {
  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    writable: true,
    value: FakeSpeechRecognition,
  });
  FakeSpeechRecognition.latest = null;
}

function removeSpeech() {
  delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition;
  delete (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
}

describe("dictation availability", () => {
  afterEach(() => removeSpeech());

  it("reports unsupported in a plain jsdom environment", () => {
    removeSpeech();
    expect(dictationSupported()).toBe(false);
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    expect(result.current.supported).toBe(false);
    expect(result.current.state).toBe("unsupported");
  });
});

describe("useDictation", () => {
  beforeEach(() => installSpeech());
  afterEach(() => removeSpeech());

  it("inserts a final transcript at the caret", () => {
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("Hello");
      const d = useDictation({ value, onChange: setValue, targetRef: ref });
      return (
        <>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} data-testid="field" />
          <button type="button" onClick={d.start} data-testid="start">start</button>
          <span data-testid="value">{value}</span>
        </>
      );
    }
    render(<Field />);
    const field = screen.getByTestId("field") as HTMLTextAreaElement;
    field.focus();
    field.setSelectionRange(5, 5);
    fireEvent.click(screen.getByTestId("start"));
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "world" } }],
      });
    });
    expect(screen.getByTestId("value").textContent).toBe("Hello world");
  });

  it("surfaces permission denied without throwing", () => {
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    act(() => result.current.start());
    act(() => FakeSpeechRecognition.latest?.onerror?.({ error: "not-allowed" }));
    expect(result.current.state).toBe("denied");
    expect(result.current.error).toBe(DICTATION_DENIED_MESSAGE);
    expect(result.current.listening).toBe(false);
  });

  it("refuses to listen into a password field", () => {
    function Field() {
      const ref = useRef<HTMLInputElement>(null);
      const [value, setValue] = useState("");
      const d = useDictation({ value, onChange: setValue, targetRef: ref });
      return (
        <>
          <input ref={ref} type="password" value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="button" onClick={d.start} data-testid="start">start</button>
          <span data-testid="err">{d.error ?? ""}</span>
        </>
      );
    }
    render(<Field />);
    fireEvent.click(screen.getByTestId("start"));
    expect(screen.getByTestId("err").textContent).toBe(DICTATION_SENSITIVE_MESSAGE);
    expect(FakeSpeechRecognition.latest?.started).toBeFalsy();
  });

  it("stops when a protected field receives focus", () => {
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    act(() => result.current.start());
    expect(result.current.listening).toBe(true);
    const password = document.createElement("input");
    password.type = "password";
    document.body.appendChild(password);
    act(() => {
      password.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });
    expect(result.current.listening).toBe(false);
    password.remove();
  });

  it("aborts recognition on unmount", () => {
    const { result, unmount } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    act(() => result.current.start());
    const rec = FakeSpeechRecognition.latest;
    expect(rec?.started).toBe(true);
    unmount();
    expect(rec?.aborted).toBe(true);
  });
});

describe("DictationButton", () => {
  beforeEach(() => {
    installSpeech();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    removeSpeech();
  });

  it("toggles listening on a short press", () => {
    function Box() {
      const [value, setValue] = useState("");
      return <DictationButton value={value} onChange={setValue} />;
    }
    render(<Box />);
    const btn = screen.getByTestId("dictation-button");
    fireEvent.pointerDown(btn);
    fireEvent.pointerUp(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    fireEvent.pointerDown(btn);
    fireEvent.pointerUp(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("stops on release after a hold", () => {
    function Box() {
      const [value, setValue] = useState("");
      return <DictationButton value={value} onChange={setValue} />;
    }
    render(<Box />);
    const btn = screen.getByTestId("dictation-button");
    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(350); });
    fireEvent.pointerUp(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows a user-visible error when the browser cannot listen", () => {
    vi.useRealTimers();
    removeSpeech();
    function Box() {
      const [value, setValue] = useState("");
      return <DictationButton value={value} onChange={setValue} />;
    }
    render(<Box />);
    const btn = screen.getByTestId("dictation-button");
    fireEvent.pointerDown(btn);
    fireEvent.pointerUp(btn);
    expect(screen.getByTestId("dictation-error").textContent).toBe(DICTATION_UNSUPPORTED_MESSAGE);
  });
});
