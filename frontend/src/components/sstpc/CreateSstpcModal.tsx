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
import { sstpcService, type SstpcCapabilities, type SstpcCreateConfig } from "@/lib/api/sstpc";
import { pkiService, type PKIConfigResponse } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";

interface CreateSstpcModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: SstpcCapabilities | null;
  existingInterfaces: string[];
}

const SSTPC_NAME_RE = /^sstpc[0-9]+$/;

export function CreateSstpcModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterfaces,
}: CreateSstpcModalProps) {
  // Basic
  const [name, setName] = useState("sstpc0");
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
    if (!open) return;
    setName("sstpc0");
    setDescription("");
    setDisabled(false);
    setServer("");
    setPort("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setSslCaCertificate("");
    setDefaultRouteDistance("");
    setNoDefaultRoute(false);
    setNoPeerDns(false);
    setMtu("");
    setVrf("");
    setError(null);
    pkiService.getConfig().then(setPki).catch(() => {});
  }, [open]);

  const validate = (): string | null => {
    const n = name.trim();
    if (!n) return "Interface name is required.";
    if (!SSTPC_NAME_RE.test(n)) return "Interface name must be in the format 'sstpcN' (e.g. sstpc0).";
    if (existingInterfaces.includes(n)) return `Interface '${n}' already exists.`;
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
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);

    try {
      const config: SstpcCreateConfig = {
        name: name.trim(),
        description: description.trim() || undefined,
        disabled: disabled || undefined,
        server: server.trim(),
        port: port.trim() || undefined,
        username: username.trim() || undefined,
        password: password || undefined,
        ssl_ca_certificate: sslCaCertificate || undefined,
        default_route_distance: defaultRouteDistance.trim() || undefined,
        no_default_route: noDefaultRoute || undefined,
        no_peer_dns: noPeerDns || undefined,
        mtu: mtu.trim() || undefined,
        vrf: vrf.trim() || undefined,
      };

      const result = await sstpcService.createInterface(config);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create SSTPC Interface</DialogTitle>
          <DialogDescription>
            Configure a new Secure Socket Tunneling Protocol client interface.
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
            <div className="space-y-2">
              <Label htmlFor="name">Interface Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="sstpc0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="server">Server <span className="text-destructive">*</span></Label>
              <Input
                id="server"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="vpn.example.com or 192.0.2.1"
              />
              <p className="text-xs text-muted-foreground">Remote SSTP server hostname or IPv4 address</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="443"
                type="number"
                min={1}
                max={65535}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="disabled"
                checked={disabled}
                onCheckedChange={(v) => setDisabled(!!v)}
              />
              <Label htmlFor="disabled" className="cursor-pointer">
                Administratively disable this interface
              </Label>
            </div>
          </TabsContent>

          {/* ── Tab 2: Authentication & SSL ── */}
          <TabsContent value="auth" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VPN username"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="VPN password"
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
              <Label htmlFor="sslCa">CA Certificate</Label>
              <Select value={sslCaCertificate} onValueChange={setSslCaCertificate}>
                <SelectTrigger id="sslCa">
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
              <Label htmlFor="defaultRouteDistance">Default Route Distance</Label>
              <Input
                id="defaultRouteDistance"
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
                id="noDefaultRoute"
                checked={noDefaultRoute}
                onCheckedChange={(v) => setNoDefaultRoute(!!v)}
              />
              <Label htmlFor="noDefaultRoute" className="cursor-pointer">
                Do not install default route to system
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="noPeerDns"
                checked={noPeerDns}
                onCheckedChange={(v) => setNoPeerDns(!!v)}
              />
              <Label htmlFor="noPeerDns" className="cursor-pointer">
                Do not use DNS servers provided by the peer
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mtu">MTU</Label>
              <Input
                id="mtu"
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
              <Label htmlFor="vrf">VRF</Label>
              <Input
                id="vrf"
                value={vrf}
                onChange={(e) => setVrf(e.target.value)}
                placeholder="VRF instance name"
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
                Creating...
              </>
            ) : (
              "Create Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
