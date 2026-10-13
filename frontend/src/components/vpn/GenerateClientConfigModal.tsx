"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
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
import {
  AlertCircle,
  Smartphone,
  Loader2,
  Copy,
  Check,
  Download,
  Sparkles,
  Eye,
  EyeOff,
  Key,
} from "lucide-react";
import { wireguardService, WireGuardInterface } from "@/lib/api/wireguard";
import { ApiError } from "@/lib/types/api";

interface GenerateClientConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: WireGuardInterface | null;
}

export function GenerateClientConfigModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: GenerateClientConfigModalProps) {
  const t = useTranslations("wireguardTools");
  const tc = useTranslations("common");
  // Form state
  const [clientName, setClientName] = useState("");
  const [serverEndpoint, setServerEndpoint] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPrivateKey, setClientPrivateKey] = useState("");
  const [clientPublicKey, setClientPublicKey] = useState("");
  const [dns, setDns] = useState("");

  // Server public key (fetched automatically)
  const [serverPublicKey, setServerPublicKey] = useState<string | null>(null);
  const [loadingServerKey, setLoadingServerKey] = useState(false);

  // Result state
  const [config, setConfig] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [step, setStep] = useState<"input" | "result">("input");

  // Auto-populate client address based on interface
  useEffect(() => {
    if (interfaceData && open) {
      // Try to generate next IP based on interface address
      if (interfaceData.addresses.length > 0) {
        const addr = interfaceData.addresses[0];
        const match = addr.match(/^(\d+\.\d+\.\d+\.)(\d+)(\/\d+)?$/);
        if (match) {
          // Suggest next IP in range
          const nextIp = parseInt(match[2]) + interfaceData.peer_count + 1;
          if (nextIp <= 254) {
            setClientAddress(`${match[1]}${nextIp}/32`);
          }
        }
      }
    }
  }, [interfaceData, open]);

  // Fetch server public key when modal opens
  useEffect(() => {
    const fetchServerPublicKey = async () => {
      if (!interfaceData || !open) return;

      setLoadingServerKey(true);
      try {
        const result = await wireguardService.getInterfacePublicKey(interfaceData.name);
        setServerPublicKey(result?.public_key || null);
      } catch {
        setServerPublicKey(null);
      } finally {
        setLoadingServerKey(false);
      }
    };

    fetchServerPublicKey();
  }, [interfaceData, open]);

  // Generate client keypair
  const handleGenerateClientKey = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await wireguardService.generateKeypair();
      if (result.private_key && result.public_key) {
        setClientPrivateKey(result.private_key);
        setClientPublicKey(result.public_key);
      } else {
        setError(t("generateClient.generateKeypairFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("generateClient.generateKeypairFailed"));
    } finally {
      setGenerating(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setClientName("");
    setServerEndpoint("");
    setClientAddress("");
    setClientPrivateKey("");
    setClientPublicKey("");
    setDns("");
    setServerPublicKey(null);
    setConfig(null);
    setError(null);
    setStep("input");
    setShowPrivateKey(false);
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!clientName.trim()) {
      return t("generateClient.validation.clientNameRequired");
    }
    if (/\s/.test(clientName.trim())) {
      return t("generateClient.validation.clientNameNoSpaces");
    }
    if (!serverEndpoint.trim()) {
      return t("generateClient.validation.serverEndpointRequired");
    }
    if (!clientAddress.trim()) {
      return t("generateClient.validation.clientAddressRequired");
    }
    if (!clientPublicKey.trim()) {
      return t("generateClient.validation.clientPublicKeyRequired");
    }
    if (!serverPublicKey) {
      return t("generateClient.validation.serverPublicKeyUnavailable");
    }
    return null;
  };

  // Build client config string
  const buildClientConfig = (serverPublicKey: string): string => {
    const serverPort = interfaceData?.port || "51820";
    const allowedIps = "0.0.0.0/0, ::/0"; // Route all traffic through VPN

    let interfaceSection = `[Interface]
PrivateKey = ${clientPrivateKey}
Address = ${clientAddress}`;

    // Add DNS if provided
    if (dns.trim()) {
      interfaceSection += `\nDNS = ${dns.trim()}`;
    }

    return `${interfaceSection}

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${serverEndpoint}:${serverPort}
AllowedIPs = ${allowedIps}
PersistentKeepalive = 25`;
  };

  // Handle generate
  const handleGenerate = async () => {
    if (!interfaceData) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create the peer on the server
      const peerResult = await wireguardService.createPeer(interfaceData.name, {
        name: clientName.trim(),
        public_key: clientPublicKey.trim(),
        allowed_ips: [clientAddress.trim()],
        persistent_keepalive: "25",
      });

      if (!peerResult.success) {
        throw new Error(peerResult.error || t("generateClient.createPeerFailed"));
      }

      // Build client config with the server's public key
      // Note: serverPublicKey was already validated in validateForm()
      const clientConfig = buildClientConfig(serverPublicKey!);

      setConfig(clientConfig);

      setStep("result");
      onSuccess(); // Refresh the interface list
    } catch (err) {
      setError((err as ApiError).message || t("generateClient.createConfigFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Copy config to clipboard
  const handleCopy = async () => {
    if (config) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(config);
        } else {
          // Fallback for non-HTTPS or older browsers
          const textArea = document.createElement("textarea");
          textArea.value = config;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  // Download config as file
  const handleDownload = () => {
    if (config) {
      const blob = new Blob([config], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientName.trim()}.conf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            {t("generateClient.title", { interface: interfaceData.name })}
          </DialogTitle>
          <DialogDescription>
            {step === "input"
              ? t("generateClient.inputDescription")
              : t("generateClient.resultDescription")}
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-4">
            {/* Client Name */}
            <div className="space-y-2">
              <Label htmlFor="config-client-name">{t("generateClient.clientName")}</Label>
              <Input
                id="config-client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="my-phone"
              />
              <p className="text-xs text-muted-foreground">
                {t("generateClient.clientNameHint")}
              </p>
            </div>

            {/* Client Keypair */}
            <div className="space-y-2">
              <Label>{t("generateClient.clientKeys")}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPrivateKey ? "text" : "password"}
                    value={clientPrivateKey}
                    onChange={(e) => setClientPrivateKey(e.target.value)}
                    placeholder={t("generateClient.privateKeyPlaceholder")}
                    className="pr-10 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                  >
                    {showPrivateKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateClientKey}
                  disabled={generating}
                  className="gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {t("generateClient.generate")}
                </Button>
              </div>
              {clientPublicKey && (
                <div className="rounded bg-muted p-2 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">{t("generateClient.publicKeyLabel")}</p>
                  <p className="font-mono text-xs break-all">{clientPublicKey}</p>
                </div>
              )}
            </div>

            {/* Server Endpoint */}
            <div className="space-y-2">
              <Label htmlFor="config-server">{t("generateClient.serverEndpoint")}</Label>
              <Input
                id="config-server"
                value={serverEndpoint}
                onChange={(e) => setServerEndpoint(e.target.value)}
                placeholder={t("generateClient.serverEndpointPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("generateClient.serverEndpointHint")}
              </p>
            </div>

            {/* Client Address */}
            <div className="space-y-2">
              <Label htmlFor="config-client-addr">{t("generateClient.clientAddress")}</Label>
              <Input
                id="config-client-addr"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="10.0.0.2/32"
              />
              <p className="text-xs text-muted-foreground">
                {t("generateClient.clientAddressHint")}
              </p>
            </div>

            {/* DNS Servers */}
            <div className="space-y-2">
              <Label htmlFor="config-dns">{t("generateClient.dnsServers")}</Label>
              <Input
                id="config-dns"
                value={dns}
                onChange={(e) => setDns(e.target.value)}
                placeholder="1.1.1.1, 8.8.8.8"
              />
              <p className="text-xs text-muted-foreground">
                {t("generateClient.dnsServersHint")}
              </p>
            </div>

            {/* Server Public Key Status */}
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("generateClient.serverPublicKey")}</span>
                {loadingServerKey ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {tc("loading")}
                  </span>
                ) : serverPublicKey ? (
                  <span className="text-xs text-green-600 ml-auto flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {t("generateClient.retrieved")}
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 ml-auto flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {t("generateClient.notAvailable")}
                  </span>
                )}
              </div>
              {serverPublicKey && (
                <p className="text-xs font-mono text-muted-foreground mt-2 truncate">
                  {serverPublicKey}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="rounded-lg border bg-white p-4">
                {config ? (
                  <QRCodeSVG value={config} size={192} level="H" />
                ) : (
                  <div className="h-48 w-48 flex items-center justify-center bg-muted rounded">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              {t("generateClient.scanQr")}
            </p>

            {/* Success Message */}
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
              <p className="text-sm text-green-700 font-medium">{t("generateClient.readyTitle")}</p>
              <p className="text-xs text-green-600 mt-1">
                {t("generateClient.readyDescription")}
              </p>
            </div>

            {/* Config Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("generateClient.configFile")}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 gap-1 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" />
                        {t("generateClient.copied")}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        {t("generateClient.copy")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="h-7 gap-1 text-xs"
                  >
                    <Download className="h-3 w-3" />
                    {t("generateClient.download")}
                  </Button>
                </div>
              </div>
              <pre className="rounded-lg bg-muted p-3 text-xs font-mono overflow-auto max-h-40">
                {config}
              </pre>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          {step === "input" ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={loading || loadingServerKey || !serverPublicKey}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tc("creating")}
                  </>
                ) : loadingServerKey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tc("loading")}
                  </>
                ) : (
                  t("generateClient.addClient")
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("input")}>
                {t("generateClient.addAnother")}
              </Button>
              <Button onClick={handleClose}>{t("generateClient.done")}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
