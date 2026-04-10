/**
 * API client for calling the main site's tRPC endpoints from the gov app.
 * Forwards the Privy auth token so the main site recognizes the user.
 */

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://regencivics.earth";

export async function fetchFromMainSite<T>(
  procedure: string,
  input?: unknown,
  accessToken?: string
): Promise<T> {
  const url = `${MAIN_SITE_URL}/api/trpc/${procedure}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = input
    ? await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
        credentials: "include",
      })
    : await fetch(`${url}?input=${encodeURIComponent(JSON.stringify(input ?? {}))}`, {
        headers,
        credentials: "include",
      });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.result?.data as T;
}
