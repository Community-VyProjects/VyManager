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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Key, Loader2, Copy, Check, Eye, EyeOff, Sparkles } from "lucide-react";
import { wireguardService, WireGuardCapabilities } from "@/lib/api/wireguard";
import { ApiError } from "@/lib/types/api";

interface CreateInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: WireGuardCapabilities | null;
  existingInterfaces: string[];
}

export function CreateInterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
}: CreateInterfaceModalProps) {
  // Form state
  const [name, setName] = useState("wg0");
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState("");
  const [port, setPort] = useState("51820");
  const [privateKey, setPrivateKey] = useState("");
  const [mtu, setMtu] = useState("");
  const [perClientThread, setPerClientThread] = useState(false);
  const [mssClamping, setMssClamping] = useState<string>("off");
  const [mssCustomValue, setMssCustomValue] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [generatedPublicKey, setGeneratedPublicKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate next available interface name
  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`wg${i}`)) {
      i++;
    }
    return `wg${i}`;
  };

  // Generate keypair
  const handleGenerateKey = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await wireguardService.generateKeypair();
      if (result.private_key) {
        setPrivateKey(result.private_key);
        setGeneratedPublicKey(result.public_key || null);
      } else if (result.raw_output) {
        // Try to parse from raw output
        setError("Key generated but couldn't parse. Raw output: " + result.raw_output);
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to generate keypair");
    } finally {
      setGenerating(false);
    }
  };

  // Copy public key to clipboard
  const handleCopyPublicKey = async () => {
    if (generatedPublicKey) {
      await navigator.clipboard.writeText(generatedPublicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Reset form
  const resetForm = () => {
    setName(getNextInterfaceName());
    setDescription("");
    setAddresses("");
    setPort("51820");
    setPrivateKey("");
    setMtu("");
    setPerClientThread(false);
    setMssClamping("off");
    setMssCustomValue("");
    setError(null);
    setShowPrivateKey(false);
    setGeneratedPublicKey(null);
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!name.trim()) {
      return "Interface name is required";
    }
    if (!/^wg\d+$/.test(name.trim())) {
      return "Interface name must be in format 'wg0', 'wg1', etc.";
    }
    if (existingInterfaces.includes(name.trim())) {
      return `Interface ${name} already exists`;
    }
    if (!privateKey.trim()) {
      return "Private key is required. Use 'Generate Key' to create one.";
    }
    return null;
  };

  // Handle submit
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config: Record<string, unknown> = {
        name: name.trim(),
        private_key: privateKey.trim(),
      };

      if (description.trim()) {
        config.description = description.trim();
      }

      if (addresses.trim()) {
        config.addresses = addresses
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean);
      }

      if (port.trim()) {
        config.port = port.trim();
      }

      if (mtu.trim()) {
        config.mtu = mtu.trim();
      }

      if (perClientThread && capabilities?.features.per_client_thread.supported) {
        config.per_client_thread = true;
      }
      if (mssClamping === "auto") {
        config.mss_clamping = "clamp-mss-to-pmtu";
      } else if (mssClamping === "custom" && mssCustomValue.trim()) {
        config.mss_clamping = mssCustomValue.trim();
      }

      const result = await wireguardService.createInterface(config as Parameters<typeof wireguardService.createInterface>[0]);

      if (result.success) {
        handleClose();
        onSuccess();
      } else {
        setError(result.error || "Failed to create interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create interface");
    } finally {
      setLoading(false);
    }
  };

  // Set initial name when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(getNextInterfaceName());
    } else {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Create WireGuard Interface
          </DialogTitle>
          <DialogDescription>
            Create a new WireGuard tunnel interface with encryption keys.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Interface Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Interface Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="wg0"
              />
              <p className="text-xs text-muted-foreground">
                Must be in format wg0, wg1, etc.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Main VPN tunnel"
              />
            </div>

            {/* Private Key */}
            <div className="space-y-2">
              <Label htmlFor="privateKey">Private Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="privateKey"
                    type={showPrivateKey ? "text" : "password"}
                    value={privateKey}
                    onChange={(e) => {
                      setPrivateKey(e.target.value);
                      setGeneratedPublicKey(null);
                    }}
                    placeholder="Base64 encoded private key"
                    className="pr-10 font-mono text-sm"
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
                  onClick={handleGenerateKey}
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
              <p className="text-xs text-muted-foreground">
                Generate a new keypair or paste an existing private key.
              </p>
            </div>

            {/* Show Public Key after generation */}
            {generatedPublicKey && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium text-green-600">
                    Public Key (share with peers)
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPublicKey}
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
                </div>
                <p className="font-mono text-xs text-green-700 break-all">
                  {generatedPublicKey}
                </p>
              </div>
            )}

            {/* Addresses */}
            <div className="space-y-2">
              <Label htmlFor="addresses">Interface Addresses (optional)</Label>
              <Input
                id="addresses"
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                placeholder="10.0.0.1/24, fd00::1/64"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of IP addresses with CIDR notation.
              </p>
            </div>

            {/* Listen Port */}
            <div className="space-y-2">
              <Label htmlFor="port">Listen Port</Label>
              <Input
                id="port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="51820"
              />
              <p className="text-xs text-muted-foreground">
                UDP port for incoming connections. Default: 51820
              </p>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* MTU */}
            <div className="space-y-2">
              <Label htmlFor="mtu">MTU (optional)</Label>
              <Input
                id="mtu"
                type="number"
                value={mtu}
                onChange={(e) => setMtu(e.target.value)}
                placeholder="1420"
              />
              <p className="text-xs text-muted-foreground">
                Maximum transmission unit. Default is automatic.
              </p>
            </div>

            {/* Per-Client Thread */}
            {capabilities?.features.per_client_thread.supported && (
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <Checkbox
                  id="perClientThread"
                  checked={perClientThread}
                  onCheckedChange={(checked) =>
                    setPerClientThread(checked === true)
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="perClientThread" className="cursor-pointer">
                    Per-Client Thread
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {capabilities.features.per_client_thread.description}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-lg border p-3">
              <Label>TCP MSS Clamping</Label>
              <Select value={mssClamping} onValueChange={setMssClamping}>
                <SelectTrigger>
                  <SelectValue placeholder="Disabled" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Disabled</SelectItem>
                  <SelectItem value="auto">Auto (clamp-mss-to-pmtu)</SelectItem>
                  <SelectItem value="custom">Custom value</SelectItem>
                </SelectContent>
              </Select>
              {mssClamping === "custom" && (
                <Input
                  type="number"
                  min={536}
                  max={65535}
                  placeholder="536–65535"
                  value={mssCustomValue}
                  onChange={(e) => setMssCustomValue(e.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                {mssClamping === "auto"
                  ? "Automatically sets MSS to the path MTU (clamp-mss-to-pmtu)."
                  : mssClamping === "custom"
                    ? "Set a specific TCP MSS value in bytes (536–65535)."
                    : "No MSS adjustment applied to this interface."}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* VyOS 1.4 peer requirement notice */}
        {capabilities?.features.peer_required_on_create?.supported && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              VyOS 1.4 requires at least one peer when creating an interface. Please use the <strong>Quick Setup Wizard</strong> instead, which creates an interface and peer together.
            </p>
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
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || capabilities?.features.peer_required_on_create?.supported}
          >
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
