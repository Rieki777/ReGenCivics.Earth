import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, render, screen, fireEvent } from "@testing-library/react";
import { useRef, useState } from "react";
import {
  useDictation,
  dictationSupported,
  DICTATION_DENIED_MESSAGE,
  DICTATION_BLOCKED_TITLE,
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

function installMicPermission(state: "granted" | "denied" | "prompt") {
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: {
      query: vi.fn(async () => ({ state, onchange: null })),
    },
  });
}

function removeMicPermission() {
  Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined });
}

function installGetUserMedia(result: "granted" | "denied" | "missing") {
  if (result === "missing") {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    return;
  }
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => {
        if (result === "denied") throw new DOMException("blocked", "NotAllowedError");
        return { getTracks: () => [{ stop: vi.fn() }] };
      }),
    },
  });
}

function removeGetUserMedia() {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
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
  beforeEach(() => {
    installSpeech();
    removeMicPermission();
    removeGetUserMedia();
  });
  afterEach(() => {
    removeSpeech();
    removeMicPermission();
    removeGetUserMedia();
  });

  it("inserts a final transcript at the caret", async () => {
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
    await act(async () => { fireEvent.click(screen.getByTestId("start")); });
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "world" } }],
      });
    });
    expect(screen.getByTestId("value").textContent).toBe("Hello world");
  });

  it("does not wipe existing text when more speech arrives", async () => {
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("Keep this draft.");
      const d = useDictation({ value, onChange: setValue, targetRef: ref });
      return (
        <>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="button" onClick={d.start} data-testid="start">start</button>
          <span data-testid="value">{value}</span>
        </>
      );
    }
    render(<Field />);
    await act(async () => { fireEvent.click(screen.getByTestId("start")); });
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "add this" } }],
      });
    });
    expect(screen.getByTestId("value").textContent).toBe("Keep this draft. add this");
  });

  it("surfaces permission denied without throwing", async () => {
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    await act(async () => { await result.current.start(); });
    act(() => FakeSpeechRecognition.latest?.onerror?.({ error: "not-allowed" }));
    expect(result.current.state).toBe("denied");
    expect(result.current.error).toBe(DICTATION_DENIED_MESSAGE);
    expect(result.current.listening).toBe(false);
    expect(result.current.blockedHelp).toBe(true);
  });

  it("does not start recognition when Permissions API reports denied", async () => {
    installMicPermission("denied");
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    await act(async () => { await result.current.start(); });
    expect(FakeSpeechRecognition.latest?.started).toBeFalsy();
    expect(result.current.state).toBe("denied");
    expect(result.current.blockedHelp).toBe(true);
    expect(result.current.listening).toBe(false);
  });

  it("starts recognition when Permissions API reports prompt", async () => {
    installMicPermission("prompt");
    installGetUserMedia("granted");
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    await act(async () => { await result.current.start(); });
    expect(FakeSpeechRecognition.latest?.started).toBe(true);
    expect(result.current.state).toBe("listening");
    expect(result.current.blockedHelp).toBe(false);
  });

  it("skips getUserMedia when the mic is already granted", async () => {
    installMicPermission("granted");
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    await act(async () => { await result.current.start(); });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(FakeSpeechRecognition.latest?.started).toBe(true);
    expect(result.current.state).toBe("listening");
  });

  it("treats getUserMedia NotAllowedError as denied before SpeechRecognition", async () => {
    installMicPermission("prompt");
    installGetUserMedia("denied");
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    await act(async () => { await result.current.start(); });
    expect(FakeSpeechRecognition.latest?.started).toBeFalsy();
    expect(result.current.state).toBe("denied");
    expect(result.current.blockedHelp).toBe(true);
  });

  it("refuses to listen into a password field", async () => {
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
    await act(async () => { fireEvent.click(screen.getByTestId("start")); });
    expect(screen.getByTestId("err").textContent).toBe(DICTATION_SENSITIVE_MESSAGE);
    expect(FakeSpeechRecognition.latest?.started).toBeFalsy();
  });

  it("stops when a protected field receives focus", async () => {
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    await act(async () => { await result.current.start(); });
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

  it("aborts recognition on unmount", async () => {
    const { result, unmount } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    await act(async () => { await result.current.start(); });
    const rec = FakeSpeechRecognition.latest;
    expect(rec?.started).toBe(true);
    unmount();
    expect(rec?.aborted).toBe(true);
  });
});

describe("DictationButton", () => {
  beforeEach(() => {
    installSpeech();
    removeMicPermission();
    removeGetUserMedia();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    removeSpeech();
    removeMicPermission();
    removeGetUserMedia();
  });

  it("toggles listening on a short press", async () => {
    function Box() {
      const [value, setValue] = useState("");
      return <DictationButton value={value} onChange={setValue} />;
    }
    render(<Box />);
    const btn = screen.getByTestId("dictation-button");
    await act(async () => {
      fireEvent.pointerDown(btn);
      fireEvent.pointerUp(btn);
    });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.getAttribute("data-listening")).toBe("true");
    expect(screen.getByTestId("dictation-listening").textContent).toBe("Listening");
    await act(async () => {
      fireEvent.pointerDown(btn);
      fireEvent.pointerUp(btn);
    });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("stops on release after a hold", async () => {
    function Box() {
      const [value, setValue] = useState("");
      return <DictationButton value={value} onChange={setValue} />;
    }
    render(<Box />);
    const btn = screen.getByTestId("dictation-button");
    await act(async () => {
      fireEvent.pointerDown(btn);
    });
    await act(async () => { vi.advanceTimersByTime(350); });
    await act(async () => {
      fireEvent.pointerUp(btn);
    });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows a user-visible error when the browser cannot listen", async () => {
    vi.useRealTimers();
    removeSpeech();
    function Box() {
      const [value, setValue] = useState("");
      return <DictationButton value={value} onChange={setValue} />;
    }
    render(<Box />);
    const btn = screen.getByTestId("dictation-button");
    await act(async () => {
      fireEvent.pointerDown(btn);
      fireEvent.pointerUp(btn);
    });
    expect(screen.getByTestId("dictation-error").textContent).toBe(DICTATION_UNSUPPORTED_MESSAGE);
  });

  it("shows Allow steps instead of only a red error when the mic is blocked", async () => {
    vi.useRealTimers();
    installMicPermission("denied");
    function Box() {
      const [value, setValue] = useState("");
      return <DictationButton value={value} onChange={setValue} />;
    }
    render(<Box />);
    const btn = screen.getByTestId("dictation-button");
    await act(async () => {
      fireEvent.pointerDown(btn);
      fireEvent.pointerUp(btn);
    });
    expect(screen.queryByTestId("dictation-error")).toBeNull();
    const help = screen.getByTestId("dictation-mic-help");
    expect(help.textContent).toContain(DICTATION_BLOCKED_TITLE);
    expect(help.textContent).toMatch(/lock|site info|address bar/i);
    expect(help.textContent).toMatch(/Microphone/);
    expect(help.textContent).toMatch(/Allow/);
    expect(help.textContent).toMatch(/Reload/i);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    expect(screen.queryByTestId("dictation-mic-help")).toBeNull();
  });
});
