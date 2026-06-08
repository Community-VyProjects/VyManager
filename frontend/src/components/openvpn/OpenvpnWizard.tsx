"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Server,
  Users,
  ArrowLeftRight,
  CheckCircle2,
} from "lucide-react";
import {
  openvpnService,
  type OpenvpnCapabilities,
  type OpenvpnCreateConfig,
} from "@/lib/api/openvpn";
import { pkiService, type PKIConfigResponse } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { LEGACY_CIPHERS, DATA_CIPHERS, HASH_ALGORITHMS } from "./constants";

type Mode = "server" | "client" | "site-to-site" | "";

interface OpenvpnWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: OpenvpnCapabilities | null;
  existingNames: string[];
}

const STEP_TITLES = [
  "Mode",
  "Basics",
  "Network",
  "Encryption",
  "Authentication",
  "Review",
];

export function OpenvpnWizard({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingNames,
}: OpenvpnWizardProps) {
  const is15 = capabilities?.version_info.is_1_5 ?? false;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pki, setPki] = useState<PKIConfigResponse | null>(null);

  // Step 0: Mode
  const [mode, setMode] = useState<Mode>("");

  // Step 1: Basics
  const [name, setName] = useState("vtun0");
  const [description, setDescription] = useState("");
  const [deviceType, setDeviceType] = useState("tun");
  const [protocol, setProtocol] = useState("udp");

  // Step 2: Network
  const [localHost, setLocalHost] = useState("");
  const [localPort, setLocalPort] = useState("1194");
  const [remoteHostText, setRemoteHostText] = useState("");
  const [remotePort, setRemotePort] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [localAddressMask, setLocalAddressMask] = useState("");
  const [remoteAddressText, setRemoteAddressText] = useState("");
  const [serverSubnetText, setServerSubnetText] = useState("");
  const [serverTopology, setServerTopology] = useState("subnet");
  const [serverPushRoutesText, setServerPushRoutesText] = useState("");

  // Step 3: Encryption
  const [cipher, setCipher] = useState("");
  const [dataCiphers, setDataCiphers] = useState<string[]>(is15 ? ["aes256gcm"] : []);
  const [hash, setHash] = useState("sha256");
  const [tlsCas, setTlsCas] = useState<string[]>([]);
  const [tlsCert, setTlsCert] = useState("");
  const [tlsDh, setTlsDh] = useState("");
  const [tlsAuthKey, setTlsAuthKey] = useState("");
  const [sharedSecretKey, setSharedSecretKey] = useState("");

  // Step 4: Auth (client/server only)
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [persistentTunnel, setPersistentTunnel] = useState(true);

  useEffect(() => {
    if (!open) return;
    pkiService.getConfig().then(setPki).catch(() => {});
    setStep(0);
    setMode("");
    setName("vtun0");
    setDescription("");
    setDeviceType("tun");
    setProtocol("udp");
    setLocalHost("");
    setLocalPort("1194");
    setRemoteHostText("");
    setRemotePort("");
    setLocalAddress("");
    setLocalAddressMask("");
    setRemoteAddressText("");
    setServerSubnetText("");
    setServerTopology("subnet");
    setServerPushRoutesText("");
    setCipher("");
    setDataCiphers(is15 ? ["aes256gcm"] : []);
    setHash("sha256");
    setTlsCas([]);
    setTlsCert("");
    setTlsDh("");
    setTlsAuthKey("");
    setSharedSecretKey("");
    setAuthUsername("");
    setAuthPassword("");
    setPersistentTunnel(true);
    setError(null);
    setLoading(false);
  }, [open, is15]);

  const splitLines = (s: string): string[] =>
    s.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  const buildConfig = (): OpenvpnCreateConfig => {
    const config: OpenvpnCreateConfig = { name };
    if (description) config.description = description;
    if (mode) config.mode = mode;
    if (deviceType) config.device_type = deviceType;
    if (protocol) config.protocol = protocol;
    if (persistentTunnel) config.persistent_tunnel = true;

    if (localHost) config.local_host = localHost;
    if (localPort) config.local_port = localPort;
    if (remotePort) config.remote_port = remotePort;
    const remoteHosts = splitLines(remoteHostText);
    if (remoteHosts.length > 0) config.remote_host = remoteHosts;

    if (localAddress) {
      config.local_addresses = [
        {
          address: localAddress,
          subnet_mask: localAddressMask || undefined,
        },
      ];
    }
    const remoteAddresses = splitLines(remoteAddressText);
    if (remoteAddresses.length > 0) config.remote_address = remoteAddresses;

    const enc: NonNullable<OpenvpnCreateConfig["encryption"]> = {};
    if (cipher) enc.cipher = cipher;
    if (dataCiphers.length > 0) enc.data_ciphers = dataCiphers;
    if (Object.keys(enc).length > 0) config.encryption = enc;
    if (hash) config.hash = hash;
    if (sharedSecretKey) config.shared_secret_key = sharedSecretKey;

    const tls: NonNullable<OpenvpnCreateConfig["tls"]> = {};
    if (tlsCas.length > 0) tls.ca_certificates = tlsCas;
    if (tlsCert) tls.certificate = tlsCert;
    if (tlsDh) tls.dh_params = tlsDh;
    if (tlsAuthKey) tls.auth_key = tlsAuthKey;
    if (Object.keys(tls).length > 0) config.tls = tls;

    if (mode === "server") {
      const server: NonNullable<OpenvpnCreateConfig["server"]> = {};
      const subnets = splitLines(serverSubnetText);
      if (subnets.length > 0) server.subnet = subnets;
      if (serverTopology) server.topology = serverTopology;
      const pushRoutes = splitLines(serverPushRoutesText);
      if (pushRoutes.length > 0) {
        server.push_route = pushRoutes.map((r) => ({ route: r }));
      }
      if (Object.keys(server).length > 0) config.server = server;
    }

    if (mode === "client" && (authUsername || authPassword)) {
      config.authentication = {
        username: authUsername || undefined,
        password: authPassword || undefined,
      };
    }

    return config;
  };

  const validateStep = (): string | null => {
    if (step === 0 && !mode) return "Please select a mode.";
    if (step === 1) {
      if (!name.trim()) return "Interface name is required.";
      if (existingNames.includes(name)) return `Interface "${name}" already exists.`;
    }
    if (step === 2) {
      if (mode === "server") {
        if (!localPort) return "Local port is required for server mode.";
        if (!serverSubnetText.trim()) return "At least one server subnet is required.";
      }
      if (mode === "client") {
        if (!remoteHostText.trim()) return "Remote host is required for client mode.";
      }
      if (mode === "site-to-site") {
        if (!localAddress || !remoteAddressText.trim()) {
          return "Local and remote addresses are required for site-to-site mode.";
        }
      }
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(Math.min(step + 1, STEP_TITLES.length - 1));
  };

  const handlePrev = () => {
    setError(null);
    setStep(Math.max(step - 1, 0));
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await openvpnService.createInterface(buildConfig());
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to create OpenVPN interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create OpenVPN interface");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / STEP_TITLES.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>OpenVPN Quick Setup</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEP_TITLES.length}: {STEP_TITLES[step]}
          </DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="h-1" />

        <div className="min-h-[320px] py-2">
          {/* Step 0: Mode */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Select the OpenVPN deployment mode.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <ModeCard
                  selected={mode === "server"}
                  onClick={() => setMode("server")}
                  icon={Server}
                  title="Server"
                  description="Accept incoming connections from multiple clients."
                />
                <ModeCard
                  selected={mode === "client"}
                  onClick={() => setMode("client")}
                  icon={Users}
                  title="Client"
                  description="Connect to a remote OpenVPN server."
                />
                <ModeCard
                  selected={mode === "site-to-site"}
                  onClick={() => setMode("site-to-site")}
                  icon={ArrowLeftRight}
                  title="Site-to-Site"
                  description="Establish a point-to-point tunnel between two sites."
                />
              </div>
            </div>
          )}

          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="wname">Interface Name *</Label>
                <Input id="wname" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="wdesc">Description</Label>
                <Input
                  id="wdesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wdev">Device Type</Label>
                  <Select value={deviceType} onValueChange={setDeviceType}>
                    <SelectTrigger id="wdev">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tun">tun</SelectItem>
                      <SelectItem value="tap">tap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="wproto">Protocol</Label>
                  <Select value={protocol} onValueChange={setProtocol}>
                    <SelectTrigger id="wproto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="udp">udp</SelectItem>
                      <SelectItem value="tcp-active">tcp-active</SelectItem>
                      <SelectItem value="tcp-passive">tcp-passive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Network */}
          {step === 2 && (
            <div className="space-y-4">
              {mode === "server" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wlhost">Listen Host</Label>
                      <Input
                        id="wlhost"
                        value={localHost}
                        onChange={(e) => setLocalHost(e.target.value)}
                        placeholder="0.0.0.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wlport">Listen Port *</Label>
                      <Input
                        id="wlport"
                        value={localPort}
                        onChange={(e) => setLocalPort(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="wsubnet">Server Subnets * (one per line)</Label>
                    <Textarea
                      id="wsubnet"
                      value={serverSubnetText}
                      onChange={(e) => setServerSubnetText(e.target.value)}
                      placeholder="10.8.0.0/24"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="wtopo">Topology</Label>
                    <Select value={serverTopology} onValueChange={setServerTopology}>
                      <SelectTrigger id="wtopo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subnet">subnet</SelectItem>
                        <SelectItem value="p2p">p2p</SelectItem>
                        <SelectItem value="net30">net30</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="wpush">Push Routes (one per line)</Label>
                    <Textarea
                      id="wpush"
                      value={serverPushRoutesText}
                      onChange={(e) => setServerPushRoutesText(e.target.value)}
                      rows={2}
                    />
                  </div>
                </>
              )}

              {mode === "client" && (
                <>
                  <div>
                    <Label htmlFor="wrhost">Remote Host(s) * (one per line)</Label>
                    <Textarea
                      id="wrhost"
                      value={remoteHostText}
                      onChange={(e) => setRemoteHostText(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="wrport">Remote Port</Label>
                    <Input
                      id="wrport"
                      value={remotePort}
                      onChange={(e) => setRemotePort(e.target.value)}
                      placeholder="1194"
                    />
                  </div>
                </>
              )}

              {mode === "site-to-site" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wlhost">Local Host</Label>
                      <Input
                        id="wlhost"
                        value={localHost}
                        onChange={(e) => setLocalHost(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="wlport">Local Port</Label>
                      <Input
                        id="wlport"
                        value={localPort}
                        onChange={(e) => setLocalPort(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wrhost">Remote Host</Label>
                      <Input
                        id="wrhost"
                        value={remoteHostText}
                        onChange={(e) => setRemoteHostText(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="wrport">Remote Port</Label>
                      <Input
                        id="wrport"
                        value={remotePort}
                        onChange={(e) => setRemotePort(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wladdr">Local Address *</Label>
                      <Input
                        id="wladdr"
                        value={localAddress}
                        onChange={(e) => setLocalAddress(e.target.value)}
                        placeholder="10.0.0.1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wlmask">Local Subnet Mask</Label>
                      <Input
                        id="wlmask"
                        value={localAddressMask}
                        onChange={(e) => setLocalAddressMask(e.target.value)}
                        placeholder="255.255.255.0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="wraddr">Remote Address(es) * (one per line)</Label>
                    <Textarea
                      id="wraddr"
                      value={remoteAddressText}
                      onChange={(e) => setRemoteAddressText(e.target.value)}
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Encryption */}
          {step === 3 && (
            <div className="space-y-4">
              {mode === "site-to-site" && (
                <div>
                  <Label htmlFor="wssk">Shared Secret Key</Label>
                  <Select value={sharedSecretKey} onValueChange={setSharedSecretKey}>
                    <SelectTrigger id="wssk">
                      <SelectValue placeholder="Select from PKI" />
                    </SelectTrigger>
                    <SelectContent>
                      {pki?.openvpn_shared_secrets.map((s) => (
                        <SelectItem key={s.name} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    For site-to-site tunnels using pre-shared key.
                  </p>
                </div>
              )}

              {(mode === "server" || mode === "client") && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>CA Certificate(s)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Select one or more CAs (e.g. an intermediate CA chain).
                      </p>
                      <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                        {pki?.ca.map((c) => (
                          <label key={c.name} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={tlsCas.includes(c.name)}
                              onCheckedChange={(v) =>
                                setTlsCas(
                                  v ? [...tlsCas, c.name] : tlsCas.filter((x) => x !== c.name),
                                )
                              }
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="wcert">Certificate</Label>
                      <Select value={tlsCert} onValueChange={setTlsCert}>
                        <SelectTrigger id="wcert">
                          <SelectValue placeholder="Select cert" />
                        </SelectTrigger>
                        <SelectContent>
                          {pki?.certificates.map((c) => (
                            <SelectItem key={c.name} value={c.name}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {mode === "server" && (
                    <div>
                      <Label htmlFor="wdh">DH Parameters</Label>
                      <Select value={tlsDh} onValueChange={setTlsDh}>
                        <SelectTrigger id="wdh">
                          <SelectValue placeholder="Select DH" />
                        </SelectTrigger>
                        <SelectContent>
                          {pki?.dh.map((d) => (
                            <SelectItem key={d.name} value={d.name}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="wauthkey">TLS Auth Key (optional)</Label>
                    <Select value={tlsAuthKey} onValueChange={setTlsAuthKey}>
                      <SelectTrigger id="wauthkey">
                        <SelectValue placeholder="Select shared secret" />
                      </SelectTrigger>
                      <SelectContent>
                        {pki?.openvpn_shared_secrets.map((s) => (
                          <SelectItem key={s.name} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wcipher">Legacy Cipher</Label>
                  <Select value={cipher} onValueChange={setCipher}>
                    <SelectTrigger id="wcipher">
                      <SelectValue placeholder="Select cipher" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEGACY_CIPHERS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="whash">Hash</Label>
                  <Select value={hash} onValueChange={setHash}>
                    <SelectTrigger id="whash">
                      <SelectValue placeholder="Select hash" />
                    </SelectTrigger>
                    <SelectContent>
                      {HASH_ALGORITHMS.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {is15 && (
                <div>
                  <Label>Data Ciphers</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select one or more ciphers the peer may negotiate.
                  </p>
                  <div className="grid grid-cols-4 gap-2 rounded-md border p-3">
                    {DATA_CIPHERS.map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={dataCiphers.includes(c)}
                          onCheckedChange={(v) =>
                            setDataCiphers(
                              v ? [...dataCiphers, c] : dataCiphers.filter((x) => x !== c),
                            )
                          }
                        />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Authentication */}
          {step === 4 && (
            <div className="space-y-4">
              {mode === "client" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Optional username/password authentication for this client.
                  </p>
                  <div>
                    <Label htmlFor="wauser">Username</Label>
                    <Input
                      id="wauser"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="wapass">Password</Label>
                    <Input
                      id="wapass"
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <Separator />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No authentication configuration required for this mode.
                </p>
              )}
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={persistentTunnel}
                  onCheckedChange={(v) => setPersistentTunnel(!!v)}
                />
                <span>Persistent tunnel (recommended)</span>
              </label>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold">Review your configuration</span>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 space-y-1 font-mono text-xs">
                <ReviewRow label="Mode" value={mode} />
                <ReviewRow label="Interface" value={name} />
                {description && <ReviewRow label="Description" value={description} />}
                <ReviewRow label="Device" value={deviceType} />
                <ReviewRow label="Protocol" value={protocol} />
                {localHost && <ReviewRow label="Local Host" value={localHost} />}
                {localPort && <ReviewRow label="Local Port" value={localPort} />}
                {remoteHostText && (
                  <ReviewRow
                    label="Remote Host(s)"
                    value={splitLines(remoteHostText).join(", ")}
                  />
                )}
                {remotePort && <ReviewRow label="Remote Port" value={remotePort} />}
                {localAddress && (
                  <ReviewRow
                    label="Local Address"
                    value={`${localAddress}${localAddressMask ? " / " + localAddressMask : ""}`}
                  />
                )}
                {remoteAddressText && (
                  <ReviewRow
                    label="Remote Addresses"
                    value={splitLines(remoteAddressText).join(", ")}
                  />
                )}
                {serverSubnetText && (
                  <ReviewRow
                    label="Server Subnets"
                    value={splitLines(serverSubnetText).join(", ")}
                  />
                )}
                {mode === "server" && serverTopology && (
                  <ReviewRow label="Topology" value={serverTopology} />
                )}
                {cipher && <ReviewRow label="Cipher" value={cipher} />}
                {dataCiphers.length > 0 && (
                  <ReviewRow label="Data Ciphers" value={dataCiphers.join(", ")} />
                )}
                {hash && <ReviewRow label="Hash" value={hash} />}
                {tlsCas.length > 0 && <ReviewRow label="CA" value={tlsCas.join(", ")} />}
                {tlsCert && <ReviewRow label="Certificate" value={tlsCert} />}
                {tlsDh && <ReviewRow label="DH Params" value={tlsDh} />}
                {tlsAuthKey && <ReviewRow label="TLS Auth Key" value={tlsAuthKey} />}
                {sharedSecretKey && (
                  <ReviewRow label="Shared Secret" value={sharedSecretKey} />
                )}
                {authUsername && <ReviewRow label="Username" value={authUsername} />}
                {persistentTunnel && <ReviewRow label="Persistent Tunnel" value="Yes" />}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 0 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < STEP_TITLES.length - 1 ? (
            <Button onClick={handleNext} disabled={loading}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "hover:bg-muted/50 border-border"
      )}
    >
      <div
        className={cn(
          "p-2 rounded-md",
          selected ? "bg-primary/10 text-primary" : "bg-muted"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px,1fr] gap-2">
      <div className="text-muted-foreground">{label}:</div>
      <div className="break-all">{value}</div>
    </div>
  );
}
