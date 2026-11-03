import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIRECT_CLIENT_KEY,
  LOGIN_RATE_LIMIT,
  LOGIN_RATE_MAX_CLIENTS,
  LOGIN_RATE_WINDOW_MS,
  clientIpForRateLimit,
  createLoginRateLimiter,
  trustedProxyHops,
} from "./login-rate-limit";

describe("trustedProxyHops", () => {
  it("treats unset, junk, and oversized counts as no trusted proxy", () => {
    assert.equal(trustedProxyHops(undefined), 0);
    assert.equal(trustedProxyHops(""), 0);
    assert.equal(trustedProxyHops("nope"), 0);
    assert.equal(trustedProxyHops("-1"), 0);
    assert.equal(trustedProxyHops("9"), 0);
    assert.equal(trustedProxyHops("1"), 1);
    assert.equal(trustedProxyHops(" 2 "), 2);
  });
});

describe("clientIpForRateLimit", () => {
  it("ignores forwarded headers when no proxy is trusted", () => {
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "203.0.113.10",
        forwardedFor: "1.1.1.1, 198.51.100.8",
        trustedProxyHops: 0,
      }),
      "203.0.113.10",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "::ffff:203.0.113.10",
        forwardedFor: "9.9.9.9",
        trustedProxyHops: 0,
      }),
      "203.0.113.10",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: null,
        forwardedFor: "1.1.1.1, 203.0.113.5",
        trustedProxyHops: 0,
      }),
      DIRECT_CLIENT_KEY,
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: null,
        forwardedFor: "203.0.113.5",
        trustedProxyHops: 1,
      }),
      DIRECT_CLIENT_KEY,
    );
  });

  it("uses the hop the immediate proxy appended, not the client prefix", () => {
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "127.0.0.1",
        forwardedFor: "1.1.1.1, 203.0.113.5",
        trustedProxyHops: 1,
      }),
      "203.0.113.5",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "127.0.0.1",
        forwardedFor: "  1.1.1.1 ,  , 203.0.113.5  ",
        trustedProxyHops: 1,
      }),
      "203.0.113.5",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "127.0.0.1",
        forwardedFor: null,
        trustedProxyHops: 1,
      }),
      "127.0.0.1",
    );
  });

  it("does not put every user in the CDN bucket when two proxies append", () => {
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "10.0.0.2",
        forwardedFor: "9.9.9.9, 203.0.113.5, 198.51.100.2",
        trustedProxyHops: 2,
      }),
      "203.0.113.5",
    );
    assert.equal(
      clientIpForRateLimit({
        peerAddress: "10.0.0.2",
        forwardedFor: "9.9.9.9, 203.0.113.5, 198.51.100.2",
        trustedProxyHops: 1,
      }),
      "198.51.100.2",
    );
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

  it("refuses new clients once the window map is full", () => {
    const limiter = createLoginRateLimiter();
    const now = 7_000_000;
    for (let i = 0; i < LOGIN_RATE_MAX_CLIENTS; i++) {
      assert.equal(limiter.allow(`client-${i}`, now), true);
    }
    assert.equal(limiter.tracked(), LOGIN_RATE_MAX_CLIENTS);
    assert.equal(limiter.allow("one-more", now), false);
    assert.equal(limiter.tracked(), LOGIN_RATE_MAX_CLIENTS);
    assert.equal(limiter.allow("client-0", now), true);
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
