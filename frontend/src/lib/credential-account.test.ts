import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCredentialAccount, runCredentialTransaction, type CredentialAccountDeps } from "./credential-account";
import { queueAfterTransactionHook } from "@better-auth/core/context";

type User = { id: string; email: string; name: string; emailVerified: boolean };
type Account = {
  userId: string;
  providerId: string;
  accountId: string;
  password: string;
};

function harness(opts?: { failLink?: boolean; failCreate?: Error }): {
  deps: CredentialAccountDeps;
  users: User[];
  accounts: Account[];
} {
  const users: User[] = [];
  const accounts: Account[] = [];
  let id = 0;
  const deps: CredentialAccountDeps = {
    findUserByEmail: async (email) => {
      const user = users.find((row) => row.email === email.toLowerCase());
      return user ? { user } : null;
    },
    createUser: async (user) => {
      if (opts?.failCreate) throw opts.failCreate;
      const created: User = {
        id: `u${++id}`,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      };
      users.push(created);
      return created;
    },
    linkAccount: async (account) => {
      if (opts?.failLink) throw new Error("link failed");
      accounts.push(account);
      return account;
    },
    hashPassword: async (password) => `hashed:${password}`,
    deleteUser: async (userId) => {
      const index = users.findIndex((row) => row.id === userId);
      if (index >= 0) users.splice(index, 1);
      for (let i = accounts.length - 1; i >= 0; i -= 1) {
        if (accounts[i].userId === userId) accounts.splice(i, 1);
      }
    },
    runInTransaction: async (fn) => fn(),
    minPasswordLength: 8,
    maxPasswordLength: 128,
  };
  return { deps, users, accounts };
}

describe("createCredentialAccount", () => {
  it("stores a hashed credential account", async () => {
    const { deps, users, accounts } = harness();
    const user = await createCredentialAccount(
      { email: "New.User@Example.com", password: "correct-horse", name: "New User" },
      deps,
    );
    assert.equal(user.email, "new.user@example.com");
    assert.equal(user.name, "New User");
    assert.equal(users.length, 1);
    assert.equal(users[0].emailVerified, false);
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].providerId, "credential");
    assert.equal(accounts[0].userId, user.id);
    assert.equal(accounts[0].accountId, user.id);
    assert.equal(accounts[0].password, "hashed:correct-horse");
    assert.notEqual(accounts[0].password, "correct-horse");
  });

  it("does not create a second user when the email already exists", async () => {
    const { deps, users, accounts } = harness();
    await createCredentialAccount(
      { email: "taken@example.com", password: "correct-horse", name: "Taken" },
      deps,
    );
    await assert.rejects(
      () =>
        createCredentialAccount(
          { email: "Taken@Example.com", password: "another-horse", name: "Taken" },
          deps,
        ),
      /already exists/,
    );
    assert.equal(users.length, 1);
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].password, "hashed:correct-horse");
  });

  it("deletes the user when the credential link fails and the adapter does not roll back", async () => {
    const { deps, users, accounts } = harness({ failLink: true });
    let deleted = 0;
    const remove = deps.deleteUser;
    deps.deleteUser = async (userId) => {
      deleted += 1;
      return remove(userId);
    };
    await assert.rejects(
      () =>
        createCredentialAccount(
          { email: "new.user@example.com", password: "correct-horse", name: "New" },
          deps,
        ),
      /Failed to create user/,
    );
    assert.equal(deleted, 1);
    assert.equal(users.length, 0);
    assert.equal(accounts.length, 0);
  });

  it("keeps the original link failure when the user cannot be deleted", async () => {
    const { deps, users } = harness({ failLink: true });
    deps.deleteUser = async () => {
      throw new Error("delete failed");
    };
    const errors: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      await assert.rejects(
        () =>
          createCredentialAccount(
            { email: "new.user@example.com", password: "correct-horse", name: "New" },
            deps,
          ),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.equal(error.message, "Failed to create user");
          assert.ok(error.cause instanceof Error);
          assert.equal(error.cause.message, "link failed");
          return true;
        },
      );
    } finally {
      console.error = original;
    }
    assert.equal(users.length, 1);
    assert.equal(errors.length, 1);
    assert.match(String(errors[0][0]), /Failed to delete the user/);
  });

  it("reports a committed create as success when an after-commit hook throws", async () => {
    const errors: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      const adapter = {
        transaction: async <T>(cb: (trx: object) => Promise<T>) => cb({}),
        options: { adapterConfig: { transaction: false } },
      };
      const result = await runCredentialTransaction(adapter, async () => {
        await queueAfterTransactionHook(async () => {
          throw new Error("hook failed");
        });
        return { id: "u1" };
      });
      assert.deepEqual(result, { id: "u1" });
    } finally {
      console.error = original;
    }
    assert.equal(errors.length, 1);
    assert.match(String(errors[0][0]), /after-commit hook failed/);
  });

  it("does not hash or write when the password is too long", async () => {
    const { deps, users, accounts } = harness();
    let hashed = 0;
    deps.hashPassword = async (password) => {
      hashed += 1;
      return `hashed:${password}`;
    };
    await assert.rejects(
      () =>
        createCredentialAccount(
          { email: "new.user@example.com", password: "x".repeat(129), name: "New" },
          deps,
        ),
      /Password too long/,
    );
    assert.equal(hashed, 0);
    assert.equal(users.length, 0);
    assert.equal(accounts.length, 0);
  });

  it("rejects an email sign-up would reject before writing", async () => {
    const { deps, users, accounts } = harness();
    await assert.rejects(
      () =>
        createCredentialAccount(
          { email: "not-an-email", password: "correct-horse", name: "New" },
          deps,
        ),
      /Invalid email/,
    );
    assert.equal(users.length, 0);
    assert.equal(accounts.length, 0);
  });

  it("treats a Prisma unique constraint as an existing email", async () => {
    const prismaUnique = new Error(
      "Unique constraint failed on the fields: (`email`)",
    );
    const { deps, users, accounts } = harness({ failCreate: prismaUnique });
    await assert.rejects(
      () =>
        createCredentialAccount(
          { email: "new.user@example.com", password: "correct-horse", name: "New" },
          deps,
        ),
      /already exists/,
    );
    assert.equal(users.length, 0);
    assert.equal(accounts.length, 0);

    const coded = new Error("Invalid prisma.user.create() invocation");
    (coded as Error & { code: string }).code = "P2002";
    const second = harness({ failCreate: coded });
    await assert.rejects(
      () =>
        createCredentialAccount(
          { email: "other.user@example.com", password: "correct-horse", name: "Other" },
          second.deps,
        ),
      /already exists/,
    );
    assert.equal(second.users.length, 0);
  });
});
