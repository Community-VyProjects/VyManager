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
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

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
        setError("Failed to generate keypair");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to generate keypair");
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
    setQrDataUrl(null);
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
      return "Client name is required";
    }
    if (/\s/.test(clientName.trim())) {
      return "Client name cannot contain spaces";
    }
    if (!serverEndpoint.trim()) {
      return "Server endpoint is required";
    }
    if (!clientAddress.trim()) {
      return "Client address is required";
    }
    if (!clientPublicKey.trim()) {
      return "Client public key is required. Generate a keypair first.";
    }
    if (!serverPublicKey) {
      return "Server public key not available. Ensure the interface has a private key configured.";
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
        throw new Error(peerResult.error || "Failed to create peer on server");
      }

      // Build client config with the server's public key
      // Note: serverPublicKey was already validated in validateForm()
      const clientConfig = buildClientConfig(serverPublicKey!);

      setConfig(clientConfig);

      // Generate QR code
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        clientConfig
      )}`;
      setQrDataUrl(qrUrl);

      setStep("result");
      onSuccess(); // Refresh the interface list
    } catch (err) {
      setError((err as ApiError).message || "Failed to create client configuration");
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
            Add Client to {interfaceData.name}
          </DialogTitle>
          <DialogDescription>
            {step === "input"
              ? "Generate keys and add a new client peer to this interface."
              : "Your client has been added! Copy the configuration below."}
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-4">
            {/* Client Name */}
            <div className="space-y-2">
              <Label htmlFor="config-client-name">Client Name</Label>
              <Input
                id="config-client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="my-phone"
              />
              <p className="text-xs text-muted-foreground">
                A name to identify this client (used as peer name).
              </p>
            </div>

            {/* Client Keypair */}
            <div className="space-y-2">
              <Label>Client Keys</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPrivateKey ? "text" : "password"}
                    value={clientPrivateKey}
                    onChange={(e) => setClientPrivateKey(e.target.value)}
                    placeholder="Generate or enter private key"
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
                  Generate
                </Button>
              </div>
              {clientPublicKey && (
                <div className="rounded bg-muted p-2 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Public Key:</p>
                  <p className="font-mono text-xs break-all">{clientPublicKey}</p>
                </div>
              )}
            </div>

            {/* Server Endpoint */}
            <div className="space-y-2">
              <Label htmlFor="config-server">Server Endpoint</Label>
              <Input
                id="config-server"
                value={serverEndpoint}
                onChange={(e) => setServerEndpoint(e.target.value)}
                placeholder="vpn.example.com or public IP"
              />
              <p className="text-xs text-muted-foreground">
                The public IP or hostname clients will connect to.
              </p>
            </div>

            {/* Client Address */}
            <div className="space-y-2">
              <Label htmlFor="config-client-addr">Client IP Address</Label>
              <Input
                id="config-client-addr"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="10.0.0.2/32"
              />
              <p className="text-xs text-muted-foreground">
                The IP address to assign to the client on the VPN.
              </p>
            </div>

            {/* DNS Servers */}
            <div className="space-y-2">
              <Label htmlFor="config-dns">DNS Servers (Optional)</Label>
              <Input
                id="config-dns"
                value={dns}
                onChange={(e) => setDns(e.target.value)}
                placeholder="1.1.1.1, 8.8.8.8"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated DNS servers for the client to use when connected.
              </p>
            </div>

            {/* Server Public Key Status */}
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Server Public Key</span>
                {loadingServerKey ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </span>
                ) : serverPublicKey ? (
                  <span className="text-xs text-green-600 ml-auto flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Retrieved
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 ml-auto flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Not available
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
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="WireGuard QR Code"
                    className="h-48 w-48"
                  />
                ) : (
                  <div className="h-48 w-48 flex items-center justify-center bg-muted rounded">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Scan this QR code with the WireGuard app.
            </p>

            {/* Success Message */}
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
              <p className="text-sm text-green-700 font-medium">Ready to Use</p>
              <p className="text-xs text-green-600 mt-1">
                This configuration is complete and ready to import into the WireGuard app.
                The server public key has been automatically included.
              </p>
            </div>

            {/* Config Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Configuration File</Label>
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
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
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
                    Download
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
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={loading || loadingServerKey || !serverPublicKey}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : loadingServerKey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Add Client"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("input")}>
                Add Another
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
