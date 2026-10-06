/**
 * When a service worker takes control of the page.
 *
 * The generated worker calls skipWaiting() and clientsClaim(), so the first
 * install of a brand-new visit fires `controllerchange` too. That visit has
 * no previous controller and must not reload. A later activate, while a
 * controller was already running, is a real update and reloads once.
 */
export function shouldReloadOnControllerChange(hadController: boolean, refreshing: boolean): boolean {
  return hadController && !refreshing;
}

/** Someone is in a text field on the live week board. */
export function shouldDeferWeekBoardReload(
  pathname: string,
  fieldFocused: boolean,
  dictationListening: boolean,
): boolean {
  if (!pathname.startsWith("/season2/week/")) return false;
  return fieldFocused || dictationListening;
}

export type ControllerReload = "skip" | "reload" | "defer";

/** One decision for both the controllerchange event and a workbox update. */
export function controllerReloadAction(input: {
  hadController: boolean;
  refreshing: boolean;
  pathname: string;
  fieldFocused: boolean;
  dictationListening: boolean;
}): ControllerReload {
  if (!shouldReloadOnControllerChange(input.hadController, input.refreshing)) return "skip";
  if (shouldDeferWeekBoardReload(input.pathname, input.fieldFocused, input.dictationListening)) return "defer";
  return "reload";
}

export const SW_REFRESH_LABEL = "New version ready, refresh";
