import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { memoryAdapter } from "better-auth/adapters/memory";
import { publishedOAuthRedirectURI } from "./oauth-callback";

process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
process.env.BETTER_AUTH_URL = "https://vymanager.example.com";
process.env.NODE_ENV = "test";

mock.module("@prisma/client", {
  exports: {
    PrismaClient: class {
      oAuthProvider = {
        findMany: async () => [
          {
            providerId: "authelia",
            displayName: "Authelia",
            enabled: true,
            clientId: "client",
            clientSecret: "secret",
            discoveryUrl: null,
            authorizationUrl: "https://idp.example/authorize",
            tokenUrl: "https://idp.example/token",
            userInfoUrl: null,
            scopes: "openid email profile",
            pkce: true,
            roleMappingEnabled: false,
            groupsClaim: "groups",
          },
        ],
      };
      oAuthRoleMapping = { findMany: async () => [] };
      user = { count: async () => 1 };
    },
  },
});

mock.module("better-auth/adapters/prisma", {
  exports: {
    prismaAdapter: () => memoryAdapter({}),
  },
});

describe("generic OAuth authorize URL", () => {
  it("sends the published callback as redirect_uri", async () => {
    const { getAuth } = await import("./auth.ts");
    const expected = publishedOAuthRedirectURI(
      "https://vymanager.example.com",
      "authelia",
    );
    const auth = await getAuth();
    const response = await auth.handler(
      new Request("https://vymanager.example.com/api/auth/sign-in/social", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://vymanager.example.com",
        },
        body: JSON.stringify({
          provider: "authelia",
          callbackURL: "/dashboard",
          disableRedirect: true,
        }),
      }),
    );
    const body = await response.text();
    assert.equal(response.status, 200, body);
    const url = new URL(JSON.parse(body).url as string);
    assert.equal(url.searchParams.get("redirect_uri"), expected);
  });
});
