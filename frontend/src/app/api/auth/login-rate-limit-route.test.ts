import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { NextRequest } from "next/server";
import { LOGIN_RATE_LIMIT } from "@/lib/login-rate-limit";
import { runWithClientPeer } from "@/lib/client-peer";

// mock.module is only on the ESM test runner, not tsx's CJS loader:
// node --experimental-test-module-mocks --import tsx --test src/app/api/auth/login-rate-limit-route.test.ts

mock.module("@/lib/auth", {
  exports: {
    getAuth: async () => ({
      handler: async () => new Response("ok", { status: 200 }),
    }),
  },
});

function signIn(headers: Headers): NextRequest {
  return new NextRequest("https://vymanager.example.com/api/auth/sign-in/email", {
    method: "POST",
    headers,
  });
}

function rotating(prefix: number, last: string): Headers {
  return new Headers({
    "x-forwarded-for": `${prefix}.${prefix}.${prefix}.${prefix}, ${last}`,
    "x-real-ip": `198.51.100.${prefix}`,
  });
}

async function withHops<T>(hops: string | undefined, fn: () => Promise<T>): Promise<T> {
  const previous = process.env.TRUSTED_PROXY_HOPS;
  if (hops === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = hops;
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.TRUSTED_PROXY_HOPS;
    else process.env.TRUSTED_PROXY_HOPS = previous;
  }
}

describe("sign-in rate limit route", { concurrency: false }, () => {
  it("does not let a direct client rotate forwarded headers", async () => {
    const { POST } = await import("./[...all]/route");
    await withHops(undefined, async () => {
      await runWithClientPeer("203.0.113.10", async () => {
        for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
          const response = await POST(signIn(rotating(i, "203.0.113.50")));
          assert.equal(response.status, 200, `attempt ${i + 1} must not be limited`);
        }
        const blocked = await POST(signIn(rotating(9, "203.0.113.99")));
        assert.equal(blocked.status, 429);
        const realIpOnly = await POST(
          signIn(new Headers({ "x-real-ip": "198.51.100.77" })),
        );
        assert.equal(realIpOnly.status, 429);
      });
    });
  });

  it("counts the hop a trusted proxy appended, not the client prefix", async () => {
    const { POST } = await import("./[...all]/route");
    await withHops("1", async () => {
      await runWithClientPeer("127.0.0.1", async () => {
        const last = "203.0.113.50";
        for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
          const response = await POST(signIn(rotating(i, last)));
          assert.equal(response.status, 200, `attempt ${i + 1} must not be limited`);
        }
        const blocked = await POST(signIn(rotating(9, last)));
        assert.equal(blocked.status, 429);
        const other = await POST(signIn(rotating(1, "203.0.113.51")));
        assert.equal(other.status, 200);
      });
    });
  });

  it("does not trust forwarded hops from a client on the published port", async () => {
    const { POST } = await import("./[...all]/route");
    await withHops("1", async () => {
      await runWithClientPeer("203.0.113.80", async () => {
        for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
          const response = await POST(signIn(rotating(i, `198.51.100.${i}`)));
          assert.equal(response.status, 200, `attempt ${i + 1} must not be limited`);
        }
        const blocked = await POST(signIn(rotating(9, "198.51.100.99")));
        assert.equal(blocked.status, 429);
      });
    });
  });

  it("refuses sign-in and logs when the peer was not captured", async () => {
    const { POST } = await import("./[...all]/route");
    const errors: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      await withHops(undefined, async () => {
        const response = await POST(signIn(rotating(1, "203.0.113.50")));
        assert.equal(response.status, 503);
      });
      await withHops("1", async () => {
        const response = await POST(signIn(rotating(1, "203.0.113.50")));
        assert.equal(response.status, 503);
      });
    } finally {
      console.error = original;
    }
    assert.ok(errors.length >= 2);
    assert.match(String(errors[0][0]), /no client peer/);
  });
});
