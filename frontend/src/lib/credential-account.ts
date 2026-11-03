import * as z from "zod";

/**
 * Admin provisioning of an email/password account.
 *
 * Public sign-up keeps autoSignIn so the first user gets a session.
 * This path must not. It writes the user and the credential account
 * and never creates a session. If the credential link fails, the user
 * row is deleted. The Prisma adapter does not roll a transaction back
 * unless it was built with transactions on, and a leftover user makes
 * the next create look like a duplicate.
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

function existingAccount(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return message.includes("already exists") || message.includes("duplicate");
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
        throw new Error("Failed to create user", { cause: cleanupError });
      }
    }
    if (existingAccount(error)) throw error;
    throw new Error("Failed to create user", { cause: error });
  }
}
