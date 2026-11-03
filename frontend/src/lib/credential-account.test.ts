import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCredentialAccount, type CredentialAccountDeps } from "./credential-account";

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
    runInTransaction: async (fn) => {
      const userSnapshot = users.slice();
      const accountSnapshot = accounts.slice();
      try {
        return await fn();
      } catch (error) {
        users.splice(0, users.length, ...userSnapshot);
        accounts.splice(0, accounts.length, ...accountSnapshot);
        throw error;
      }
    },
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

  it("rolls the user back when the credential account cannot be linked", async () => {
    const { deps, users, accounts } = harness({ failLink: true });
    await assert.rejects(
      () =>
        createCredentialAccount(
          { email: "new.user@example.com", password: "correct-horse", name: "New" },
          deps,
        ),
      /Failed to create user/,
    );
    assert.equal(users.length, 0);
    assert.equal(accounts.length, 0);
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

  it("lets a duplicate-key failure stay a duplicate so the caller can reject it", async () => {
    const { deps, users } = harness({
      failCreate: new Error("duplicate key value violates unique constraint"),
    });
    await assert.rejects(
      () =>
        createCredentialAccount(
          { email: "new.user@example.com", password: "correct-horse", name: "New" },
          deps,
        ),
      /duplicate/,
    );
    assert.equal(users.length, 0);
  });
});
