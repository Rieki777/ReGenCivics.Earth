export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const getGoogleLoginUrl = () => "/api/oauth/google";
export const getAppleLoginUrl = () => "/api/oauth/apple";

// Default login URL — points to Google (primary)
export const getLoginUrl = () => getGoogleLoginUrl();
