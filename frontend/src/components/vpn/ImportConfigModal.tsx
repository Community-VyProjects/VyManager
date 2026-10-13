"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowRight,
  Loader2,
  Network,
  Key,
  Globe,
  Users,
  FileText,
} from "lucide-react";
import { wireguardService, type WireGuardCapabilities } from "@/lib/api/wireguard";

// ============================================================================
// Parser types and logic
// ============================================================================

interface ParsedPeer {
  public_key?: string;
  preshared_key?: string;
  allowed_ips: string[];
  endpoint_address?: string;   // IPv4 or IPv6 literal
  endpoint_hostname?: string;  // FQDN
  endpoint_port?: string;
  persistent_keepalive?: string;
  raw_endpoint?: string;
}

interface ParsedConfig {
  interface: {
    private_key?: string;
    addresses: string[];
    listen_port?: string;
    mtu?: string;
    has_dns: boolean;
    has_scripts: boolean;
    unknown_keys: string[];
  };
  peers: ParsedPeer[];
}

function parseWireGuardConfig(text: string): ParsedConfig {
  const result: ParsedConfig = {
    interface: { addresses: [], has_dns: false, has_scripts: false, unknown_keys: [] },
    peers: [],
  };

  // Split into named sections
  const lines = text.split("\n");
  let currentSection: "Interface" | "Peer" | null = null;
  let currentPeer: ParsedPeer | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    // Section header
    if (/^\[Interface\]/i.test(line)) {
      currentSection = "Interface";
      currentPeer = null;
      continue;
    }
    if (/^\[Peer\]/i.test(line)) {
      if (currentPeer) result.peers.push(currentPeer);
      currentPeer = { allowed_ips: [] };
      currentSection = "Peer";
      continue;
    }
    if (/^\[/.test(line)) {
      // Unknown section — skip
      currentSection = null;
      continue;
    }

    const eqIdx = line.indexOf("=");
    if (eqIdx < 0) continue;
    const key = line.slice(0, eqIdx).trim().toLowerCase();
    const value = line.slice(eqIdx + 1).trim();

    if (currentSection === "Interface") {
      if (key === "privatekey") result.interface.private_key = value;
      else if (key === "address") {
        result.interface.addresses.push(
          ...value.split(",").map((s) => s.trim()).filter(Boolean)
        );
      } else if (key === "listenport") result.interface.listen_port = value;
      else if (key === "mtu") result.interface.mtu = value;
      else if (key === "dns") result.interface.has_dns = true;
      else if (key === "postup" || key === "postdown" || key === "preup" || key === "predown") {
        result.interface.has_scripts = true;
      } else {
        result.interface.unknown_keys.push(line.slice(0, eqIdx).trim());
      }
    } else if (currentSection === "Peer" && currentPeer) {
      if (key === "publickey") currentPeer.public_key = value;
      else if (key === "presharedkey") currentPeer.preshared_key = value;
      else if (key === "allowedips") {
        currentPeer.allowed_ips.push(
          ...value.split(",").map((s) => s.trim()).filter(Boolean)
        );
      } else if (key === "endpoint") {
        currentPeer.raw_endpoint = value;
        parseEndpoint(currentPeer, value);
      } else if (key === "persistentkeepalive") currentPeer.persistent_keepalive = value;
    }
  }

  // Push last peer
  if (currentPeer) result.peers.push(currentPeer);

  return result;
}

function parseEndpoint(peer: ParsedPeer, endpoint: string) {
  // IPv6 format: [::1]:51820
  if (endpoint.startsWith("[")) {
    const closeIdx = endpoint.indexOf("]");
    if (closeIdx >= 0 && endpoint[closeIdx + 1] === ":") {
      peer.endpoint_address = endpoint.slice(1, closeIdx);
      peer.endpoint_port = endpoint.slice(closeIdx + 2);
    }
    return;
  }
  // hostname:port or IPv4:port — split by last ":"
  const lastColon = endpoint.lastIndexOf(":");
  if (lastColon < 0) return;
  const host = endpoint.slice(0, lastColon);
  const port = endpoint.slice(lastColon + 1);
  peer.endpoint_port = port;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    peer.endpoint_address = host;
  } else {
    peer.endpoint_hostname = host;
  }
}

// ============================================================================
// Validation
// ============================================================================

type ValidationMessageKey =
  | "noPeerSection"
  | "privateKeyMissing"
  | "invalidKeyFormat"
  | "valid"
  | "noAddress"
  | "invalidCidr"
  | "invalidPort"
  | "dnsIgnored"
  | "scriptsIgnored"
  | "unknownIgnored"
  | "publicKeyRequired"
  | "noAllowedIps"
  | "missingPort"
  | "portOutOfRange";

interface ValidationItem {
  // Config identifiers ("[Interface] Address") are shown as-is; fieldKey marks
  // the few English field labels that are translated at render time.
  field: string;
  fieldKey?: "config" | "unknownFields";
  // Either a message key (translated in ValidationPanel) or a raw value from the config.
  message: { key: ValidationMessageKey; values?: Record<string, string> } | { text: string };
  severity: "error" | "warning" | "ok";
}

function validateConfig(config: ParsedConfig): ValidationItem[] {
  const items: ValidationItem[] = [];

  if (config.peers.length === 0) {
    items.push({
      field: "Config",
      fieldKey: "config",
      message: { key: "noPeerSection" },
      severity: "error",
    });
  }

  // Interface fields
  if (!config.interface.private_key) {
    items.push({
      field: "[Interface] PrivateKey",
      message: { key: "privateKeyMissing" },
      severity: "warning",
    });
  } else if (!isValidBase64Key(config.interface.private_key)) {
    items.push({
      field: "[Interface] PrivateKey",
      message: { key: "invalidKeyFormat" },
      severity: "error",
    });
  } else {
    items.push({ field: "[Interface] PrivateKey", message: { key: "valid" }, severity: "ok" });
  }

  if (config.interface.addresses.length === 0) {
    items.push({
      field: "[Interface] Address",
      message: { key: "noAddress" },
      severity: "warning",
    });
  } else {
    for (const addr of config.interface.addresses) {
      if (!isValidCIDR(addr) && !isValidIP(addr)) {
        items.push({
          field: "[Interface] Address",
          message: { key: "invalidCidr", values: { value: addr } },
          severity: "error",
        });
      } else {
        items.push({ field: "[Interface] Address", message: { text: addr }, severity: "ok" });
      }
    }
  }

  if (config.interface.listen_port) {
    const port = parseInt(config.interface.listen_port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      items.push({
        field: "[Interface] ListenPort",
        message: { key: "invalidPort", values: { value: config.interface.listen_port } },
        severity: "error",
      });
    } else {
      items.push({
        field: "[Interface] ListenPort",
        message: { text: config.interface.listen_port },
        severity: "ok",
      });
    }
  }

  if (config.interface.has_dns) {
    items.push({
      field: "[Interface] DNS",
      message: { key: "dnsIgnored" },
      severity: "warning",
    });
  }

  if (config.interface.has_scripts) {
    items.push({
      field: "PostUp / PostDown",
      message: { key: "scriptsIgnored" },
      severity: "warning",
    });
  }

  if (config.interface.unknown_keys.length > 0) {
    items.push({
      field: "Unknown interface fields",
      fieldKey: "unknownFields",
      message: { key: "unknownIgnored", values: { keys: config.interface.unknown_keys.join(", ") } },
      severity: "warning",
    });
  }

  // Peer fields
  config.peers.forEach((peer, idx) => {
    const label = config.peers.length > 1 ? `[Peer ${idx + 1}]` : "[Peer]";

    if (!peer.public_key) {
      items.push({
        field: `${label} PublicKey`,
        message: { key: "publicKeyRequired" },
        severity: "error",
      });
    } else if (!isValidBase64Key(peer.public_key)) {
      items.push({
        field: `${label} PublicKey`,
        message: { key: "invalidKeyFormat" },
        severity: "error",
      });
    } else {
      items.push({ field: `${label} PublicKey`, message: { key: "valid" }, severity: "ok" });
    }

    if (peer.preshared_key) {
      if (!isValidBase64Key(peer.preshared_key)) {
        items.push({
          field: `${label} PresharedKey`,
          message: { key: "invalidKeyFormat" },
          severity: "error",
        });
      } else {
        items.push({ field: `${label} PresharedKey`, message: { key: "valid" }, severity: "ok" });
      }
    }

    if (peer.allowed_ips.length === 0) {
      items.push({
        field: `${label} AllowedIPs`,
        message: { key: "noAllowedIps" },
        severity: "warning",
      });
    } else {
      for (const ip of peer.allowed_ips) {
        if (!isValidCIDR(ip) && !isValidIP(ip)) {
          items.push({
            field: `${label} AllowedIPs`,
            message: { key: "invalidCidr", values: { value: ip } },
            severity: "error",
          });
        } else {
          items.push({ field: `${label} AllowedIPs`, message: { text: ip }, severity: "ok" });
        }
      }
    }

    if (peer.raw_endpoint) {
      if (!peer.endpoint_port) {
        items.push({
          field: `${label} Endpoint`,
          message: { key: "missingPort", values: { value: peer.raw_endpoint } },
          severity: "error",
        });
      } else {
        const port = parseInt(peer.endpoint_port, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          items.push({
            field: `${label} Endpoint`,
            message: { key: "portOutOfRange", values: { value: peer.endpoint_port } },
            severity: "error",
          });
        } else {
          items.push({
            field: `${label} Endpoint`,
            message: { text: peer.raw_endpoint },
            severity: "ok",
          });
        }
      }
    }
  });

  return items;
}

function isValidBase64Key(key: string): boolean {
  return /^[A-Za-z0-9+/]{43}=$/.test(key) || /^[A-Za-z0-9\-_]{43}=$/.test(key);
}

function isValidCIDR(value: string): boolean {
  return /^[0-9a-fA-F.:]+\/\d+$/.test(value);
}

function isValidIP(value: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value) || /^[0-9a-fA-F:]+$/.test(value);
}

function getSuggestedPeerName(peer: ParsedPeer, idx: number): string {
  if (peer.endpoint_hostname) {
    const sanitized = peer.endpoint_hostname
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24);
    if (sanitized) return sanitized;
  }
  return `imported-peer-${idx + 1}`;
}

// ============================================================================
// Sub-components
// ============================================================================

function ValidationIcon({ severity }: { severity: ValidationItem["severity"] }) {
  if (severity === "error") return <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />;
  return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />;
}

function ValidationPanel({ items }: { items: ValidationItem[] }) {
  const t = useTranslations("wireguardTools");
  if (items.length === 0) return null;

  const errors = items.filter((i) => i.severity === "error");
  const warnings = items.filter((i) => i.severity === "warning");
  const oks = items.filter((i) => i.severity === "ok");

  return (
    <div className="space-y-1 text-sm">
      <div className="flex gap-2 mb-2 text-xs text-muted-foreground">
        {errors.length > 0 && (
          <span className="text-destructive font-medium">{t("importConfig.errorCount", { count: errors.length })}</span>
        )}
        {warnings.length > 0 && (
          <span className="text-amber-600 font-medium">{t("importConfig.warningCount", { count: warnings.length })}</span>
        )}
        {oks.length > 0 && (
          <span className="text-green-600 font-medium">{t("importConfig.validCount", { count: oks.length })}</span>
        )}
      </div>
      <ScrollArea className="max-h-48">
        <div className="space-y-1 pr-2">
          {[...errors, ...warnings, ...oks].map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 py-1 px-2 rounded-md bg-muted/50"
            >
              <ValidationIcon severity={item.severity} />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-xs text-muted-foreground">{item.fieldKey ? t(`importConfig.fields.${item.fieldKey}`) : item.field}: </span>
                <span className="text-xs">
                  {"key" in item.message
                    ? t(`importConfig.validation.${item.message.key}`, item.message.values)
                    : item.message.text}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

interface ImportConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingInterfaces: string[];
  capabilities: WireGuardCapabilities | null;
}

export function ImportConfigModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterfaces,
}: ImportConfigModalProps) {
  const t = useTranslations("wireguardTools");
  const tc = useTranslations("common");
  const [step, setStep] = useState<1 | 2>(1);
  const [configText, setConfigText] = useState("");
  const [parsedConfig, setParsedConfig] = useState<ParsedConfig | null>(null);
  const [validationItems, setValidationItems] = useState<ValidationItem[]>([]);
  const [interfaceName, setInterfaceName] = useState("");
  const [peerNames, setPeerNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep(1);
    setConfigText("");
    setParsedConfig(null);
    setValidationItems([]);
    setInterfaceName("");
    setPeerNames([]);
    setImportError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const handleConfigChange = (text: string) => {
    setConfigText(text);
    if (text.trim()) {
      const parsed = parseWireGuardConfig(text);
      setParsedConfig(parsed);
      setValidationItems(validateConfig(parsed));
    } else {
      setParsedConfig(null);
      setValidationItems([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleConfigChange(ev.target?.result as string ?? "");
    reader.readAsText(file);
    e.target.value = "";
  };

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`wg${i}`)) i++;
    return `wg${i}`;
  };

  const handleNextStep = () => {
    if (!parsedConfig) return;
    setInterfaceName(getNextInterfaceName());
    setPeerNames(parsedConfig.peers.map((p, idx) => getSuggestedPeerName(p, idx)));
    setImportError(null);
    setStep(2);
  };

  const handleImport = async () => {
    if (!parsedConfig) return;
    setLoading(true);
    setImportError(null);
    try {
      await wireguardService.createInterface({
        name: interfaceName.trim(),
        addresses: parsedConfig.interface.addresses,
        port: parsedConfig.interface.listen_port,
        private_key: parsedConfig.interface.private_key,
        mtu: parsedConfig.interface.mtu,
        initial_peers: parsedConfig.peers
          .filter((p) => !!p.public_key)
          .map((peer, idx) => ({
            name: peerNames[idx].trim(),
            public_key: peer.public_key!,
            allowed_ips: peer.allowed_ips,
            preshared_key: peer.preshared_key,
            persistent_keepalive: peer.persistent_keepalive,
            address: peer.endpoint_address,
            port: peer.endpoint_port,
            host_name: peer.endpoint_hostname,
          })),
      });
      onSuccess();
      handleOpenChange(false);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t("importConfig.importFailed"));
    } finally {
      setLoading(false);
    }
  };

  const hasErrors = validationItems.some((v) => v.severity === "error");
  const canProceed = !!parsedConfig && !hasErrors && configText.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <div className="flex-shrink-0 px-6 pt-6 pb-3 pr-12 space-y-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("importConfig.title")}
            </DialogTitle>
            <DialogDescription>
              {step === 1
                ? t("importConfig.step1Description")
                : t("importConfig.step2Description")}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={step === 1 ? "text-primary font-semibold" : ""}>{t("importConfig.stepUpload")}</span>
            <ArrowRight className="h-3 w-3" />
            <span className={step === 2 ? "text-primary font-semibold" : ""}>{t("importConfig.stepPreview")}</span>
          </div>

          <Separator />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 pb-2">

        {step === 1 && (
          <div className="space-y-4">
            {/* Upload controls */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".conf,text/plain"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {t("importConfig.uploadFile")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("importConfig.orPasteBelow")}</span>
            </div>

            {/* Config textarea */}
            <div className="space-y-1">
              <Textarea
                placeholder={"[Interface]\nPrivateKey = ...\nAddress = 10.0.0.2/32\n\n[Peer]\nPublicKey = ...\nAllowedIPs = 0.0.0.0/0\nEndpoint = vpn.example.com:51820"}
                value={configText}
                onChange={(e) => handleConfigChange(e.target.value)}
                className="font-mono text-xs min-h-[180px] resize-none"
              />
            </div>

            {/* Validation results */}
            {validationItems.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t("importConfig.configCheck")}</Label>
                <ValidationPanel items={validationItems} />
              </div>
            )}

            {/* Empty state */}
            {configText.trim() === "" && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {t("importConfig.emptyHint")}
              </p>
            )}
          </div>
        )}

        {step === 2 && parsedConfig && (
          <div className="space-y-5">
              {/* Interface */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Network className="h-4 w-4 text-primary" />
                  {t("importConfig.interface")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iface-name" className="text-xs">
                    {t("importConfig.interfaceName")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="iface-name"
                    value={interfaceName}
                    onChange={(e) => setInterfaceName(e.target.value)}
                    placeholder="wg0"
                    className="font-mono"
                  />
                  {existingInterfaces.includes(interfaceName) && (
                    <p className="text-xs text-destructive">
                      {t("importConfig.interfaceExists", { name: interfaceName })}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs rounded-lg bg-muted/50 px-3 py-2">
                  <div className="flex items-center gap-2 py-1">
                    <Key className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-muted-foreground">{t("importConfig.privateKey")}</span>
                    {parsedConfig.interface.private_key ? (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-[10px] px-1">
                        {t("importConfig.configured")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-[10px] px-1">
                        {tc("notSet")}
                      </Badge>
                    )}
                  </div>
                  {parsedConfig.interface.addresses.map((addr, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <Network className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-muted-foreground">{t("importConfig.address")}</span>
                      <span className="font-mono">{addr}</span>
                    </div>
                  ))}
                  {parsedConfig.interface.listen_port && (
                    <div className="flex items-center gap-2 py-1">
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-muted-foreground">{t("importConfig.listenPort")}</span>
                      <span className="font-mono">{parsedConfig.interface.listen_port}</span>
                    </div>
                  )}
                  {parsedConfig.interface.mtu && (
                    <div className="flex items-center gap-2 py-1">
                      <span className="text-muted-foreground">MTU</span>
                      <span className="font-mono">{parsedConfig.interface.mtu}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Peers */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-purple-500" />
                  {t("importConfig.peerCount", { count: parsedConfig.peers.length })}
                </div>

                {parsedConfig.peers.map((peer, idx) => (
                  <div key={idx} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="space-y-1">
                      <Label htmlFor={`peer-name-${idx}`} className="text-xs">
                        {t("importConfig.peerName")} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`peer-name-${idx}`}
                        value={peerNames[idx] ?? ""}
                        onChange={(e) => {
                          const next = [...peerNames];
                          next[idx] = e.target.value;
                          setPeerNames(next);
                        }}
                        placeholder={`imported-peer-${idx + 1}`}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-y-1 text-xs text-muted-foreground">
                      {peer.public_key && (
                        <div className="flex items-start gap-2">
                          <Key className="h-3.5 w-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
                          <span className="font-mono truncate">{peer.public_key}</span>
                        </div>
                      )}
                      {peer.allowed_ips.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Network className="h-3.5 w-3.5 mt-0.5 text-green-500 flex-shrink-0" />
                          <span className="font-mono">{peer.allowed_ips.join(", ")}</span>
                        </div>
                      )}
                      {peer.raw_endpoint && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          <span className="font-mono">{peer.raw_endpoint}</span>
                        </div>
                      )}
                      {peer.persistent_keepalive && (
                        <div className="flex items-center gap-2">
                          <span>{t("importConfig.keepalive", { seconds: peer.persistent_keepalive })}</span>
                        </div>
                      )}
                      {peer.preshared_key && (
                        <div className="flex items-center gap-2">
                          <Key className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                          <span>{t("importConfig.pskConfigured")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Import error */}
              {importError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {importError}
                </div>
              )}
          </div>
        )}

          </div>
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-border">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button onClick={handleNextStep} disabled={!canProceed}>
                {t("importConfig.next")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                {t("importConfig.back")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  loading ||
                  !interfaceName.trim() ||
                  existingInterfaces.includes(interfaceName.trim()) ||
                  peerNames.some((n) => !n.trim())
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("importConfig.importing")}
                  </>
                ) : (
                  t("importConfig.importConfig")
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
