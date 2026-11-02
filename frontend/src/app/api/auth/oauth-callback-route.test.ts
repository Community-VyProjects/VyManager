import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { NextRequest } from "next/server";

const seen: string[] = [];

mock.module("@/lib/auth", {
  exports: {
    getAuth: async () => ({
      handler: async (request: Request) => {
        const url = new URL(request.url);
        seen.push(`${request.method} ${url.pathname}${url.search}`);
        return new Response("ok", { status: 200 });
      },
    }),
  },
});

describe("legacy OAuth callback route", () => {
  it("sends the published callback to the 1.7 handler", async () => {
    const route = await import("./[...all]/route.ts");
    seen.length = 0;
    const response = await route.GET(
      new NextRequest(
        "https://vymanager.example.com/api/auth/oauth2/callback/authelia?code=abc&state=xyz",
      ),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(seen, [
      "GET /api/auth/callback/authelia?code=abc&state=xyz",
    ]);
  });

  it("rewrites a form_post callback the same way", async () => {
    const route = await import("./[...all]/route.ts");
    seen.length = 0;
    const response = await route.POST(
      new NextRequest(
        "https://vymanager.example.com/api/auth/oauth2/callback/authelia",
        { method: "POST" },
      ),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(seen, ["POST /api/auth/callback/authelia"]);
  });
});
