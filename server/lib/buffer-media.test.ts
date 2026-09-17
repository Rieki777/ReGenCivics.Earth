import { describe, expect, it } from "vitest";
import { appendBufferMedia, isPublicHttpUrl } from "./buffer-media";

describe("appendBufferMedia", () => {
  it("attaches photo + thumbnail when imageUrl is set", () => {
    const params = new URLSearchParams();
    appendBufferMedia(params, { imageUrl: "https://cdn.example.com/a.jpg" });
    expect(params.get("media[photo]")).toBe("https://cdn.example.com/a.jpg");
    expect(params.get("media[thumbnail]")).toBe("https://cdn.example.com/a.jpg");
    expect(params.get("media[link]")).toBeNull();
  });

  it("attaches link without photo when only link is set", () => {
    const params = new URLSearchParams();
    appendBufferMedia(params, { link: "https://regencivics.earth/x" });
    expect(params.get("media[link]")).toBe("https://regencivics.earth/x");
    expect(params.get("media[photo]")).toBeNull();
  });

  it("can send both image and link", () => {
    const params = new URLSearchParams();
    appendBufferMedia(params, {
      imageUrl: " https://cdn.example.com/p.png ",
      link: " https://regencivics.earth ",
    });
    expect(params.get("media[photo]")).toBe("https://cdn.example.com/p.png");
    expect(params.get("media[link]")).toBe("https://regencivics.earth");
  });
});

describe("isPublicHttpUrl", () => {
  it("accepts http(s) URLs", () => {
    expect(isPublicHttpUrl("https://cdn.example.com/a.jpg")).toBe(true);
    expect(isPublicHttpUrl("http://example.com/a.jpg")).toBe(true);
  });

  it("rejects empty or non-http", () => {
    expect(isPublicHttpUrl("")).toBe(false);
    expect(isPublicHttpUrl("ftp://x")).toBe(false);
    expect(isPublicHttpUrl("not a url")).toBe(false);
  });
});
