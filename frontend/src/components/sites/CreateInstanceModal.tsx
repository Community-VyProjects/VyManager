"use client";

import { useState } from "react";
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
import { sessionService, Site } from "@/lib/api/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/types/api";

interface CreateInstanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  site: Site | null;
}

export function CreateInstanceModal({
  open,
  onOpenChange,
  onSuccess,
  site,
}: CreateInstanceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("443");
  const [apiKey, setApiKey] = useState("");
  const [vyosVersion, setVyosVersion] = useState("1.5");
  const [protocol, setProtocol] = useState("https");
  const [verifySsl, setVerifySsl] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sshPort, setSshPort] = useState("22");
  const [sshUsername, setSshUsername] = useState("");
  const [commitConfirmEnabled, setCommitConfirmEnabled] = useState(false);
  const [commitConfirmMinutes, setCommitConfirmMinutes] = useState("5");
  const [timeout, setTimeout] = useState("10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setName("");
    setDescription("");
    setHost("");
    setPort("443");
    setApiKey("");
    setVyosVersion("1.5");
    setProtocol("https");
    setVerifySsl(false);
    setIsActive(true);
    setSshPort("22");
    setSshUsername("");
    setCommitConfirmEnabled(false);
    setCommitConfirmMinutes("5");
    setTimeout("10");
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!site) return;

    // Validation
    if (!name.trim()) {
      setError("Instance name is required");
      return;
    }
    if (!host.trim()) {
      setError("Host is required");
      return;
    }
    if (!apiKey.trim()) {
      setError("API Key is required");
      return;
    }

    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError("Port must be between 1 and 65535");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sshPortNum = parseInt(sshPort);

      await sessionService.createInstance({
        site_id: site.id,
        name: name.trim(),
        description: description.trim() || null,
        host: host.trim(),
        port: portNum,
        api_key: apiKey.trim(),
        vyos_version: vyosVersion,
        protocol,
        verify_ssl: verifySsl,
        is_active: isActive,
        ssh_port: isNaN(sshPortNum) ? 22 : sshPortNum,
        ssh_username: sshUsername.trim() || undefined,
        commit_confirm_enabled: commitConfirmEnabled,
        commit_confirm_minutes: parseInt(commitConfirmMinutes) || 5,
        timeout: parseInt(timeout) || 10,
      });

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to create instance");
    } finally {
      setLoading(false);
    }
  };

  if (!site) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Create New Instance</DialogTitle>
              <DialogDescription>
                Add a new VyOS instance to {site.name}
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
              {/* Error Display */}
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              {/* Instance Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="required">
                  Instance Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., vyos-router-01"
                  disabled={loading}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional information..."
                  rows={2}
                  disabled={loading}
                />
              </div>

              {/* VyOS Version */}
              <div className="space-y-2">
                <Label htmlFor="vyosVersion">VyOS Version</Label>
                <Select
                  value={vyosVersion}
                  onValueChange={setVyosVersion}
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

              {/* Active Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Instance is active
                </Label>
              </div>

              {/* Commit-Confirm */}
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="commitConfirmEnabled"
                    checked={commitConfirmEnabled}
                    onCheckedChange={(checked) => setCommitConfirmEnabled(checked as boolean)}
                    disabled={loading || vyosVersion === "1.4"}
                  />
                  <div>
                    <Label htmlFor="commitConfirmEnabled" className="cursor-pointer">
                      Enable Commit-Confirm
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {vyosVersion === "1.4"
                        ? "Not supported on VyOS 1.4"
                        : "All changes will require confirmation or VyOS will auto-revert"}
                    </p>
                  </div>
                </div>
                {commitConfirmEnabled && (
                  <div className="flex items-center gap-3 pl-6">
                    <Label htmlFor="commitConfirmMinutes" className="whitespace-nowrap text-sm">
                      Confirm window
                    </Label>
                    <Input
                      id="commitConfirmMinutes"
                      type="number"
                      min={1}
                      max={60}
                      value={commitConfirmMinutes}
                      onChange={(e) => setCommitConfirmMinutes(e.target.value)}
                      disabled={loading}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="connection" className="space-y-4 mt-4">
              {/* Error Display */}
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              {/* Host */}
              <div className="space-y-2">
                <Label htmlFor="host" className="required">
                  Host
                </Label>
                <Input
                  id="host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.1.1 or vyos.example.com"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  IP address or hostname of the VyOS device
                </p>
              </div>

              {/* Port */}
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="443"
                  min="1"
                  max="65535"
                  disabled={loading}
                />
              </div>

              {/* Protocol */}
              <div className="space-y-2">
                <Label htmlFor="protocol">Protocol</Label>
                <Select
                  value={protocol}
                  onValueChange={setProtocol}
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

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="required">
                  API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="VyOS API key"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  API key from VyOS configuration
                </p>
              </div>

              {/* Verify SSL */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verifySsl"
                  checked={verifySsl}
                  onCheckedChange={(checked) => setVerifySsl(checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="verifySsl" className="cursor-pointer">
                  Verify SSL certificate
                </Label>
              </div>

              {/* Timeout */}
              <div className="space-y-2">
                <Label htmlFor="timeout">API Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(e.target.value)}
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
              {/* SSH Username */}
              <div className="space-y-2">
                <Label htmlFor="sshUsername">SSH Username</Label>
                <Input
                  id="sshUsername"
                  value={sshUsername}
                  onChange={(e) => setSshUsername(e.target.value)}
                  placeholder="vyos"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  SSH username for monitoring connections (defaults to &quot;vyos&quot;)
                </p>
              </div>

              {/* SSH Port */}
              <div className="space-y-2">
                <Label htmlFor="sshPort">SSH Port</Label>
                <Input
                  id="sshPort"
                  type="number"
                  value={sshPort}
                  onChange={(e) => setSshPort(e.target.value)}
                  placeholder="22"
                  min="1"
                  max="65535"
                  disabled={loading}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                SSH settings are used for real-time monitoring features. You can
                configure SSH keys after creating the instance.
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
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
