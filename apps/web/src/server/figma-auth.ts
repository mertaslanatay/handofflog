/**
 * Figma OAuth server helpers (I-02/I-03). Uses the tested pure builders from
 * @backend/oauth-figma and performs the network calls with env-injected secrets.
 * Secrets are read from process.env, never logged.
 */
import { buildAuthorizeUrl, buildTokenExchangeRequest } from "@backend/oauth-figma";

export interface FigmaProfile {
  figmaUserId: string;
  email: string;
  name?: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function baseConfig(): { clientId: string; redirectUri: string } {
  return {
    clientId: requireEnv("FIGMA_OAUTH_CLIENT_ID"),
    redirectUri: requireEnv("FIGMA_OAUTH_REDIRECT_URI"),
  };
}

export function loginUrl(state: string): string {
  return buildAuthorizeUrl(baseConfig(), state);
}

/** Exchange the auth code for a token and fetch the Figma profile. */
export async function exchangeAndFetchProfile(code: string): Promise<FigmaProfile> {
  const req = buildTokenExchangeRequest({
    ...baseConfig(),
    clientSecret: requireEnv("FIGMA_OAUTH_CLIENT_SECRET"),
    code,
  });
  const tokenRes = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
  if (!tokenRes.ok) throw new Error("Figma token exchange failed.");
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("No access_token from Figma.");

  const meRes = await fetch("https://api.figma.com/v1/me", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!meRes.ok) throw new Error("Failed to fetch Figma profile.");
  const me = (await meRes.json()) as { id?: string; email?: string; handle?: string };
  if (!me.id || !me.email) throw new Error("Incomplete Figma profile.");

  return { figmaUserId: String(me.id), email: me.email, name: me.handle };
}
