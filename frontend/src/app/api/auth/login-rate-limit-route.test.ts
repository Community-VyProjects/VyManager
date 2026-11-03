import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { NextRequest } from "next/server";
import { LOGIN_RATE_LIMIT } from "@/lib/login-rate-limit";

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

describe("sign-in rate limit route", () => {
  it("counts the proxy-appended hop, not a rotating client prefix or x-real-ip", async () => {
    const { POST } = await import("./[...all]/route");
    const last = "203.0.113.50";
    for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
      const headers = new Headers({
        "x-forwarded-for": `${i}.${i}.${i}.${i}, ${last}`,
        "x-real-ip": `198.51.100.${i}`,
      });
      const response = await POST(signIn(headers));
      assert.equal(response.status, 200, `attempt ${i + 1} must not be limited`);
    }
    const blocked = await POST(
      signIn(
        new Headers({
          "x-forwarded-for": `9.9.9.9, ${last}`,
          "x-real-ip": "198.51.100.99",
        }),
      ),
    );
    assert.equal(blocked.status, 429);
    const other = await POST(
      signIn(
        new Headers({
          "x-forwarded-for": "1.1.1.1, 203.0.113.51",
          "x-real-ip": "198.51.100.1",
        }),
      ),
    );
    assert.equal(other.status, 200);
  });
});
