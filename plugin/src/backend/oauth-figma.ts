/**
 * Figma OAuth request builders (I-02). Pure — no secrets stored, no network here;
 * the deploy-time route injects client id/secret from env and performs the fetch.
 * These builders make the redirect and token-exchange requests deterministic and
 * unit-testable.
 */
export const FIGMA_AUTHORIZE_URL = "https://www.figma.com/oauth";
export const FIGMA_TOKEN_URL = "https://api.figma.com/v1/oauth/token";
// Login only needs the user's identity (GET /v1/me) → current_user:read.
// (Must be enabled in the Figma app's OAuth scopes too.)
export const DEFAULT_SCOPES = ["current_user:read"];

export interface FigmaOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}

/** Build the authorize redirect URL the user is sent to (state = CSRF token). */
export function buildAuthorizeUrl(config: FigmaOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: (config.scopes ?? DEFAULT_SCOPES).join(" "),
    state,
    response_type: "code",
  });
  return `${FIGMA_AUTHORIZE_URL}?${params.toString()}`;
}

export interface TokenExchangeParams {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}

export interface HttpRequestDescriptor {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
}

/** Build the (form-encoded) token-exchange request; caller injects fetch. */
export function buildTokenExchangeRequest(params: TokenExchangeParams): HttpRequestDescriptor {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code: params.code,
    grant_type: "authorization_code",
  });
  return {
    url: FIGMA_TOKEN_URL,
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  };
}

// Version-history feature (DEC-034) needs file + version read on top of identity.
// NOTE: these must also be enabled in the Figma app's OAuth scopes, or authorize
// returns "Invalid scopes for app".
export const LOGIN_SCOPES = ["current_user:read", "files:read", "file_versions:read"];
