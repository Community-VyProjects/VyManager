import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const SECRET = "test-secret-that-is-long-enough-for-better-auth";

describe("auth database adapter", () => {
  it("does not enable interactive transactions for every auth flow", async () => {
    const source = readFileSync(new URL("./auth.ts", import.meta.url), "utf8");
    assert.equal(source.includes("transaction: true"), false);

    let calls = 0;
    const prisma = {
      $transaction: async (fn: (tx: object) => Promise<unknown>) => {
        calls += 1;
        return fn(prisma);
      },
    };
    const auth = betterAuth({
      database: prismaAdapter(prisma as Parameters<typeof prismaAdapter>[0], {
        provider: "postgresql",
      }),
      emailAndPassword: { enabled: true },
      secret: SECRET,
      baseURL: "http://localhost:3000",
    });
    const ctx = await auth.$context;
    await ctx.adapter.transaction(async () => undefined);
    assert.equal(calls, 0);
  });
});
