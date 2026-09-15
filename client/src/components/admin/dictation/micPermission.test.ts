import { afterEach, describe, expect, it, vi } from "vitest";
import { queryMicrophonePermission, requestMicrophoneAccess } from "./micPermission";

type PermissionState = "granted" | "denied" | "prompt";

function installPermissions(state: PermissionState | (() => Promise<PermissionStatus>)) {
  const query =
    typeof state === "function"
      ? state
      : vi.fn(async () => ({ state, onchange: null } as PermissionStatus));
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: { query },
  });
  return query;
}

function removePermissions() {
  Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined });
}

function installGetUserMedia(impl: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(impl) },
  });
}

function removeGetUserMedia() {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
}

afterEach(() => {
  removePermissions();
  removeGetUserMedia();
});

describe("queryMicrophonePermission", () => {
  it("returns unknown when the Permissions API is missing", async () => {
    removePermissions();
    await expect(queryMicrophonePermission()).resolves.toBe("unknown");
  });

  it("distinguishes denied, prompt, and granted", async () => {
    installPermissions("denied");
    await expect(queryMicrophonePermission()).resolves.toBe("denied");
    installPermissions("prompt");
    await expect(queryMicrophonePermission()).resolves.toBe("prompt");
    installPermissions("granted");
    await expect(queryMicrophonePermission()).resolves.toBe("granted");
  });

  it("returns unknown when query throws (Firefox-style unsupported name)", async () => {
    installPermissions(async () => {
      throw new TypeError("not supported");
    });
    await expect(queryMicrophonePermission()).resolves.toBe("unknown");
  });
});

describe("requestMicrophoneAccess", () => {
  it("returns unknown when getUserMedia is missing", async () => {
    removeGetUserMedia();
    await expect(requestMicrophoneAccess()).resolves.toBe("unknown");
  });

  it("stops tracks after a successful capture", async () => {
    const stop = vi.fn();
    installGetUserMedia(async () => ({ getTracks: () => [{ stop }] }) as unknown as MediaStream);
    await expect(requestMicrophoneAccess()).resolves.toBe("granted");
    expect(stop).toHaveBeenCalled();
  });

  it("maps NotAllowedError to denied", async () => {
    installGetUserMedia(async () => {
      throw new DOMException("blocked", "NotAllowedError");
    });
    await expect(requestMicrophoneAccess()).resolves.toBe("denied");
  });
});
