// Shared Google Calendar API helpers for Supabase Edge Functions.
// Both google-calendar-oauth and google-calendar-sync import from here.
// PAZ (evolution-webhook) duplicates the minimal subset inline to avoid cross-function imports at runtime.

export interface GCalEventPayload {
  title: string;
  description?: string;
  location?: string;
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601
  reminderMinutes?: number;
}

export async function gcalRefreshToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id:
        Deno.env.get("GOOGLE_CLIENT_ID") ?? Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "",
      client_secret:
        Deno.env.get("GOOGLE_CLIENT_SECRET") ??
        Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ??
        "",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const json = await res.json();
  return json.access_token as string;
}

export async function gcalCreateEvent(
  accessToken: string,
  payload: GCalEventPayload,
): Promise<string> {
  const body: Record<string, unknown> = {
    summary: payload.title,
    start: { dateTime: payload.startAt, timeZone: "America/Sao_Paulo" },
    end: { dateTime: payload.endAt, timeZone: "America/Sao_Paulo" },
  };
  if (payload.description) body.description = payload.description;
  if (payload.location) body.location = payload.location;
  if (payload.reminderMinutes != null) {
    body.reminders = {
      useDefault: false,
      overrides: [{ method: "popup", minutes: payload.reminderMinutes }],
    };
  }
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`gcalCreate failed: ${await res.text()}`);
  const json = await res.json();
  return json.id as string;
}

export async function gcalUpdateEvent(
  accessToken: string,
  eventId: string,
  payload: Partial<GCalEventPayload>,
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (payload.title) body.summary = payload.title;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.location !== undefined) body.location = payload.location;
  if (payload.startAt) body.start = { dateTime: payload.startAt, timeZone: "America/Sao_Paulo" };
  if (payload.endAt) body.end = { dateTime: payload.endAt, timeZone: "America/Sao_Paulo" };
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok && res.status !== 410) throw new Error(`gcalUpdate failed: ${await res.text()}`);
}

export async function gcalDeleteEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`gcalDelete failed: ${await res.text()}`);
  }
}
