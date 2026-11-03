import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOGIN_RATE_LIMIT,
  LOGIN_RATE_WINDOW_MS,
  clientIpFromProxyHeaders,
  createLoginRateLimiter,
} from "./login-rate-limit";

describe("clientIpFromProxyHeaders", () => {
  it("uses the last hop a trusted proxy appended, not the client prefix", () => {
    assert.equal(
      clientIpFromProxyHeaders("1.1.1.1, 203.0.113.5", "198.51.100.9"),
      "203.0.113.5",
    );
    assert.equal(
      clientIpFromProxyHeaders("1.1.1.1, 2.2.2.2, 203.0.113.5", null),
      "203.0.113.5",
    );
    assert.equal(
      clientIpFromProxyHeaders("  1.1.1.1 ,  , 203.0.113.5  ", null),
      "203.0.113.5",
    );
    assert.equal(
      clientIpFromProxyHeaders("2001:db8::1, 2001:db8::2", null),
      "2001:db8::2",
    );
  });

  it("falls back to x-real-ip only when no forwarded hop was appended", () => {
    assert.equal(clientIpFromProxyHeaders(null, " 203.0.113.8 "), "203.0.113.8");
    assert.equal(clientIpFromProxyHeaders(" , ", "203.0.113.8"), "203.0.113.8");
    assert.equal(clientIpFromProxyHeaders("", "203.0.113.8"), "203.0.113.8");
    assert.equal(clientIpFromProxyHeaders(null, null), "unknown");
    assert.equal(clientIpFromProxyHeaders(" , ", "  "), "unknown");
  });
});

describe("login rate limiter", () => {
  it("stops the 11th attempt in the window and still counts a different client", () => {
    const limiter = createLoginRateLimiter();
    const now = 1_000_000;
    for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
      assert.equal(limiter.allow("203.0.113.5", now), true);
    }
    assert.equal(limiter.allow("203.0.113.5", now), false);
    assert.equal(limiter.allow("203.0.113.6", now), true);
    assert.equal(limiter.tracked(), 2);
  });

  it("drops expired keys so the map cannot grow without bound", () => {
    const limiter = createLoginRateLimiter();
    const start = 5_000_000;
    for (let i = 0; i < 20; i++) {
      assert.equal(limiter.allow(`203.0.113.${i}`, start), true);
    }
    assert.equal(limiter.tracked(), 20);
    const later = start + LOGIN_RATE_WINDOW_MS + 1;
    assert.equal(limiter.allow("203.0.113.50", later), true);
    assert.equal(limiter.tracked(), 1);
  });

  it("allows the same client again after the window, not at the exact reset", () => {
    const limiter = createLoginRateLimiter();
    const start = 9_000_000;
    for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
      assert.equal(limiter.allow("203.0.113.5", start), true);
    }
    assert.equal(limiter.allow("203.0.113.5", start + LOGIN_RATE_WINDOW_MS), false);
    assert.equal(limiter.allow("203.0.113.5", start + LOGIN_RATE_WINDOW_MS + 1), true);
    assert.equal(limiter.tracked(), 1);
  });
});
