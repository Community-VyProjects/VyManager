import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthPrismaAdapter } from "./auth-database";

const SECRET = "test-secret-that-is-long-enough-for-better-auth";

describe("createAuthPrismaAdapter", () => {
  it("runs adapter transactions through prisma.$transaction", async () => {
    let calls = 0;
    const prisma = {
      $transaction: async (fn: (tx: object) => Promise<unknown>) => {
        calls += 1;
        return fn(prisma);
      },
    };
    const auth = betterAuth({
      database: createAuthPrismaAdapter(prisma),
      emailAndPassword: { enabled: true },
      secret: SECRET,
      baseURL: "http://localhost:3000",
    });
    const ctx = await auth.$context;
    await ctx.adapter.transaction(async () => undefined);
    assert.equal(calls, 1);

    let plainCalls = 0;
    const plain = {
      $transaction: async (fn: (tx: object) => Promise<unknown>) => {
        plainCalls += 1;
        return fn(plain);
      },
    };
    const disabled = betterAuth({
      database: prismaAdapter(plain as Parameters<typeof prismaAdapter>[0], {
        provider: "postgresql",
      }),
      emailAndPassword: { enabled: true },
      secret: SECRET,
      baseURL: "http://localhost:3000",
    });
    const disabledCtx = await disabled.$context;
    await disabledCtx.adapter.transaction(async () => undefined);
    assert.equal(plainCalls, 0);
  });
});
