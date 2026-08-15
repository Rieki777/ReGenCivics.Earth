/**
 * Voice-layer tests for the Conversational Companion.
 *
 * These cover the graceful-degradation and persistence guarantees the product
 * promises: an environment without SpeechRecognition falls back to typing, and
 * the silence toggle (reading mode for public places) persists across sessions.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  speechRecognitionSupported,
  useSilentPreference,
  useListening,
} from "./useVoice";

describe("voice availability", () => {
  it("reports SpeechRecognition unsupported in a plain environment (degrades to chat)", () => {
    // jsdom has neither SpeechRecognition nor webkitSpeechRecognition.
    expect(speechRecognitionSupported()).toBe(false);
    const { result } = renderHook(() => useListening({ onFinal: () => {} }));
    expect(result.current.supported).toBe(false);
    expect(result.current.state).toBe("unsupported");
  });
});

describe("silence toggle persistence", () => {
  beforeEach(() => {
    // Install a clean in-memory localStorage. Node 25 ships an experimental
    // global localStorage that shadows jsdom's and lacks getItem here, so we
    // define a working one to test the persistence contract directly.
    const store = new Map<string, string>();
    const mock = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; },
    };
    Object.defineProperty(window, "localStorage", { value: mock, configurable: true, writable: true });
  });

  it("defaults to voice on", () => {
    const { result } = renderHook(() => useSilentPreference());
    expect(result.current[0]).toBe(false);
  });

  it("persists the silent preference across mounts", () => {
    const first = renderHook(() => useSilentPreference());
    act(() => first.result.current[1](true));
    expect(first.result.current[0]).toBe(true);
    expect(window.localStorage.getItem("companion-silent")).toBe("1");

    // A fresh mount reads the stored preference.
    const second = renderHook(() => useSilentPreference());
    expect(second.result.current[0]).toBe(true);
  });
});
