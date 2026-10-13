import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SessionService,
  type Instance,
  type InstanceCreateRequest,
  type InstanceUpdateRequest,
  type Site,
  type SiteCreateRequest,
  type SiteUpdateRequest,
} from "@/lib/api/session";
import {
  buildInstanceCreate,
  emptyInstanceDraft,
  emptySiteDraft,
  instanceDraftFrom,
  siteDraftFrom,
  submitInstanceCreate,
  submitInstanceUpdate,
  submitSiteCreate,
  submitSiteUpdate,
  validateInstanceCreate,
  validateInstanceShared,
  validateSiteDraft,
} from "./sites-form";

class RecordingSessionService extends SessionService {
  createdSites: SiteCreateRequest[] = [];
  updatedSites: { id: string; data: SiteUpdateRequest }[] = [];
  createdInstances: InstanceCreateRequest[] = [];
  updatedInstances: { id: string; data: InstanceUpdateRequest }[] = [];

  async createSite(data: SiteCreateRequest): Promise<Site> {
    this.createdSites.push(data);
    return storedSite;
  }

  async updateSite(siteId: string, data: SiteUpdateRequest): Promise<Site> {
    this.updatedSites.push({ id: siteId, data });
    return storedSite;
  }

  async createInstance(data: InstanceCreateRequest): Promise<Instance> {
    this.createdInstances.push(data);
    return storedInstance;
  }

  async updateInstance(instanceId: string, data: InstanceUpdateRequest): Promise<Instance> {
    this.updatedInstances.push({ id: instanceId, data });
    return storedInstance;
  }
}

const storedSite: Site = {
  id: "site-1",
  name: "HQ",
  description: "main office",
  role: "ADMIN",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const storedInstance: Instance = {
  id: "inst-1",
  site_id: "site-1",
  name: "edge-1",
  description: "border",
  host: "192.0.2.1",
  port: 443,
  protocol: "https",
  verify_ssl: false,
  vyos_version: "1.5",
  is_active: true,
  ssh_port: 22,
  ssh_username: "vyos",
  ssh_key_configured: true,
  commit_confirm_enabled: false,
  commit_confirm_minutes: 5,
  timeout: 10,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("site create", () => {
  it("rejects a missing name", () => {
    assert.equal(validateSiteDraft(emptySiteDraft()), "siteNameRequired");
  });

  it("emits only the fields the operator filled in", async () => {
    const service = new RecordingSessionService();
    const draft = emptySiteDraft();
    draft.name = "HQ";
    draft.description = "main office";
    await submitSiteCreate(draft, service);
    assert.equal(service.createdSites.length, 1);
    assert.deepEqual(service.createdSites[0], {
      name: "HQ",
      description: "main office",
    });
  });
});

describe("site update", () => {
  it("sends nothing when the operator changed nothing", async () => {
    const service = new RecordingSessionService();
    const result = await submitSiteUpdate(storedSite, siteDraftFrom(storedSite), service);
    assert.equal(result, null);
    assert.equal(service.updatedSites.length, 0);
  });

  it("deletes a cleared description", async () => {
    const service = new RecordingSessionService();
    const draft = siteDraftFrom(storedSite);
    draft.description = "";
    await submitSiteUpdate(storedSite, draft, service);
    assert.equal(service.updatedSites.length, 1);
    assert.deepEqual(service.updatedSites[0].data, { description: null });
  });

  it("does not emit a delete for an already-empty description", async () => {
    const service = new RecordingSessionService();
    const current = { ...storedSite, description: null };
    const result = await submitSiteUpdate(current, siteDraftFrom(current), service);
    assert.equal(result, null);
    assert.equal(service.updatedSites.length, 0);
  });

  it("writes the stored id when the draft name was altered", async () => {
    const service = new RecordingSessionService();
    const draft = siteDraftFrom(storedSite);
    draft.name = "tampered";
    await submitSiteUpdate(storedSite, draft, service);
    assert.equal(service.updatedSites.length, 1);
    assert.equal(service.updatedSites[0].id, storedSite.id);
    assert.deepEqual(service.updatedSites[0].data, { name: "tampered" });
  });
});

describe("instance create", () => {
  it("rejects a missing API key on create only", () => {
    const draft = emptyInstanceDraft();
    draft.name = "edge-1";
    draft.host = "192.0.2.1";
    assert.equal(validateInstanceCreate(draft, "site-1"), "apiKeyRequired");
    assert.equal(validateInstanceShared(draft), null);
  });

  it("emits only the fields the operator filled in", async () => {
    const service = new RecordingSessionService();
    const draft = emptyInstanceDraft();
    draft.name = "edge-1";
    draft.host = "192.0.2.1";
    draft.apiKey = "secret";
    await submitInstanceCreate(draft, "site-1", service);
    assert.equal(service.createdInstances.length, 1);
    assert.deepEqual(service.createdInstances[0], {
      site_id: "site-1",
      name: "edge-1",
      description: null,
      host: "192.0.2.1",
      port: 443,
      api_key: "secret",
      vyos_version: "1.5",
      protocol: "https",
      verify_ssl: false,
      is_active: true,
      ssh_port: 22,
      ssh_username: undefined,
      commit_confirm_enabled: false,
      commit_confirm_minutes: 5,
      timeout: 10,
    });
  });

  it("does not emit site move on create", () => {
    const draft = emptyInstanceDraft();
    draft.name = "edge-1";
    draft.host = "192.0.2.1";
    draft.apiKey = "secret";
    draft.siteId = "other-site";
    const created = buildInstanceCreate(draft, "site-1");
    assert.equal(created.site_id, "site-1");
    assert.equal("site_id" in created && created.site_id === "other-site", false);
  });
});

describe("instance update", () => {
  it("sends nothing when the operator changed nothing", async () => {
    const service = new RecordingSessionService();
    const result = await submitInstanceUpdate(
      storedInstance,
      instanceDraftFrom(storedInstance),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.updatedInstances.length, 0);
  });

  it("deletes a cleared description", async () => {
    const service = new RecordingSessionService();
    const draft = instanceDraftFrom(storedInstance);
    draft.description = "";
    await submitInstanceUpdate(storedInstance, draft, service);
    assert.equal(service.updatedInstances.length, 1);
    assert.deepEqual(service.updatedInstances[0].data, { description: null });
  });

  it("does not emit a delete for an already-empty description", async () => {
    const service = new RecordingSessionService();
    const current = { ...storedInstance, description: null };
    const result = await submitInstanceUpdate(current, instanceDraftFrom(current), service);
    assert.equal(result, null);
    assert.equal(service.updatedInstances.length, 0);
  });

  it("omits a blank API key so the stored secret is not resent", async () => {
    const service = new RecordingSessionService();
    const draft = instanceDraftFrom(storedInstance);
    draft.description = "changed";
    await submitInstanceUpdate(storedInstance, draft, service);
    assert.equal(service.updatedInstances.length, 1);
    assert.equal("api_key" in service.updatedInstances[0].data, false);
    assert.deepEqual(service.updatedInstances[0].data, { description: "changed" });
  });

  it("sends a new API key when the operator filled one in", async () => {
    const service = new RecordingSessionService();
    const draft = instanceDraftFrom(storedInstance);
    draft.apiKey = "new-secret";
    await submitInstanceUpdate(storedInstance, draft, service);
    assert.deepEqual(service.updatedInstances[0].data, { api_key: "new-secret" });
  });

  it("writes the stored id when the draft name was altered", async () => {
    const service = new RecordingSessionService();
    const draft = instanceDraftFrom(storedInstance);
    draft.name = "tampered";
    await submitInstanceUpdate(storedInstance, draft, service);
    assert.equal(service.updatedInstances[0].id, storedInstance.id);
    assert.deepEqual(service.updatedInstances[0].data, { name: "tampered" });
  });

  it("deletes a cleared SSH username", async () => {
    const service = new RecordingSessionService();
    const draft = instanceDraftFrom(storedInstance);
    draft.sshUsername = "";
    await submitInstanceUpdate(storedInstance, draft, service);
    assert.deepEqual(service.updatedInstances[0].data, { ssh_username: null });
  });
});
