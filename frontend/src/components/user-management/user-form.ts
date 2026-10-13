/**
 * Draft, validation and submit logic for the unified user modal.
 *
 * Create sends the fields the operator filled in. Update diffs the draft
 * against the stored record so an unchanged record sends nothing, a cleared
 * optional name is sent as null, and an already-empty one is omitted. The
 * write target is the stored id, never a draft identity field. Name is a
 * mutable label, not identity. A blank password on edit is omitted so the
 * stored secret is never resent.
 */

import {
  userManagementService,
  UserManagementService,
  SiteRole,
  type CreateUserRequest,
  type UpdateUserRequest,
  type UserDetail,
  type UserListItem,
} from "@/lib/api/user-management";

const emptyToNull = (value: string): string | null => value.trim() || null;

const storedText = (value: string | null | undefined): string => value ?? "";

export interface UserDraft {
  name: string;
  email: string;
  siteRole: SiteRole;
  password: string;
  confirmPassword: string;
}

export const emptyUserDraft = (): UserDraft => ({
  name: "",
  email: "",
  siteRole: SiteRole.VIEWER,
  password: "",
  confirmPassword: "",
});

export function userDraftFrom(user: UserListItem): UserDraft {
  return {
    name: storedText(user.name),
    email: user.email,
    siteRole: user.site_role,
    password: "",
    confirmPassword: "",
  };
}

/** Message keys (namespace `userManagement`) returned by the validators. */
export type UserFormError =
  | "form.emailRequired"
  | "form.passwordTooShort"
  | "form.passwordMismatch";

export function validateUserShared(draft: UserDraft): UserFormError | null {
  if (!draft.email.trim()) return "form.emailRequired";
  if (draft.password) {
    if (draft.password.length < 8) return "form.passwordTooShort";
    if (draft.password !== draft.confirmPassword) return "form.passwordMismatch";
  }
  return null;
}

export function validateUserCreate(draft: UserDraft): UserFormError | null {
  const shared = validateUserShared(draft);
  if (shared) return shared;
  if (!draft.password || draft.password.length < 8) {
    return "form.passwordTooShort";
  }
  if (draft.password !== draft.confirmPassword) return "form.passwordMismatch";
  return null;
}

/** Display-label message key for a site/instance role value (the value itself is never translated). */
export type RoleValueKey = "roleValues.ADMIN" | "roleValues.OPERATOR" | "roleValues.VIEWER";

const ROLE_VALUE_KEYS: Record<string, RoleValueKey> = {
  ADMIN: "roleValues.ADMIN",
  OPERATOR: "roleValues.OPERATOR",
  VIEWER: "roleValues.VIEWER",
};

export function roleValueKey(role: string): RoleValueKey | null {
  return ROLE_VALUE_KEYS[role] ?? null;
}

export function buildUserCreate(draft: UserDraft): CreateUserRequest {
  return {
    name: emptyToNull(draft.name),
    email: draft.email.trim(),
    password: draft.password,
    site_role: draft.siteRole,
  };
}

export function buildUserUpdate(
  existing: UserListItem,
  draft: UserDraft,
): UpdateUserRequest | null {
  const data: UpdateUserRequest = {};

  const nextName = emptyToNull(draft.name);
  const previousName = emptyToNull(storedText(existing.name));
  if (nextName !== previousName) data.name = nextName;

  const email = draft.email.trim();
  if (email !== existing.email) data.email = email;

  if (draft.siteRole !== existing.site_role) data.site_role = draft.siteRole;

  if (draft.password) data.password = draft.password;

  return Object.keys(data).length === 0 ? null : data;
}

export async function submitUserCreate(
  draft: UserDraft,
  service: UserManagementService = userManagementService,
): Promise<UserDetail> {
  return service.createUser(buildUserCreate(draft));
}

export async function submitUserUpdate(
  existing: UserListItem,
  draft: UserDraft,
  service: UserManagementService = userManagementService,
): Promise<UserDetail | null> {
  const data = buildUserUpdate(existing, draft);
  if (!data) return null;
  return service.updateUser(existing.id, data);
}
