// Google Calendar OAuth 2.0 flow for Prime Realty CRM.
// Supabase secrets required: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, APP_URL
//
// Redirect URI to register in Google Cloud Console:
//   https://<your-project>.supabase.co/functions/v1/google-calendar-oauth
//
// Flow:
//   1. Frontend redirects to ?action=authorize&user_id=<uuid>
//   2. Google redirects back with ?code=...&state=<user_id>
//   3. Edge function stores refresh_token and redirects to APP_URL/configuracoes?google_calendar=success

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID =
  Deno.env.get("GOOGLE_CLIENT_ID") ?? Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET =
  Deno.env.get("GOOGLE_CLIENT_SECRET") ?? Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "";
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/$/, "");

// The redirect_uri registered in Google Cloud Console must match this exactly.
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-oauth`;
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // ── 1. Authorize: redirect user to Google consent screen ─────────────────
  if (action === "authorize") {
    const userId = url.searchParams.get("user_id");
    if (!userId) return new Response("Missing user_id", { status: 400 });
    if (!GOOGLE_CLIENT_ID) return new Response("GOOGLE_CLIENT_ID not configured", { status: 500 });

    const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    googleUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    googleUrl.searchParams.set("response_type", "code");
    googleUrl.searchParams.set("scope", SCOPES);
    googleUrl.searchParams.set("access_type", "offline");
    googleUrl.searchParams.set("prompt", "consent"); // force refresh_token on every auth
    googleUrl.searchParams.set("state", userId);
    return Response.redirect(googleUrl.toString(), 302);
  }

  // ── 2. Callback: exchange code, store token, redirect back to app ─────────
  if (url.searchParams.has("code") || url.searchParams.has("error")) {
    const code = url.searchParams.get("code");
    const userId = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    if (oauthError || !code || !userId) {
      console.warn("[google-calendar-oauth] callback error:", oauthError);
      return Response.redirect(`${APP_URL}/configuracoes?google_calendar=error`, 302);
    }

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) throw new Error(await tokenRes.text());

      const tokens = await tokenRes.json();
      const refreshToken = tokens.refresh_token as string | undefined;
      if (!refreshToken)
        throw new Error(
          "No refresh_token returned — ensure prompt=consent and access_type=offline",
        );

      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      // Store refresh token (service-role only column)
      await admin
        .from("user_integrations")
        .upsert(
          { user_id: userId, google_calendar_refresh_token_ciphertext: refreshToken },
          { onConflict: "user_id" },
        );

      // Mark profile as connected
      await admin.from("profiles").update({ google_calendar_connected: true }).eq("id", userId);

      // Register in integrations table so the UI shows "Conectado"
      await admin
        .from("integrations")
        .upsert(
          { owner_id: userId, provider: "google_calendar", status: "connected", configuration: {} },
          { onConflict: "owner_id,provider" },
        );

      return Response.redirect(`${APP_URL}/configuracoes?google_calendar=success`, 302);
    } catch (err) {
      console.error("[google-calendar-oauth] callback error:", err);
      return Response.redirect(`${APP_URL}/configuracoes?google_calendar=error`, 302);
    }
  }

  // ── 3. Revoke: clear token, mark as disconnected ──────────────────────────
  if (action === "revoke" && req.method === "POST") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const userClient = createClient(SUPABASE_URL, authHeader.replace("Bearer ", ""));
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: integration } = await admin
      .from("user_integrations")
      .select("google_calendar_refresh_token_ciphertext")
      .eq("user_id", user.id)
      .maybeSingle();

    if (integration?.google_calendar_refresh_token_ciphertext) {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${integration.google_calendar_refresh_token_ciphertext}`,
        { method: "POST" },
      ).catch(() => {});
    }

    await admin
      .from("user_integrations")
      .update({ google_calendar_refresh_token_ciphertext: null })
      .eq("user_id", user.id);

    await admin.from("profiles").update({ google_calendar_connected: false }).eq("id", user.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not found", { status: 404 });
});
