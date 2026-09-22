"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Server } from "lucide-react";
import type { Instance, Site } from "@/lib/api/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SSHKeySetup } from "@/components/monitoring/SSHKeySetup";
import { ApiError } from "@/lib/types/api";
import { modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyInstanceDraft,
  instanceDraftFrom,
  submitInstanceCreate,
  submitInstanceUpdate,
  validateInstanceCreate,
  validateInstanceShared,
  type InstanceDraft,
} from "./sites-form";

interface InstanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: Instance | null;
  site?: Site | null;
  sites?: Site[];
}

export function InstanceModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
  site,
  sites = [],
}: InstanceModalProps) {
  const isEdit = modalIsEdit(existing);
  const [draft, setDraft] = useState<InstanceDraft>(emptyInstanceDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(instanceDraftFrom(existing));
    } else {
      setDraft(emptyInstanceDraft());
    }
    setError(null);
  }, [open, existing]);

  const patch = (fields: Partial<InstanceDraft>) => setDraft((d) => ({ ...d, ...fields }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const write = modalWriteKind(existing ? { name: existing.id } : null);
    const validationError =
      write.kind === "create"
        ? validateInstanceCreate(draft, site?.id)
        : validateInstanceShared(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (write.kind === "update" && existing) {
        await submitInstanceUpdate(existing, draft);
      } else if (site) {
        await submitInstanceCreate(draft, site.id);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const fallback = isEdit ? "Failed to update instance" : "Failed to create instance";
      const message =
        err instanceof Error
          ? err.message
          : (err as ApiError).message || fallback;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const canMoveSite = isEdit && sites.length > 1;
  const isAdmin =
    isEdit && sites.find((s) => s.id === existing.site_id)?.role === "ADMIN";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{isEdit ? "Edit Instance" : "Create New Instance"}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Update instance configuration"
                  : `Add a new VyOS instance${site ? ` to ${site.name}` : ""}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="connection">Connection</TabsTrigger>
              <TabsTrigger value="ssh">SSH / Monitoring</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="required">
                  Instance Name
                </Label>
                <Input
                  id="name"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="e.g., vyos-router-01"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Additional information..."
                  rows={2}
                  disabled={loading}
                />
              </div>

              {canMoveSite && existing && (
                <div className="space-y-2">
                  <Label htmlFor="siteId">Site</Label>
                  <Select
                    value={draft.siteId}
                    onValueChange={(value) => patch({ siteId: value })}
                    disabled={loading}
                  >
                    <SelectTrigger id="siteId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sites
                        .filter((s) => s.role === "ADMIN")
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {s.id === existing.site_id ? " (Current)" : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {draft.siteId !== existing.site_id && (
                    <p className="text-xs text-warning">
                      ⚠️ Moving to a different site
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="vyosVersion">VyOS Version</Label>
                <Select
                  value={draft.vyosVersion}
                  onValueChange={(value) => patch({ vyosVersion: value })}
                  disabled={loading}
                >
                  <SelectTrigger id="vyosVersion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.4">VyOS 1.4</SelectItem>
                    <SelectItem value="1.5">VyOS 1.5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={draft.isActive}
                  onCheckedChange={(checked) => patch({ isActive: checked as boolean })}
                  disabled={loading}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Instance is active
                </Label>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="commitConfirmEnabled"
                    checked={draft.commitConfirmEnabled}
                    onCheckedChange={(checked) =>
                      patch({ commitConfirmEnabled: checked as boolean })
                    }
                    disabled={loading || draft.vyosVersion === "1.4"}
                  />
                  <div>
                    <Label htmlFor="commitConfirmEnabled" className="cursor-pointer">
                      Enable Commit-Confirm
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {draft.vyosVersion === "1.4"
                        ? "Not supported on this version"
                        : "All changes will require confirmation or VyOS will auto-revert"}
                    </p>
                  </div>
                </div>
                {draft.commitConfirmEnabled && (
                  <div className="flex items-center gap-3 pl-6">
                    <Label htmlFor="commitConfirmMinutes" className="whitespace-nowrap text-sm">
                      Confirm window
                    </Label>
                    <Input
                      id="commitConfirmMinutes"
                      type="number"
                      min={1}
                      max={60}
                      value={draft.commitConfirmMinutes}
                      onChange={(e) => patch({ commitConfirmMinutes: e.target.value })}
                      disabled={loading}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="connection" className="space-y-4 mt-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="host" className="required">
                  Host
                </Label>
                <Input
                  id="host"
                  value={draft.host}
                  onChange={(e) => patch({ host: e.target.value })}
                  placeholder="192.168.1.1, 2001:db8::1, or vyos.example.com"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  IP address (IPv4 or IPv6) or hostname of the VyOS device
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">{isEdit ? "API Port" : "Port"}</Label>
                <Input
                  id="port"
                  type="number"
                  value={draft.port}
                  onChange={(e) => patch({ port: e.target.value })}
                  placeholder="443"
                  min="1"
                  max="65535"
                  disabled={loading}
                />
              </div>

              {isEdit ? (
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                  <p className="text-sm font-medium">Update API Credentials (Optional)</p>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing credentials
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="protocol">Protocol</Label>
                    <Select
                      value={draft.protocol}
                      onValueChange={(value) => patch({ protocol: value })}
                      disabled={loading}
                    >
                      <SelectTrigger id="protocol">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="https">HTTPS</SelectItem>
                        <SelectItem value="http">HTTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">New API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={draft.apiKey}
                      onChange={(e) => patch({ apiKey: e.target.value })}
                      placeholder="Leave blank to keep existing"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verifySsl"
                      checked={draft.verifySsl}
                      onCheckedChange={(checked) => patch({ verifySsl: checked as boolean })}
                      disabled={loading}
                    />
                    <Label htmlFor="verifySsl" className="cursor-pointer">
                      Verify SSL certificate
                    </Label>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="protocol">Protocol</Label>
                    <Select
                      value={draft.protocol}
                      onValueChange={(value) => patch({ protocol: value })}
                      disabled={loading}
                    >
                      <SelectTrigger id="protocol">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="https">HTTPS</SelectItem>
                        <SelectItem value="http">HTTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey" className="required">
                      API Key
                    </Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={draft.apiKey}
                      onChange={(e) => patch({ apiKey: e.target.value })}
                      placeholder="VyOS API key"
                      disabled={loading}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      API key from VyOS configuration
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verifySsl"
                      checked={draft.verifySsl}
                      onCheckedChange={(checked) => patch({ verifySsl: checked as boolean })}
                      disabled={loading}
                    />
                    <Label htmlFor="verifySsl" className="cursor-pointer">
                      Verify SSL certificate
                    </Label>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="timeout">API Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={draft.timeout}
                  onChange={(e) => patch({ timeout: e.target.value })}
                  placeholder="10"
                  min="1"
                  max="300"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Timeout for API requests to the VyOS device (1-300 seconds)
                </p>
              </div>
            </TabsContent>

            <TabsContent value="ssh" className="space-y-4 mt-4">
              <div className={isEdit ? "grid grid-cols-2 gap-4" : "space-y-4"}>
                <div className="space-y-2">
                  <Label htmlFor="sshUsername">SSH Username</Label>
                  <Input
                    id="sshUsername"
                    value={draft.sshUsername}
                    onChange={(e) => patch({ sshUsername: e.target.value })}
                    placeholder="vyos"
                    disabled={loading}
                  />
                  {!isEdit && (
                    <p className="text-xs text-muted-foreground">
                      SSH username for monitoring connections (defaults to &quot;vyos&quot;)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sshPort">SSH Port</Label>
                  <Input
                    id="sshPort"
                    type="number"
                    value={draft.sshPort}
                    onChange={(e) => patch({ sshPort: e.target.value })}
                    placeholder="22"
                    min="1"
                    max="65535"
                    disabled={loading}
                  />
                </div>
              </div>

              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  SSH settings are used for real-time monitoring features. You can
                  configure SSH keys after creating the instance.
                </p>
              )}

              {isEdit && existing && (
                isAdmin ? (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-1">SSH Key</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Generate an SSH keypair. This device installs the public key over the API.
                    </p>
                    <SSHKeySetup
                      instanceId={existing.id}
                      sshUsername={draft.sshUsername || existing.ssh_username}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/50 p-3 border-t mt-2">
                    <p className="text-sm text-muted-foreground">
                      SSH key management requires site Admin access.
                    </p>
                  </div>
                )
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEdit ? "Saving..." : "Creating..."}
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Instance"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
