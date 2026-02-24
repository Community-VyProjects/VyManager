// OAuth provider configuration API service

export interface OAuthProviderConfig {
  id: string;
  providerId: string;
  displayName: string;
  enabled: boolean;
  clientId: string;
  clientSecret?: string; // only returned on single-item GET
  discoveryUrl?: string | null;
  authorizationUrl?: string | null;
  tokenUrl?: string | null;
  userInfoUrl?: string | null;
  scopes?: string | null;
  pkce: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveProviderInput {
  providerId: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  enabled?: boolean;
  discoveryUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string;
  pkce?: boolean;
}

export interface UpdateProviderInput {
  displayName?: string;
  clientId?: string;
  clientSecret?: string; // omit to keep existing
  enabled?: boolean;
  discoveryUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string;
  pkce?: boolean;
}

class OAuthConfigService {
  private async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const res = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  async listProviders(): Promise<OAuthProviderConfig[]> {
    const data = await this.request<{ providers: OAuthProviderConfig[] }>(
      "/api/oauth-config"
    );
    return data.providers;
  }

  async getProvider(providerId: string): Promise<OAuthProviderConfig> {
    const data = await this.request<{ provider: OAuthProviderConfig }>(
      `/api/oauth-config/${providerId}`
    );
    return data.provider;
  }

  async saveProvider(input: SaveProviderInput): Promise<OAuthProviderConfig> {
    const data = await this.request<{ provider: OAuthProviderConfig }>(
      "/api/oauth-config",
      { method: "POST", body: JSON.stringify(input) }
    );
    return data.provider;
  }

  async updateProvider(
    providerId: string,
    input: UpdateProviderInput
  ): Promise<OAuthProviderConfig> {
    const data = await this.request<{ provider: OAuthProviderConfig }>(
      `/api/oauth-config/${providerId}`,
      { method: "PUT", body: JSON.stringify(input) }
    );
    return data.provider;
  }

  async toggleProvider(
    providerId: string,
    enabled: boolean
  ): Promise<OAuthProviderConfig> {
    const data = await this.request<{ provider: OAuthProviderConfig }>(
      `/api/oauth-config/${providerId}`,
      { method: "PATCH", body: JSON.stringify({ enabled }) }
    );
    return data.provider;
  }

  async deleteProvider(providerId: string): Promise<void> {
    await this.request(`/api/oauth-config/${providerId}`, { method: "DELETE" });
  }
}

export const oauthConfigService = new OAuthConfigService();

// ---------------------------------------------------------------------------
// Well-known providers catalogue
// ---------------------------------------------------------------------------

export interface WellKnownProvider {
  providerId: string;
  displayName: string;
  description: string;
  /** Pre-filled discovery URL (OIDC) */
  discoveryUrl?: string;
  /** Pre-filled manual endpoints (non-OIDC providers like GitHub, Discord) */
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  /** Pre-filled scopes */
  defaultScopes: string;
  /** Whether manual endpoint fields are shown (non-OIDC providers) */
  requiresManualEndpoints?: boolean;
  /** SVG path data or URL — used for the provider icon */
  iconKey: string;
}

export const WELL_KNOWN_PROVIDERS: WellKnownProvider[] = [
  {
    providerId: "google",
    displayName: "Google",
    description: "Sign in with Google accounts",
    discoveryUrl: "https://accounts.google.com/.well-known/openid-configuration",
    defaultScopes: "openid email profile",
    iconKey: "google",
  },
  {
    providerId: "github",
    displayName: "GitHub",
    description: "Sign in with GitHub accounts",
    discoveryUrl: undefined,
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    defaultScopes: "read:user user:email",
    requiresManualEndpoints: true,
    iconKey: "github",
  },
  {
    providerId: "microsoft",
    displayName: "Microsoft",
    description: "Sign in with Microsoft / Azure AD accounts",
    discoveryUrl:
      "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
    defaultScopes: "openid email profile",
    iconKey: "microsoft",
  },
  {
    providerId: "gitlab",
    displayName: "GitLab",
    description: "Sign in with GitLab accounts",
    discoveryUrl: "https://gitlab.com/.well-known/openid-configuration",
    defaultScopes: "openid email profile",
    iconKey: "gitlab",
  },
  {
    providerId: "discord",
    displayName: "Discord",
    description: "Sign in with Discord accounts",
    discoveryUrl: undefined,
    authorizationUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    userInfoUrl: "https://discord.com/api/users/@me",
    defaultScopes: "identify email",
    requiresManualEndpoints: true,
    iconKey: "discord",
  },
  {
    providerId: "slack",
    displayName: "Slack",
    description: "Sign in with Slack accounts",
    discoveryUrl: "https://slack.com/.well-known/openid-configuration",
    defaultScopes: "openid email profile",
    iconKey: "slack",
  },
  {
    providerId: "auth0",
    displayName: "Auth0",
    description: "Sign in via Auth0 (any identity provider)",
    discoveryUrl: "",
    defaultScopes: "openid email profile",
    iconKey: "auth0",
  },
  {
    providerId: "okta",
    displayName: "Okta",
    description: "Sign in via Okta identity platform",
    discoveryUrl: "",
    defaultScopes: "openid email profile",
    iconKey: "okta",
  },
  {
    providerId: "keycloak",
    displayName: "Keycloak",
    description: "Sign in via self-hosted Keycloak",
    discoveryUrl: "",
    defaultScopes: "openid email profile",
    iconKey: "keycloak",
  },
  {
    providerId: "authentik",
    displayName: "Authentik",
    description: "Sign in via self-hosted Authentik",
    discoveryUrl: "",
    defaultScopes: "openid email profile",
    iconKey: "authentik",
  },
  {
    providerId: "custom-oidc",
    displayName: "Custom OIDC",
    description: "Any OpenID Connect compatible provider",
    discoveryUrl: "",
    defaultScopes: "openid email profile",
    iconKey: "custom",
  },
] as const;
