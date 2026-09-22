import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  UserManagementService,
  SiteRole,
  type CreateUserRequest,
  type UpdateUserRequest,
  type UserDetail,
  type UserListItem,
} from "@/lib/api/user-management";
import {
  emptyUserDraft,
  submitUserCreate,
  submitUserUpdate,
  userDraftFrom,
  validateUserCreate,
  validateUserShared,
} from "./user-form";

class RecordingUserService extends UserManagementService {
  created: CreateUserRequest[] = [];
  updated: { id: string; data: UpdateUserRequest }[] = [];

  async createUser(data: CreateUserRequest): Promise<UserDetail> {
    this.created.push(data);
    return storedDetail;
  }

  async updateUser(userId: string, data: UpdateUserRequest): Promise<UserDetail> {
    this.updated.push({ id: userId, data });
    return storedDetail;
  }
}

const storedUser: UserListItem = {
  id: "user-1",
  name: "Jane Doe",
  email: "jane@example.com",
  email_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  site_role: SiteRole.VIEWER,
  instance_count: 1,
};

const storedDetail: UserDetail = {
  id: storedUser.id,
  name: storedUser.name,
  email: storedUser.email,
  email_verified: storedUser.email_verified,
  created_at: storedUser.created_at,
  updated_at: storedUser.created_at,
};

describe("user create", () => {
  it("rejects a missing password on create only", () => {
    const draft = emptyUserDraft();
    draft.email = "jane@example.com";
    assert.equal(validateUserCreate(draft), "Password must be at least 8 characters");
    assert.equal(validateUserShared(draft), null);
  });

  it("emits only the fields the operator filled in", async () => {
    const service = new RecordingUserService();
    const draft = emptyUserDraft();
    draft.name = "Jane Doe";
    draft.email = "jane@example.com";
    draft.password = "secret123";
    draft.confirmPassword = "secret123";
    draft.siteRole = SiteRole.ADMIN;
    await submitUserCreate(draft, service);
    assert.equal(service.created.length, 1);
    assert.deepEqual(service.created[0], {
      name: "Jane Doe",
      email: "jane@example.com",
      password: "secret123",
      site_role: SiteRole.ADMIN,
    });
  });
});

describe("user update", () => {
  it("sends nothing when the operator changed nothing", async () => {
    const service = new RecordingUserService();
    const result = await submitUserUpdate(storedUser, userDraftFrom(storedUser), service);
    assert.equal(result, null);
    assert.equal(service.updated.length, 0);
  });

  it("deletes a cleared name", async () => {
    const service = new RecordingUserService();
    const draft = userDraftFrom(storedUser);
    draft.name = "";
    await submitUserUpdate(storedUser, draft, service);
    assert.equal(service.updated.length, 1);
    assert.deepEqual(service.updated[0].data, { name: null });
  });

  it("does not emit a delete for an already-empty name", async () => {
    const service = new RecordingUserService();
    const current = { ...storedUser, name: null };
    const result = await submitUserUpdate(current, userDraftFrom(current), service);
    assert.equal(result, null);
    assert.equal(service.updated.length, 0);
  });

  it("omits a blank password so the stored secret is not resent", async () => {
    const service = new RecordingUserService();
    const draft = userDraftFrom(storedUser);
    draft.name = "changed";
    await submitUserUpdate(storedUser, draft, service);
    assert.equal(service.updated.length, 1);
    assert.equal("password" in service.updated[0].data, false);
    assert.deepEqual(service.updated[0].data, { name: "changed" });
  });

  it("sends a new password when the operator filled one in", async () => {
    const service = new RecordingUserService();
    const draft = userDraftFrom(storedUser);
    draft.password = "newsecret";
    draft.confirmPassword = "newsecret";
    await submitUserUpdate(storedUser, draft, service);
    assert.deepEqual(service.updated[0].data, { password: "newsecret" });
  });

  it("writes the stored id when the draft name was altered", async () => {
    const service = new RecordingUserService();
    const draft = userDraftFrom(storedUser);
    draft.name = "tampered";
    await submitUserUpdate(storedUser, draft, service);
    assert.equal(service.updated.length, 1);
    assert.equal(service.updated[0].id, storedUser.id);
    assert.deepEqual(service.updated[0].data, { name: "tampered" });
  });
});
