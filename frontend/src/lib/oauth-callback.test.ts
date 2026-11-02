import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOAuthCallbackPath,
  publishedOAuthRedirectURI,
  rewriteLegacyOAuthCallbackURL,
} from "./oauth-callback";

describe("published OAuth callback", () => {
  it("keeps the callback URL already registered with identity providers", () => {
    assert.equal(
      publishedOAuthRedirectURI("https://vymanager.example.com", "authelia"),
      "https://vymanager.example.com/api/auth/oauth2/callback/authelia",
    );
    assert.equal(
      publishedOAuthRedirectURI("https://vymanager.example.com/", "authelia"),
      "https://vymanager.example.com/api/auth/oauth2/callback/authelia",
    );
    assert.equal(
      publishedOAuthRedirectURI(
        "https://vymanager.example.com/api/auth",
        "authelia",
      ),
      "https://vymanager.example.com/api/auth/oauth2/callback/authelia",
    );
  });

  it("rewrites the published hit onto the 1.7 handler and keeps the code", () => {
    const url = new URL(
      "https://vymanager.example.com/api/auth/oauth2/callback/authelia?code=abc&state=xyz",
    );
    const next = rewriteLegacyOAuthCallbackURL(url);
    assert.equal(next.pathname, "/api/auth/callback/authelia");
    assert.equal(next.search, "?code=abc&state=xyz");
    assert.equal(url.pathname, "/api/auth/oauth2/callback/authelia");
  });

  it("leaves non-callback auth paths alone", () => {
    const url = new URL("https://vymanager.example.com/api/auth/sign-in/email");
    assert.equal(rewriteLegacyOAuthCallbackURL(url), url);
    assert.equal(isOAuthCallbackPath(url.pathname), false);
  });

  it("treats both the published path and the handler path as OAuth callbacks", () => {
    assert.equal(
      isOAuthCallbackPath("/api/auth/oauth2/callback/authelia"),
      true,
    );
    assert.equal(isOAuthCallbackPath("/api/auth/callback/authelia"), true);
  });
});
