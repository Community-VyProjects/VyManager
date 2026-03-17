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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Wand2,
  Loader2,
  Check,
  Copy,
  ArrowRight,
  ArrowLeft,
  Server,
  Users,
  Sparkles,
  ShieldCheck,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { wireguardService, WireGuardCapabilities } from "@/lib/api/wireguard";
import { ApiError } from "@/lib/types/api";

interface QuickSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: WireGuardCapabilities | null;
  existingInterfaces: string[];
  existingPorts: string[];
}

type WizardStep = "welcome" | "server" | "client" | "complete";

interface SetupResult {
  interfaceName: string;
  interfaceAddress: string;
  port: string;
  serverPublicKey: string;
  serverPrivateKey: string;
  clientConfig?: string;
  clientName?: string;
  clientPublicKey?: string;
}

export function QuickSetupWizard({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
  existingPorts,
}: QuickSetupWizardProps) {
  // Wizard state
  const [step, setStep] = useState<WizardStep>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server config
  const [interfaceName, setInterfaceName] = useState("wg0");
  const [serverAddress, setServerAddress] = useState("10.10.0.1/24");
  const [listenPort, setListenPort] = useState("51820");
  const [publicEndpoint, setPublicEndpoint] = useState("");

  // Client config
  const [createClient, setCreateClient] = useState(true);
  const [clientName, setClientName] = useState("my-device");
  const [clientAddress, setClientAddress] = useState("10.10.0.2/32");

  // Result
  const [result, setResult] = useState<SetupResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<"server" | "client" | null>(null);
  const [showServerKey, setShowServerKey] = useState(false);

  // Get next available interface name (finds gaps like wg0, wg1, wg3 -> wg2)
  const getNextInterfaceName = (): string => {
    // Extract numbers from existing interfaces (e.g., "wg0" -> 0, "wg1" -> 1)
    const usedNumbers = existingInterfaces
      .filter((name) => /^wg\d+$/.test(name))
      .map((name) => parseInt(name.replace("wg", "")))
      .sort((a, b) => a - b);

    // Find the first gap or next number
    let nextNum = 0;
    for (const num of usedNumbers) {
      if (num === nextNum) {
        nextNum++;
      } else if (num > nextNum) {
        break; // Found a gap
      }
    }
    return `wg${nextNum}`;
  };

  // Get next available port (finds gaps like 51820, 51821, 51823 -> 51822)
  const getNextPort = (): string => {
    const basePort = 51820;
    // Extract port numbers as integers
    const usedPorts = existingPorts
      .map((p) => parseInt(p))
      .filter((p) => !isNaN(p) && p >= basePort)
      .sort((a, b) => a - b);

    // Find the first gap or next number starting from basePort
    let nextPort = basePort;
    for (const port of usedPorts) {
      if (port === nextPort) {
        nextPort++;
      } else if (port > nextPort) {
        break; // Found a gap
      }
    }
    return String(nextPort);
  };

  // Reset all form state
  const resetForm = () => {
    setStep("welcome");
    setLoading(false);
    setError(null);
    setServerAddress("10.10.0.1/24");
    setPublicEndpoint("");
    setCreateClient(true);
    setClientName("my-device");
    setClientAddress("10.10.0.2/32");
    setResult(null);
    setQrDataUrl(null);
    setCopied(null);
    setShowServerKey(false);
  };

  // Initialize when opening
  const handleOpen = (newOpen: boolean) => {
    if (newOpen) {
      // Reset everything first
      resetForm();
      // Then set the next available values
      setInterfaceName(getNextInterfaceName());
      setListenPort(getNextPort());
    }
    onOpenChange(newOpen);
  };

  // Get progress percentage
  const getProgress = (): number => {
    switch (step) {
      case "welcome":
        return 0;
      case "server":
        return 33;
      case "client":
        return 66;
      case "complete":
        return 100;
    }
  };

  // Validate server step
  const validateServerStep = (): string | null => {
    if (!interfaceName.trim()) {
      return "Interface name is required";
    }
    if (!/^wg\d+$/.test(interfaceName.trim())) {
      return "Interface name must be in format 'wg0', 'wg1', etc.";
    }
    if (existingInterfaces.includes(interfaceName.trim())) {
      return `Interface ${interfaceName} already exists`;
    }
    if (!serverAddress.trim()) {
      return "Server address is required";
    }
    if (!listenPort.trim()) {
      return "Listen port is required";
    }
    // Check if port is already in use
    if (existingPorts.includes(listenPort.trim())) {
      return `Port ${listenPort} is already in use by another WireGuard interface`;
    }
    if (createClient && !publicEndpoint.trim()) {
      return "Public endpoint is required for client configuration";
    }
    return null;
  };

  // Validate client step
  const validateClientStep = (): string | null => {
    if (createClient) {
      if (!clientName.trim()) {
        return "Client name is required";
      }
      if (/\s/.test(clientName.trim())) {
        return "Client name cannot contain spaces";
      }
      if (!clientAddress.trim()) {
        return "Client address is required";
      }
    }
    return null;
  };

  // Build client config string
  const buildClientConfig = (
    serverPublicKey: string,
    clientPrivateKey: string
  ): string => {
    const allowedIps = "0.0.0.0/0, ::/0";

    return `[Interface]
PrivateKey = ${clientPrivateKey}
Address = ${clientAddress}

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${publicEndpoint}:${listenPort}
AllowedIPs = ${allowedIps}
PersistentKeepalive = 25`;
  };

  // Run the setup
  const runSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Generate server keypair
      const serverKeypair = await wireguardService.generateKeypair();
      if (!serverKeypair.private_key || !serverKeypair.public_key) {
        throw new Error("Failed to generate server keypair");
      }

      // Step 2: Create interface
      const interfaceResult = await wireguardService.createInterface({
        name: interfaceName.trim(),
        private_key: serverKeypair.private_key,
        addresses: [serverAddress.trim()],
        port: listenPort.trim(),
      });

      if (!interfaceResult.success) {
        throw new Error(interfaceResult.error || "Failed to create interface");
      }

      const setupResult: SetupResult = {
        interfaceName: interfaceName.trim(),
        interfaceAddress: serverAddress.trim(),
        port: listenPort.trim(),
        serverPublicKey: serverKeypair.public_key,
        serverPrivateKey: serverKeypair.private_key,
      };

      // Step 3: Create client if requested
      if (createClient) {
        // Generate client keypair
        const clientKeypair = await wireguardService.generateKeypair();
        if (!clientKeypair.private_key || !clientKeypair.public_key) {
          throw new Error("Failed to generate client keypair");
        }

        // Create peer on server
        const peerResult = await wireguardService.createPeer(
          interfaceName.trim(),
          {
            name: clientName.trim(),
            public_key: clientKeypair.public_key,
            allowed_ips: [clientAddress.trim()],
            persistent_keepalive: "25",
          }
        );

        if (!peerResult.success) {
          // Interface created but peer failed - still show result
          console.error("Failed to create peer:", peerResult.error);
        } else {
          // Build client config
          const clientConfig = buildClientConfig(
            serverKeypair.public_key,
            clientKeypair.private_key
          );

          setupResult.clientConfig = clientConfig;
          setupResult.clientName = clientName.trim();
          setupResult.clientPublicKey = clientKeypair.public_key;

          // Generate QR code
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
            clientConfig
          )}`;
          setQrDataUrl(qrUrl);
        }
      }

      setResult(setupResult);
      setStep("complete");
    } catch (err) {
      setError((err as ApiError).message || "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle next step
  const handleNext = async () => {
    setError(null);

    if (step === "welcome") {
      setStep("server");
    } else if (step === "server") {
      const validationError = validateServerStep();
      if (validationError) {
        setError(validationError);
        return;
      }
      if (createClient) {
        setStep("client");
      } else {
        await runSetup();
      }
    } else if (step === "client") {
      const validationError = validateClientStep();
      if (validationError) {
        setError(validationError);
        return;
      }
      await runSetup();
    }
  };

  // Handle back
  const handleBack = () => {
    setError(null);
    if (step === "server") {
      setStep("welcome");
    } else if (step === "client") {
      setStep("server");
    }
  };

  // Handle close
  const handleClose = () => {
    if (step === "complete") {
      onSuccess();
    }
    handleOpen(false);
  };

  // Copy to clipboard
  const handleCopy = async (type: "server" | "client") => {
    const text =
      type === "server" ? result?.serverPublicKey : result?.clientConfig;
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  // Download client config
  const handleDownloadConfig = () => {
    if (result?.clientConfig && result?.clientName) {
      const blob = new Blob([result.clientConfig], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.clientName}.conf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Quick Setup Wizard
          </DialogTitle>
          <DialogDescription>
            {step === "welcome" && "Set up a WireGuard VPN server in minutes."}
            {step === "server" && "Configure your WireGuard server."}
            {step === "client" && "Configure your first client device."}
            {step === "complete" && "Your WireGuard VPN is ready!"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <Progress value={getProgress()} className="h-1" />

        {/* Welcome Step */}
        {step === "welcome" && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-6 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Let's set up your WireGuard VPN
              </h3>
              <p className="text-sm text-muted-foreground">
                This wizard will guide you through creating a secure VPN tunnel.
                We'll generate encryption keys automatically and configure
                everything for you.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Server className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Server Setup</p>
                  <p className="text-xs text-muted-foreground">
                    Create a WireGuard interface with secure encryption keys.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Client Configuration</p>
                  <p className="text-xs text-muted-foreground">
                    Generate a ready-to-use config for your first device.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Secure by Default</p>
                  <p className="text-xs text-muted-foreground">
                    Modern cryptography with perfect forward secrecy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Server Step */}
        {step === "server" && (
          <div className="space-y-4 py-2">
            {/* Interface Name */}
            <div className="space-y-2">
              <Label htmlFor="wizard-interface">Interface Name</Label>
              <Input
                id="wizard-interface"
                value={interfaceName}
                onChange={(e) => setInterfaceName(e.target.value)}
                placeholder="wg0"
              />
            </div>

            {/* Server Address */}
            <div className="space-y-2">
              <Label htmlFor="wizard-server-addr">VPN Network Address</Label>
              <Input
                id="wizard-server-addr"
                value={serverAddress}
                onChange={(e) => setServerAddress(e.target.value)}
                placeholder="10.10.0.1/24"
              />
              <p className="text-xs text-muted-foreground">
                The server's address on the VPN network. Use a private range.
              </p>
            </div>

            {/* Listen Port */}
            <div className="space-y-2">
              <Label htmlFor="wizard-port">Listen Port</Label>
              <Input
                id="wizard-port"
                type="number"
                value={listenPort}
                onChange={(e) => setListenPort(e.target.value)}
                placeholder="51820"
              />
            </div>

            {/* Create Client Option */}
            <div className="flex items-center space-x-2 rounded-lg border p-3">
              <Checkbox
                id="wizard-create-client"
                checked={createClient}
                onCheckedChange={(checked) => setCreateClient(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="wizard-create-client" className="cursor-pointer">
                  Create a client configuration
                </Label>
                <p className="text-xs text-muted-foreground">
                  Generate a config file and QR code for your first device.
                </p>
              </div>
            </div>

            {/* Public Endpoint (only if creating client) */}
            {createClient && (
              <div className="space-y-2">
                <Label htmlFor="wizard-endpoint">
                  Public Endpoint (for clients)
                </Label>
                <Input
                  id="wizard-endpoint"
                  value={publicEndpoint}
                  onChange={(e) => setPublicEndpoint(e.target.value)}
                  placeholder="vpn.example.com or your public IP"
                />
                <p className="text-xs text-muted-foreground">
                  The public IP or hostname clients will connect to.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Client Step */}
        {step === "client" && (
          <div className="space-y-4 py-2">
            {/* Client Name */}
            <div className="space-y-2">
              <Label htmlFor="wizard-client-name">Client Name</Label>
              <Input
                id="wizard-client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="my-phone"
              />
              <p className="text-xs text-muted-foreground">
                A friendly name for this client device.
              </p>
            </div>

            {/* Client Address */}
            <div className="space-y-2">
              <Label htmlFor="wizard-client-addr">Client IP Address</Label>
              <Input
                id="wizard-client-addr"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="10.10.0.2/32"
              />
              <p className="text-xs text-muted-foreground">
                The IP address to assign to this client on the VPN.
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 border p-3">
              <p className="text-sm text-muted-foreground">
                We'll generate a complete configuration file that you can import
                into the WireGuard app or scan as a QR code.
              </p>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === "complete" && result && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-center">
              <Check className="h-10 w-10 mx-auto text-green-600 mb-2" />
              <h3 className="font-semibold text-green-700">Setup Complete!</h3>
              <p className="text-sm text-green-600">
                Your WireGuard VPN is configured and ready to use.
              </p>
            </div>

            {/* Server Info */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Server className="h-4 w-4" />
                Server Details
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Interface:</span>
                <span className="font-mono">{result.interfaceName}</span>
                <span className="text-muted-foreground">Address:</span>
                <span className="font-mono">{result.interfaceAddress}</span>
                <span className="text-muted-foreground">Port:</span>
                <span className="font-mono">{result.port}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    Server Public Key
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy("server")}
                    className="h-6 gap-1 text-xs"
                  >
                    {copied === "server" ? (
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
                </div>
                <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                  {result.serverPublicKey}
                </p>
              </div>
            </div>

            {/* Client Config */}
            {result.clientConfig && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Client: {result.clientName}
                </h4>

                {/* QR Code */}
                {qrDataUrl && (
                  <div className="flex justify-center">
                    <div className="rounded-lg border bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrDataUrl}
                        alt="WireGuard QR Code"
                        className="h-48 w-48"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy("client")}
                    className="gap-2"
                  >
                    {copied === "client" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy Config
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadConfig}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Scan the QR code or download the config file to set up your
                  device.
                </p>
              </div>
            )}
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
          {step !== "welcome" && step !== "complete" && (
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          {step === "complete" ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <Button onClick={handleNext} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : step === "welcome" ? (
                <>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : step === "client" || (step === "server" && !createClient) ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create VPN
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
