import * as z from "zod";
import { runWithTransaction } from "@better-auth/core/context";

/**
 * Admin provisioning of an email/password account.
 *
 * Public sign-up keeps autoSignIn so the first user gets a session.
 * This path must not. It writes the user and the credential account
 * inside one callback and never creates a session. The auth adapter
 * does not roll that callback back. If the credential link fails, this
 * deletes the user it just created. It does not delete after the
 * callback returns: an after-commit hook can still throw, and that
 * user is already saved.
 */
export type CreatedCredentialUser = {
  id: string;
  email: string;
  name: string;
};

export type CredentialAccountDeps = {
  findUserByEmail: (
    email: string,
  ) => Promise<{ user?: { id: string } | null } | null>;
  createUser: (
    user: { email: string; name: string; emailVerified: boolean },
    source: { method: "email-password" },
  ) => Promise<{ id: string; email: string; name: string } | null | undefined>;
  linkAccount: (account: {
    userId: string;
    providerId: "credential";
    accountId: string;
    password: string;
  }) => Promise<unknown>;
  hashPassword: (password: string) => Promise<string>;
  deleteUser: (userId: string) => Promise<unknown>;
  runInTransaction: <T>(fn: () => Promise<T>) => Promise<T>;
  minPasswordLength: number;
  maxPasswordLength: number;
};

/**
 * Run the credential writes in the auth transaction.
 *
 * An after-commit hook must not fail the create. The user and credential
 * are already saved, and the backend still has to set the site role.
 * A 500 here would leave a hidden VIEWER and make the retry a duplicate.
 */
export async function runCredentialTransaction<T>(
  adapter: Parameters<typeof runWithTransaction>[0],
  fn: () => Promise<T>,
): Promise<T> {
  return runWithTransaction(adapter, fn, {
    onAfterCommitHookError(error) {
      console.error(
        "Admin credential create committed, but an after-commit hook failed",
        error,
      );
    },
  });
}

function uniqueConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && error.code === "P2002") return true;
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("already exists") ||
    message.includes("duplicate") ||
    message.includes("Unique constraint failed")
  );
}

export async function createCredentialAccount(
  input: { email: string; password: string; name: string },
  deps: CredentialAccountDeps,
): Promise<CreatedCredentialUser> {
  if (!z.email().safeParse(input.email).success) {
    throw new Error("Invalid email");
  }
  if (input.password.length < deps.minPasswordLength) {
    throw new Error("Password too short");
  }
  if (input.password.length > deps.maxPasswordLength) {
    throw new Error("Password too long");
  }

  const email = input.email.toLowerCase();
  const prior = await deps.findUserByEmail(email);
  if (prior?.user) {
    throw new Error("User already exists. Use another email.");
  }
  const hash = await deps.hashPassword(input.password);
  let createdId: string | undefined;
  try {
    return await deps.runInTransaction(async () => {
      const existing = await deps.findUserByEmail(email);
      if (existing?.user) {
        throw new Error("User already exists. Use another email.");
      }
      const created = await deps.createUser(
        { email, name: input.name, emailVerified: false },
        { method: "email-password" },
      );
      if (!created?.id) {
        throw new Error("Failed to create user");
      }
      createdId = created.id;
      await deps.linkAccount({
        userId: created.id,
        providerId: "credential",
        accountId: created.id,
        password: hash,
      });
      return {
        id: created.id,
        email: created.email,
        name: created.name,
      };
    });
  } catch (error) {
    if (createdId) {
      try {
        await deps.deleteUser(createdId);
      } catch (cleanupError) {
        console.error(
          "Failed to delete the user after a failed credential link",
          cleanupError,
        );
        throw new Error("Failed to create user", { cause: error });
      }
    }
    if (uniqueConflict(error)) {
      throw new Error("User already exists. Use another email.", { cause: error });
    }
    if (error instanceof Error && error.message === "Failed to create user") {
      throw error;
    }
    throw new Error("Failed to create user", { cause: error });
  }
}
