import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, render, screen, fireEvent } from "@testing-library/react";
import { useRef, useState } from "react";
import {
  useDictation,
  dictationSupported,
  DICTATION_DENIED_MESSAGE,
  DICTATION_NO_SPEECH_MESSAGE,
  DICTATION_NETWORK_MESSAGE,
  DICTATION_NO_MIC_MESSAGE,
  DICTATION_BLOCKED_TITLE,
  DICTATION_BLOCKED_LEAD,
  DICTATION_SENSITIVE_MESSAGE,
  DICTATION_UNSUPPORTED_MESSAGE,
  DICTATION_GENERIC_ERROR,
} from "./useDictation";
import { DictationButton } from "./DictationButton";
import { Breath } from "@/components/session-board/stages";
import { boardStages, defaultBoardState } from "@shared/sessionBoard";
import type { StageProps } from "@/components/session-board/stages";

class FakeSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onstart: (() => void) | null = null;
  onresult: ((event: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  aborted = false;

  start() {
    if (this.started) throw new DOMException("already started", "InvalidStateError");
    this.started = true;
    FakeSpeechRecognition.latest = this;
    this.onstart?.();
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

/** Mutable so try-again can flip denied → granted without remounting. */
let micPermissionState: "granted" | "denied" | "prompt" = "prompt";

function installMicPermission(state: "granted" | "denied" | "prompt") {
  micPermissionState = state;
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: {
      query: vi.fn(async () => ({ state: micPermissionState, onchange: null })),
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

  it("writes interim speech into the field while Listening is on", async () => {
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("");
      const d = useDictation({ value, onChange: setValue, targetRef: ref });
      return (
        <>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="button" onClick={d.start} data-testid="start">start</button>
          <span data-testid="value">{value}</span>
          <span data-testid="listening">{d.listening ? "yes" : "no"}</span>
        </>
      );
    }
    render(<Field />);
    await act(async () => { fireEvent.click(screen.getByTestId("start")); });
    expect(screen.getByTestId("listening").textContent).toBe("yes");
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: false, 0: { transcript: "who needs follow-up" } }],
      });
    });
    expect(screen.getByTestId("value").textContent).toBe("who needs follow-up");
  });

  it("replaces the live preview when the interim phrase grows", async () => {
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("");
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
        results: [{ isFinal: false, 0: { transcript: "who" } }],
      });
    });
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: false, 0: { transcript: "who needs follow-up" } }],
      });
    });
    expect(screen.getByTestId("value").textContent).toBe("who needs follow-up");
  });

  it("keeps interim text when the recognizer pauses and appends the next phrase", async () => {
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("");
      const d = useDictation({ value, onChange: setValue, targetRef: ref });
      return (
        <>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="button" onClick={d.start} data-testid="start">start</button>
          <span data-testid="value">{value}</span>
          <span data-testid="listening">{d.listening ? "yes" : "no"}</span>
        </>
      );
    }
    render(<Field />);
    await act(async () => { fireEvent.click(screen.getByTestId("start")); });
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: false, 0: { transcript: "follow up" } }],
      });
    });
    const rec = FakeSpeechRecognition.latest;
    expect(rec).toBeTruthy();
    rec!.started = false;
    act(() => { rec!.onend?.(); });
    expect(screen.getByTestId("value").textContent).toBe("follow up");
    expect(screen.getByTestId("listening").textContent).toBe("yes");
    expect(rec!.started).toBe(true);
    act(() => {
      rec!.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "today" } }],
      });
    });
    expect(screen.getByTestId("value").textContent).toBe("follow up today");
  });

  it("keeps dictated text after stop", async () => {
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("");
      const d = useDictation({ value, onChange: setValue, targetRef: ref });
      return (
        <>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="button" onClick={d.start} data-testid="start">start</button>
          <button type="button" onClick={d.stop} data-testid="stop">stop</button>
          <span data-testid="value">{value}</span>
        </>
      );
    }
    render(<Field />);
    await act(async () => { fireEvent.click(screen.getByTestId("start")); });
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: false, 0: { transcript: "who needs follow-up" } }],
      });
    });
    await act(async () => { fireEvent.click(screen.getByTestId("stop")); });
    expect(screen.getByTestId("value").textContent).toBe("who needs follow-up");
  });

  it("inserts at a saved mid-field caret after the mic click blurs the field", async () => {
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("Hello there");
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
    field.dispatchEvent(new Event("select", { bubbles: true }));
    await act(async () => { fireEvent.click(screen.getByTestId("start")); });
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "friend" } }],
      });
    });
    expect(screen.getByTestId("value").textContent).toBe("Hello friend there");
  });

  it("reads a transcript exposed only through result.item()", async () => {
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("");
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
    const row = {
      isFinal: false,
      item: (index: number) => (index === 0 ? { transcript: "from item" } : null),
    };
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: { length: 1, 0: row } as unknown as Array<{ isFinal: boolean; 0: { transcript: string } }>,
      });
    });
    expect(screen.getByTestId("value").textContent).toBe("from item");
  });

  it("reads a transcript exposed only through the result list item()", async () => {
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("");
      const d = useDictation({ value, onChange: setValue, targetRef: ref });
      return (
        <>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="button" onClick={d.start} data-testid="start">start</button>
          <span data-testid="value">{value}</span>
          <span data-testid="listening">{d.listening ? "yes" : "no"}</span>
        </>
      );
    }
    render(<Field />);
    await act(async () => { fireEvent.click(screen.getByTestId("start")); });
    expect(screen.getByTestId("listening").textContent).toBe("yes");
    const row = { isFinal: false, 0: { transcript: "from the list" } };
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          item: (index: number) => (index === 0 ? row : null),
        } as unknown as Array<{ isFinal: boolean; 0: { transcript: string } }>,
      });
    });
    expect(screen.getByTestId("value").textContent).toBe("from the list");
    expect(screen.getByTestId("listening").textContent).toBe("yes");
  });

  it("does not stay Listening with an empty field when recognition.start() throws", async () => {
    const orig = FakeSpeechRecognition.prototype.start;
    FakeSpeechRecognition.prototype.start = function () {
      throw new DOMException("audio-capture", "AbortError");
    };
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("");
      const d = useDictation({ value, onChange: setValue, targetRef: ref });
      return (
        <>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="button" onClick={d.start} data-testid="start">start</button>
          <span data-testid="value">{value}</span>
          <span data-testid="listening">{d.listening ? "yes" : "no"}</span>
        </>
      );
    }
    try {
      render(<Field />);
      await act(async () => { fireEvent.click(screen.getByTestId("start")); });
      expect(screen.getByTestId("listening").textContent).toBe("no");
      expect(screen.getByTestId("value").textContent).toBe("");
    } finally {
      FakeSpeechRecognition.prototype.start = orig;
    }
  });

  it("starts recognition in the click turn, before the permission check resolves", async () => {
    let resolveQuery: (value: { state: string }) => void = () => {};
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: {
        query: vi.fn(() => new Promise((resolve) => { resolveQuery = resolve; })),
      },
    });
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("");
      const d = useDictation({ value, onChange: setValue, targetRef: ref });
      return (
        <>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="button" onClick={d.start} data-testid="start">start</button>
          <span data-testid="listening">{d.listening ? "yes" : "no"}</span>
        </>
      );
    }
    render(<Field />);
    fireEvent.click(screen.getByTestId("start"));
    expect(FakeSpeechRecognition.latest?.started).toBe(true);
    expect(screen.getByTestId("listening").textContent).toBe("yes");
    await act(async () => { resolveQuery({ state: "granted" }); });
    expect(screen.getByTestId("listening").textContent).toBe("yes");
  });

  it("does not keep Listening when recognition ends immediately and never returns text", async () => {
    const orig = FakeSpeechRecognition.prototype.start;
    let starts = 0;
    FakeSpeechRecognition.prototype.start = function (this: FakeSpeechRecognition) {
      starts += 1;
      if (starts > 6) throw new Error("restart loop");
      this.started = true;
      FakeSpeechRecognition.latest = this;
      this.onend?.();
    };
    function Field() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("");
      const d = useDictation({ value, onChange: setValue, targetRef: ref });
      return (
        <>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="button" onClick={d.start} data-testid="start">start</button>
          <span data-testid="value">{value}</span>
          <span data-testid="listening">{d.listening ? "yes" : "no"}</span>
          <span data-testid="err">{d.error ?? ""}</span>
        </>
      );
    }
    try {
      render(<Field />);
      await act(async () => { fireEvent.click(screen.getByTestId("start")); });
      expect(screen.getByTestId("listening").textContent).toBe("no");
      expect(screen.getByTestId("value").textContent).toBe("");
      expect(screen.getByTestId("err").textContent).toBe(DICTATION_GENERIC_ERROR);
      expect(starts).toBe(1);
    } finally {
      FakeSpeechRecognition.prototype.start = orig;
    }
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

  it("treats getUserMedia NotAllowedError as denied when recognition.start() fails", async () => {
    installMicPermission("prompt");
    installGetUserMedia("denied");
    const orig = FakeSpeechRecognition.prototype.start;
    FakeSpeechRecognition.prototype.start = function () {
      throw new DOMException("capture failed", "AbortError");
    };
    try {
      const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
      await act(async () => { await result.current.start(); });
      expect(FakeSpeechRecognition.latest?.started).toBeFalsy();
      expect(result.current.listening).toBe(false);
      expect(result.current.state).toBe("denied");
      expect(result.current.blockedHelp).toBe(true);
    } finally {
      FakeSpeechRecognition.prototype.start = orig;
    }
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

  it("stops after two quiet sessions and says no speech was heard", async () => {
    const orig = FakeSpeechRecognition.prototype.start;
    let starts = 0;
    FakeSpeechRecognition.prototype.start = function (this: FakeSpeechRecognition) {
      starts += 1;
      return orig.call(this);
    };
    function Field() {
      const ref = useRef<HTMLInputElement>(null);
      const [value, setValue] = useState("");
      const d = useDictation({ value, onChange: setValue, targetRef: ref });
      return (
        <>
          <input ref={ref} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Arrival word" />
          <button type="button" onClick={d.start} data-testid="start">start</button>
          <span data-testid="listening">{d.listening ? "yes" : "no"}</span>
          <span data-testid="err">{d.error ?? ""}</span>
        </>
      );
    }
    try {
      render(<Field />);
      await act(async () => { fireEvent.click(screen.getByTestId("start")); });
      expect(starts).toBe(1);
      const rec = FakeSpeechRecognition.latest!;
      rec.started = false;
      act(() => {
        rec.onerror?.({ error: "no-speech" });
        rec.onend?.();
      });
      expect(starts).toBe(2);
      expect(screen.getByTestId("listening").textContent).toBe("yes");
      rec.started = false;
      act(() => {
        rec.onerror?.({ error: "no-speech" });
        rec.onend?.();
      });
      expect(starts).toBe(2);
      expect(screen.getByTestId("listening").textContent).toBe("no");
      expect(screen.getByTestId("err").textContent).toBe(DICTATION_NO_SPEECH_MESSAGE);
      expect(screen.getByLabelText("Arrival word")).toHaveProperty("value", "");
    } finally {
      FakeSpeechRecognition.prototype.start = orig;
    }
  });

  it("names a network failure instead of the generic line", async () => {
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    await act(async () => { await result.current.start(); });
    const rec = FakeSpeechRecognition.latest!;
    rec.started = false;
    act(() => {
      rec.onerror?.({ error: "network" });
      rec.onend?.();
    });
    expect(result.current.listening).toBe(false);
    expect(result.current.error).toBe("Speech service unavailable, type instead");
    expect(result.current.error).toBe(DICTATION_NETWORK_MESSAGE);
    expect(rec.started).toBe(false);
  });

  it("says the mic is blocked, and keeps the allow-steps flag", async () => {
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    await act(async () => { await result.current.start(); });
    act(() => FakeSpeechRecognition.latest?.onerror?.({ error: "not-allowed" }));
    expect(result.current.error).toBe("Mic blocked");
    expect(result.current.error).toBe(DICTATION_DENIED_MESSAGE);
    expect(result.current.state).toBe("denied");
    expect(result.current.blockedHelp).toBe(true);
    expect(result.current.listening).toBe(false);
  });

  it("says when no microphone can be captured", async () => {
    const { result } = renderHook(() => useDictation({ value: "", onChange: () => {} }));
    await act(async () => { await result.current.start(); });
    act(() => FakeSpeechRecognition.latest?.onerror?.({ error: "audio-capture" }));
    expect(result.current.listening).toBe(false);
    expect(result.current.error).toBe(DICTATION_NO_MIC_MESSAGE);
  });

  it("stays quiet when we abort, and speaks up when the browser aborts on its own", async () => {
    const { result } = renderHook(() => useDictation({ value: "kept", onChange: () => {} }));
    await act(async () => { await result.current.start(); });
    const rec = FakeSpeechRecognition.latest!;
    act(() => { result.current.stop(); });
    act(() => { rec.onerror?.({ error: "aborted" }); });
    expect(result.current.error).toBeNull();

    await act(async () => { await result.current.start(); });
    const again = FakeSpeechRecognition.latest!;
    act(() => { again.onerror?.({ error: "aborted" }); });
    expect(result.current.listening).toBe(false);
    expect(result.current.error).toBe(DICTATION_GENERIC_ERROR);
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
    expect(help.parentElement).toBe(document.body);
    expect(help.textContent).toContain(DICTATION_BLOCKED_TITLE);
    expect(help.textContent).toContain(DICTATION_BLOCKED_LEAD);
    expect(help.textContent).toMatch(/blocked for this site/i);
    expect(help.textContent).toMatch(/lock|site info|address bar/i);
    expect(help.textContent).toMatch(/Microphone/);
    expect(help.textContent).toMatch(/Allow/);
    expect(help.textContent).toMatch(/OS mic privacy/i);
    expect(help.textContent).toMatch(/I allowed it — try again/);
    expect(help.textContent).toMatch(/Reload/i);
    expect(screen.getByTestId("dictation-mic-try-again")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    expect(screen.queryByTestId("dictation-mic-help")).toBeNull();
  });

  it("keeps the blocked modal open when try again still sees denied", async () => {
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
    expect(screen.getByTestId("dictation-mic-help")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByTestId("dictation-mic-try-again"));
    });
    expect(screen.getByTestId("dictation-mic-help")).toBeTruthy();
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(FakeSpeechRecognition.latest?.started).toBeFalsy();
  });

  it("try again rechecks permission and starts listening without reload", async () => {
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
    expect(screen.getByTestId("dictation-mic-help")).toBeTruthy();

    micPermissionState = "granted";
    await act(async () => {
      fireEvent.click(screen.getByTestId("dictation-mic-try-again"));
    });

    // Recovery path is start(), not location.reload — help closes and listening begins.
    expect(screen.queryByTestId("dictation-mic-help")).toBeNull();
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(FakeSpeechRecognition.latest?.started).toBe(true);
  });
});

function arrivalProps(addItem: StageProps["actions"]["addItem"] = async () => ({ id: 1 })): StageProps {
  const stages = boardStages(2);
  return {
    board: {
      week: 2,
      status: "open",
      version: 1,
      serverNow: Date.now(),
      state: defaultBoardState(2),
      canFacilitate: false,
      notes: [],
      hands: {},
      offers: {},
      offerPeople: null,
      projects: [],
      items: [],
    } as unknown as StageProps["board"],
    week: 2,
    stages,
    index: 1,
    facilitator: false,
    canWrite: true,
    mine: { itemIds: new Set(), projectIds: new Set(), votes: new Set(), hands: new Set(), offers: new Set() },
    actions: { addItem } as unknown as StageProps["actions"],
    now: Date.now(),
    serverNow: () => Date.now(),
    go: () => {},
  };
}

describe("arrival word on the week board", () => {
  beforeEach(() => {
    installSpeech();
    removeMicPermission();
    removeGetUserMedia();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    });
  });
  afterEach(() => {
    removeSpeech();
    removeMicPermission();
    removeGetUserMedia();
  });

  it("writes interim speech into the arrival field and replaces it with the final word", async () => {
    render(<Breath {...arrivalProps()} />);
    const input = screen.getByLabelText("Arrival word") as HTMLInputElement;
    await act(async () => { fireEvent.pointerDown(screen.getByTestId("dictation-button")); });
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: false, 0: { transcript: "grate" } }],
      });
    });
    expect(input.value).toBe("grate");
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "grateful" } }],
      });
    });
    expect(input.value).toBe("grateful");
  });

  it("shows no-speech on the board after two quiet sessions and does not add an empty word", async () => {
    const addItem = vi.fn(async () => ({ id: 1 }));
    const orig = FakeSpeechRecognition.prototype.start;
    let starts = 0;
    FakeSpeechRecognition.prototype.start = function (this: FakeSpeechRecognition) {
      starts += 1;
      return orig.call(this);
    };
    try {
      render(<Breath {...arrivalProps(addItem)} />);
      await act(async () => { fireEvent.pointerDown(screen.getByTestId("dictation-button")); });
      const rec = FakeSpeechRecognition.latest!;
      rec.started = false;
      act(() => {
        rec.onerror?.({ error: "no-speech" });
        rec.onend?.();
      });
      rec.started = false;
      act(() => {
        rec.onerror?.({ error: "no-speech" });
        rec.onend?.();
      });
      expect(starts).toBe(2);
      expect(screen.getByTestId("dictation-button").getAttribute("data-listening")).toBe("false");
      expect(screen.getByTestId("dictation-error").textContent).toBe(DICTATION_NO_SPEECH_MESSAGE);
      expect(screen.getByLabelText("Arrival word")).toHaveProperty("value", "");
      expect(addItem).not.toHaveBeenCalled();
    } finally {
      FakeSpeechRecognition.prototype.start = orig;
    }
  });

  it("leaves the arrival word in the field when the add fails", async () => {
    const addItem = vi.fn(async () => null);
    render(<Breath {...arrivalProps(addItem)} />);
    const input = screen.getByLabelText("Arrival word");
    fireEvent.change(input, { target: { value: "grateful" } });
    await act(async () => { fireEvent.submit(input.closest("form")!); });
    expect(addItem).toHaveBeenCalledWith({ kind: "arrive", text: "grateful" });
    expect(input).toHaveProperty("value", "grateful");
  });
});
