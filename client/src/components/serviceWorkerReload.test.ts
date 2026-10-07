import { describe, expect, it } from "vitest";
import {
  controllerReloadAction,
  shouldDeferWeekBoardReload,
  shouldReloadOnControllerChange,
} from "./serviceWorkerReload";

describe("service worker controllerchange guard", () => {
  it("does not reload on the first install", () => {
    expect(shouldReloadOnControllerChange(false, false)).toBe(false);
    expect(controllerReloadAction({
      hadController: false,
      refreshing: false,
      pathname: "/season2/week/2",
      fieldFocused: true,
      dictationListening: true,
    })).toBe("skip");
  });

  it("reloads exactly once when a controller was already running", () => {
    expect(shouldReloadOnControllerChange(true, false)).toBe(true);
    expect(controllerReloadAction({
      hadController: true,
      refreshing: false,
      pathname: "/apply",
      fieldFocused: false,
      dictationListening: false,
    })).toBe("reload");
    expect(shouldReloadOnControllerChange(true, true)).toBe(false);
    expect(controllerReloadAction({
      hadController: true,
      refreshing: true,
      pathname: "/apply",
      fieldFocused: false,
      dictationListening: false,
    })).toBe("skip");
  });

  it("defers a week-board update while a field is focused or the mic is listening", () => {
    expect(shouldDeferWeekBoardReload("/season2/week/2", true, false)).toBe(true);
    expect(shouldDeferWeekBoardReload("/season2/week/2", false, true)).toBe(true);
    expect(shouldDeferWeekBoardReload("/season2/week/2", false, false)).toBe(false);
    expect(shouldDeferWeekBoardReload("/season2", true, true)).toBe(false);
    expect(controllerReloadAction({
      hadController: true,
      refreshing: false,
      pathname: "/season2/week/2",
      fieldFocused: true,
      dictationListening: false,
    })).toBe("defer");
    expect(controllerReloadAction({
      hadController: true,
      refreshing: false,
      pathname: "/season2/week/2",
      fieldFocused: false,
      dictationListening: false,
    })).toBe("reload");
  });
});
