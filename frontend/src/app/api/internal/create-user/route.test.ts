import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { NextRequest } from "next/server";

// mock.module is only on the ESM test runner, not tsx's CJS loader:
// node --experimental-test-module-mocks --import tsx --test src/app/api/internal/create-user/route.test.ts

const SECRET = "internal-create-user-test-secret";

type StoredUser = { id: string; email: string; name: string };
type StoredAccount = {
  userId: string;
  providerId: string;
  accountId: string;
  password: string;
};

const users: StoredUser[] = [];
const accounts: StoredAccount[] = [];
let sessionCreates = 0;
let signUpCalls = 0;
let transactionCalls = 0;
let nextId = 0;

function resetStore(): void {
  users.length = 0;
  accounts.length = 0;
  sessionCreates = 0;
  signUpCalls = 0;
  transactionCalls = 0;
  nextId = 0;
}

mock.module("@/lib/auth", {
  exports: {
    getAuth: async () => ({
      api: {
        signUpEmail: async (input: {
          body: { email: string; password: string; name: string };
        }) => {
          signUpCalls += 1;
          const email = input.body.email.toLowerCase();
          if (users.some((row) => row.email === email)) {
            throw new Error("User already exists. Use another email.");
          }
          sessionCreates += 1;
          const user = {
            id: `signup-${++nextId}`,
            email,
            name: input.body.name,
          };
          users.push(user);
          accounts.push({
            userId: user.id,
            providerId: "credential",
            accountId: user.id,
            password: input.body.password,
          });
          return { token: "live-session", user };
        },
      },
      $context: Promise.resolve({
        adapter: {
          transaction: async <T>(fn: (trx: object) => Promise<T>): Promise<T> => {
            transactionCalls += 1;
            return fn({});
          },
        },
        password: {
          hash: async (password: string) => `hashed:${password}`,
          config: { minPasswordLength: 8, maxPasswordLength: 128 },
        },
        internalAdapter: {
          findUserByEmail: async (email: string) => {
            const user = users.find((row) => row.email === email.toLowerCase());
            return user ? { user, accounts: [] } : null;
          },
          createUser: async (user: { email: string; name: string }) => {
            const created = {
              id: `user-${++nextId}`,
              email: user.email.toLowerCase(),
              name: user.name,
            };
            users.push(created);
            return created;
          },
          linkAccount: async (account: StoredAccount) => {
            accounts.push(account);
            return account;
          },
          createSession: async () => {
            sessionCreates += 1;
            return { token: "should-not-exist" };
          },
          deleteUser: async () => undefined,
        },
      }),
    }),
  },
});

function post(body: unknown, secret: string | null = SECRET): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (secret !== null) headers.set("x-internal-auth", secret);
  return new NextRequest("https://vymanager.example/api/internal/create-user", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/internal/create-user", { concurrency: false }, () => {
  const previousSecret = process.env.INTERNAL_API_SECRET;

  before(() => {
    process.env.INTERNAL_API_SECRET = SECRET;
  });

  after(() => {
    if (previousSecret === undefined) delete process.env.INTERNAL_API_SECRET;
    else process.env.INTERNAL_API_SECRET = previousSecret;
  });

  it("creates a credential account without a session", async () => {
    resetStore();
    const { POST } = await import("./route");
    const response = await POST(
      post({
        email: "New.User@Example.com",
        password: "correct-horse",
        name: "New User",
      }),
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      success: boolean;
      token?: string;
      user: { id: string; email: string; name: string };
    };
    assert.equal(body.success, true);
    assert.equal(body.token, undefined);
    assert.equal(body.user.email, "new.user@example.com");
    assert.equal(body.user.name, "New User");
    assert.equal(response.headers.getSetCookie().length, 0);
    assert.equal(signUpCalls, 0);
    assert.equal(sessionCreates, 0);
    assert.equal(transactionCalls, 1);
    assert.equal(users.length, 1);
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].providerId, "credential");
    assert.equal(accounts[0].accountId, accounts[0].userId);
    assert.equal(accounts[0].password, "hashed:correct-horse");
    assert.notEqual(accounts[0].password, "correct-horse");
  });

  it("rejects a duplicate email without inserting a session", async () => {
    resetStore();
    const { POST } = await import("./route");
    const first = await POST(
      post({ email: "taken@example.com", password: "correct-horse", name: "Taken" }),
    );
    assert.equal(first.status, 200);
    const second = await POST(
      post({ email: "Taken@Example.com", password: "another-horse", name: "Taken" }),
    );
    assert.equal(second.status, 400);
    const body = (await second.json()) as { error: string };
    assert.equal(body.error, "Email already exists");
    assert.equal(users.length, 1);
    assert.equal(accounts.length, 1);
    assert.equal(signUpCalls, 0);
    assert.equal(sessionCreates, 0);
  });

  it("does not create a user when the internal secret is missing", async () => {
    resetStore();
    const { POST } = await import("./route");
    const response = await POST(
      post({ email: "new.user@example.com", password: "correct-horse", name: "New" }, null),
    );
    assert.equal(response.status, 401);
    assert.equal(users.length, 0);
    assert.equal(accounts.length, 0);
    assert.equal(signUpCalls, 0);
    assert.equal(sessionCreates, 0);
  });
});
