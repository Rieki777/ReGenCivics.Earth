/**
 * googlecal.ts — Google Calendar auto-push
 *
 * When an event is created in Admin, it is also written to the ReGen Civics
 * public Google Calendar so subscribers see it immediately without a manual step.
 *
 * Setup (one-time, done by Rye):
 *  1. Google Cloud Console → IAM & Admin → Service Accounts → Create service account
 *  2. Grant the service account Editor access on the calendar:
 *       Google Calendar → Settings → [Calendar] → Share with specific people → add service account email
 *  3. Create a JSON key for the service account and base64-encode the entire JSON string:
 *       base64 < service-account-key.json | tr -d '\n'
 *  4. Add to Railway env vars:
 *       GOOGLE_SERVICE_ACCOUNT_JSON_B64 = <base64 string>
 *       GOOGLE_CALENDAR_ID = 63ce71cca81ab47fb9986b4bc1dd379eba3da72ecc93a9b8424c5c49812fa69f@group.calendar.google.com
 *
 * If either env var is missing, this function logs a warning and silently skips.
 */

interface CalendarEvent {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
}

/** Minimal JWT for Google service account — avoids the 100kB googleapis dependency. */
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string | null> {
  try {
    const sa = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })).toString("base64url");

    // Use node crypto to sign with the private key
    const { createSign } = await import("crypto");
    const sign = createSign("RSA-SHA256");
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(sa.private_key, "base64url");
    const jwt = `${header}.${payload}.${signature}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenRes.ok) {
      console.warn("[googlecal] Token fetch failed:", tokenRes.status, await tokenRes.text());
      return null;
    }

    const { access_token } = await tokenRes.json() as { access_token: string };
    return access_token;
  } catch (err) {
    console.error("[googlecal] JWT error:", err);
    return null;
  }
}

export async function pushEventToGoogleCalendar(event: CalendarEvent): Promise<void> {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!b64 || !calendarId) {
    console.log("[googlecal] Skipped — GOOGLE_SERVICE_ACCOUNT_JSON_B64 or GOOGLE_CALENDAR_ID not set");
    return;
  }

  try {
    const serviceAccountJson = Buffer.from(b64, "base64").toString("utf8");
    const token = await getGoogleAccessToken(serviceAccountJson);
    if (!token) return;

    // Convert to Google Calendar datetime format
    const toGcalTime = (d: Date, tz: string) => ({
      dateTime: d.toISOString(),
      timeZone: tz,
    });

    const body = {
      summary: event.title,
      description: event.description || "",
      start: toGcalTime(event.startTime, event.timezone || "America/New_York"),
      end: toGcalTime(event.endTime, event.timezone || "America/New_York"),
    };

    const encodedId = encodeURIComponent(calendarId);
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn("[googlecal] Event insert failed:", res.status, await res.text());
    } else {
      const data = await res.json() as { id: string };
      console.log(`[googlecal] Event created: ${data.id}`);
    }
  } catch (err) {
    console.error("[googlecal] Error:", err);
  }
}
