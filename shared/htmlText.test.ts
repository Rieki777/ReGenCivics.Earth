import { describe, expect, it } from "vitest";
import { decodeBasicEntities, escapeHtml, textForEmail } from "./htmlText";

describe("textForEmail", () => {
  it("does not double-encode a value sanitizeInput already encoded", () => {
    expect(textForEmail("Seeds &amp; Soil")).toBe("Seeds &amp; Soil");
    expect(textForEmail("Seeds & Soil")).toBe("Seeds &amp; Soil");
  });
  it("escapes markup, so a link or script can never ride into an email", () => {
    expect(textForEmail('<a href="https://evil.test">click</a>')).toBe(
      "&lt;a href=&quot;https://evil.test&quot;&gt;click&lt;/a&gt;",
    );
    expect(textForEmail("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
  it("handles null and quotes", () => {
    expect(textForEmail(null)).toBe("");
    expect(textForEmail(undefined)).toBe("");
    expect(textForEmail("Rye's &#39;land&#x27;")).toBe("Rye&#39;s &#39;land&#39;");
  });
});

describe("decodeBasicEntities", () => {
  it("decodes in one pass", () => {
    expect(decodeBasicEntities("&amp;lt;")).toBe("&lt;");
    expect(decodeBasicEntities("&lt;b&gt; &quot;x&quot; &apos;y&apos;")).toBe(`<b> "x" 'y'`);
    expect(decodeBasicEntities("&nbsp;")).toBe("&nbsp;");
  });
});

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });
});
