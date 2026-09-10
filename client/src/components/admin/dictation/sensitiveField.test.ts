import { describe, it, expect } from "vitest";
import { isSensitiveField } from "./sensitiveField";

describe("isSensitiveField", () => {
  it("treats password inputs as sensitive", () => {
    const input = document.createElement("input");
    input.type = "password";
    expect(isSensitiveField(input)).toBe(true);
  });

  it("treats credential autocomplete as sensitive", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.autocomplete = "current-password";
    expect(isSensitiveField(input)).toBe(true);
  });

  it("honors data-dictation=off", () => {
    const textarea = document.createElement("textarea");
    textarea.dataset.dictation = "off";
    expect(isSensitiveField(textarea)).toBe(true);
  });

  it("lets ordinary text fields through", () => {
    const textarea = document.createElement("textarea");
    expect(isSensitiveField(textarea)).toBe(false);
    const input = document.createElement("input");
    input.type = "text";
    expect(isSensitiveField(input)).toBe(false);
  });
});
