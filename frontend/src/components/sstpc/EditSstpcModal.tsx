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
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  sstpcService,
  type SstpcCapabilities,
  type SstpcCreateConfig,
  type SstpcInterface,
} from "@/lib/api/sstpc";
import { pkiService, type PKIConfigResponse } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";

interface EditSstpcModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: SstpcInterface | null;
  capabilities: SstpcCapabilities | null;
}

export function EditSstpcModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: EditSstpcModalProps) {
  // Basic
  const [description, setDescription] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [server, setServer] = useState("");
  const [port, setPort] = useState("");

  // Auth & SSL
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sslCaCertificate, setSslCaCertificate] = useState("");
  const [pki, setPki] = useState<PKIConfigResponse | null>(null);

  // Routing & Network
  const [defaultRouteDistance, setDefaultRouteDistance] = useState("");
  const [noDefaultRoute, setNoDefaultRoute] = useState(false);
  const [noPeerDns, setNoPeerDns] = useState(false);
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !interfaceData) return;
    setDescription(interfaceData.description ?? "");
    setDisabled(interfaceData.disabled);
    setServer(interfaceData.server ?? "");
    setPort(interfaceData.port ?? "");
    setUsername(interfaceData.authentication?.username ?? "");
    setPassword("");
    setShowPassword(false);
    setSslCaCertificate(interfaceData.ssl?.ca_certificate ?? "");
    setDefaultRouteDistance(interfaceData.default_route_distance ?? "");
    setNoDefaultRoute(interfaceData.no_default_route);
    setNoPeerDns(interfaceData.no_peer_dns);
    setMtu(interfaceData.mtu ?? "");
    setVrf(interfaceData.vrf ?? "");
    setError(null);
    pkiService.getConfig().then(setPki).catch(() => {});
  }, [open, interfaceData]);

  const validate = (): string | null => {
    if (!server.trim()) return "Server address is required.";
    if (port) {
      const p = Number(port);
      if (!Number.isInteger(p) || p < 1 || p > 65535) return "Port must be an integer between 1 and 65535.";
    }
    if (defaultRouteDistance) {
      const d = Number(defaultRouteDistance);
      if (!Number.isInteger(d) || d < 1 || d > 255) return "Default route distance must be between 1 and 255.";
    }
    if (mtu) {
      const m = Number(mtu);
      if (!Number.isInteger(m) || m < 68 || m > 1500) return "MTU must be between 68 and 1500.";
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!interfaceData) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);

    try {
      const updated: Partial<SstpcCreateConfig> = {};

      const trimOrNull = (v: string) => v.trim() || "";

      const descVal = trimOrNull(description);
      if (descVal !== (interfaceData.description ?? "")) updated.description = descVal;

      if (disabled !== interfaceData.disabled) updated.disabled = disabled;

      const serverVal = trimOrNull(server);
      if (serverVal !== (interfaceData.server ?? "")) updated.server = serverVal;

      const portVal = trimOrNull(port);
      if (portVal !== (interfaceData.port ?? "")) updated.port = portVal;

      const usernameVal = trimOrNull(username);
      if (usernameVal !== (interfaceData.authentication?.username ?? "")) updated.username = usernameVal;

      // Password: only send if user typed something new
      if (password) updated.password = password;

      const caVal = sslCaCertificate;
      if (caVal !== (interfaceData.ssl?.ca_certificate ?? "")) updated.ssl_ca_certificate = caVal;

      const drdVal = trimOrNull(defaultRouteDistance);
      if (drdVal !== (interfaceData.default_route_distance ?? "")) updated.default_route_distance = drdVal;

      if (noDefaultRoute !== interfaceData.no_default_route) updated.no_default_route = noDefaultRoute;
      if (noPeerDns !== interfaceData.no_peer_dns) updated.no_peer_dns = noPeerDns;

      const mtuVal = trimOrNull(mtu);
      if (mtuVal !== (interfaceData.mtu ?? "")) updated.mtu = mtuVal;

      const vrfVal = trimOrNull(vrf);
      if (vrfVal !== (interfaceData.vrf ?? "")) updated.vrf = vrfVal;

      const result = await sstpcService.updateInterface(interfaceData.name, interfaceData, updated);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update interface");
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit SSTPC Interface: {interfaceData.name}</DialogTitle>
          <DialogDescription>
            Update the configuration for this SSTP client interface.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="auth">Authentication &amp; SSL</TabsTrigger>
            <TabsTrigger value="routing">Routing &amp; Network</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Basic ── */}
          <TabsContent value="basic" className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Interface</Label>
              <p className="font-mono font-semibold text-sm">{interfaceData.name}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-server">Server <span className="text-destructive">*</span></Label>
              <Input
                id="edit-server"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="vpn.example.com or 192.0.2.1"
              />
              <p className="text-xs text-muted-foreground">Remote SSTP server hostname or IPv4 address</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-port">Port</Label>
              <Input
                id="edit-port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="443"
                type="number"
                min={1}
                max={65535}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-disabled"
                checked={disabled}
                onCheckedChange={(v) => setDisabled(!!v)}
              />
              <Label htmlFor="edit-disabled" className="cursor-pointer">
                Administratively disable this interface
              </Label>
            </div>
          </TabsContent>

          {/* ── Tab 2: Authentication & SSL ── */}
          <TabsContent value="auth" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VPN username"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-password">Password</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  autoComplete="new-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sslCa">CA Certificate</Label>
              <Select value={sslCaCertificate} onValueChange={setSslCaCertificate}>
                <SelectTrigger id="edit-sslCa">
                  <SelectValue placeholder={pki?.ca && pki.ca.length > 0 ? "Select CA certificate" : "No CA certificates in PKI"} />
                </SelectTrigger>
                <SelectContent>
                  {pki?.ca && pki.ca.length > 0 ? (
                    pki.ca.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none" disabled>
                      No CA certificates available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                CA certificate from PKI used to verify the server&apos;s SSL certificate
              </p>
            </div>
          </TabsContent>

          {/* ── Tab 3: Routing & Network ── */}
          <TabsContent value="routing" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-defaultRouteDistance">Default Route Distance</Label>
              <Input
                id="edit-defaultRouteDistance"
                value={defaultRouteDistance}
                onChange={(e) => setDefaultRouteDistance(e.target.value)}
                placeholder="210"
                type="number"
                min={1}
                max={255}
              />
              <p className="text-xs text-muted-foreground">Administrative distance for the default route (1–255)</p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-noDefaultRoute"
                checked={noDefaultRoute}
                onCheckedChange={(v) => setNoDefaultRoute(!!v)}
              />
              <Label htmlFor="edit-noDefaultRoute" className="cursor-pointer">
                Do not install default route to system
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-noPeerDns"
                checked={noPeerDns}
                onCheckedChange={(v) => setNoPeerDns(!!v)}
              />
              <Label htmlFor="edit-noPeerDns" className="cursor-pointer">
                Do not use DNS servers provided by the peer
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-mtu">MTU</Label>
              <Input
                id="edit-mtu"
                value={mtu}
                onChange={(e) => setMtu(e.target.value)}
                placeholder="1452"
                type="number"
                min={68}
                max={1500}
              />
              <p className="text-xs text-muted-foreground">Maximum Transmission Unit in bytes (68–1500)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-vrf">VRF</Label>
              <VrfSelect
                id="edit-vrf"
                value={vrf}
                onValueChange={setVrf}
              />
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
