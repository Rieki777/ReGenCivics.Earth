/**
 * Buffer access token lookup. The settings panel stores a token in
 * site_settings; env is the fallback. Both Broadcast posting and the
 * Express /api/admin/buffer routes must use this, or a token saved in
 * Settings looks "not configured" on the compose grid.
 */
import { getSiteSetting } from "../db";
import { ENV } from "../_core/env";

export async function getBufferAccessToken(): Promise<string | null> {
  const dbToken = await getSiteSetting("buffer_access_token");
  const token = (dbToken || ENV.bufferAccessToken || "").trim();
  return token.length > 0 ? token : null;
}
