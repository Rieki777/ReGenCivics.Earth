import { afterEach, describe, expect, it, vi } from "vitest";
import { isTextEntry, isTyping, onTypingChange, watchTyping } from "./stillWhileTyping";

const make = (html: string) => {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("isTextEntry", () => {
  it("counts fields people type into, not toggles or buttons", () => {
    const host = make(`<input id="a" /><input id="b" type="email" /><textarea id="c"></textarea>
      <input id="d" type="checkbox" /><button id="e">Go</button><input id="f" readonly />`);
    const get = (id: string) => host.querySelector(`#${id}`);
    expect(isTextEntry(get("a"))).toBe(true);
    expect(isTextEntry(get("b"))).toBe(true);
    expect(isTextEntry(get("c"))).toBe(true);
    expect(isTextEntry(get("d"))).toBe(false);
    expect(isTextEntry(get("e"))).toBe(false);
    expect(isTextEntry(get("f"))).toBe(false);
  });
});

describe("watchTyping", () => {
  it("marks the page while a text field has focus and announces each change", () => {
    const host = make(`<input id="name" /><button id="send">Send</button>`);
    const stop = watchTyping();
    const seen = vi.fn();
    const off = onTypingChange(seen);

    (host.querySelector("#name") as HTMLInputElement).focus();
    expect(isTyping()).toBe(true);
    expect(seen).toHaveBeenLastCalledWith(true);

    (host.querySelector("#send") as HTMLButtonElement).focus();
    expect(isTyping()).toBe(false);
    expect(seen).toHaveBeenLastCalledWith(false);

    (host.querySelector("#name") as HTMLInputElement).focus();
    stop();
    expect(isTyping()).toBe(false);
    off();
  });
});
