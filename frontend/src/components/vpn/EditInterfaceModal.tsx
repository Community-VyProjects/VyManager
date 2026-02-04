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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Settings,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import {
  wireguardService,
  WireGuardInterface,
  WireGuardCapabilities,
} from "@/lib/api/wireguard";

interface EditInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: WireGuardInterface | null;
  capabilities: WireGuardCapabilities | null;
}

export function EditInterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
  capabilities,
}: EditInterfaceModalProps) {
  // Form state
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState("");
  const [port, setPort] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [mtu, setMtu] = useState("");
  const [perClientThread, setPerClientThread] = useState(false);
  const [disabled, setDisabled] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [generatedPublicKey, setGeneratedPublicKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Populate form when interface data changes
  useEffect(() => {
    if (interfaceData && open) {
      setDescription(interfaceData.description || "");
      setAddresses(interfaceData.addresses.join(", "));
      setPort(interfaceData.port || "");
      setPrivateKey(interfaceData.private_key || "");
      setMtu(interfaceData.mtu || "");
      setPerClientThread(interfaceData.per_client_thread);
      setDisabled(interfaceData.disabled || false);
      setGeneratedPublicKey(null);
    }
  }, [interfaceData, open]);

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
        setError("Key generated but couldn't parse. Raw output: " + result.raw_output);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate keypair");
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
    setDescription("");
    setAddresses("");
    setPort("");
    setPrivateKey("");
    setMtu("");
    setPerClientThread(false);
    setDisabled(false);
    setError(null);
    setShowPrivateKey(false);
    setGeneratedPublicKey(null);
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      // Build config with changes
      const newConfig: any = {};

      // Description change
      if (description.trim() !== (interfaceData.description || "")) {
        newConfig.description = description.trim() || null;
      }

      // Addresses change
      const newAddresses = addresses
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const currentAddresses = interfaceData.addresses || [];
      if (JSON.stringify(newAddresses) !== JSON.stringify(currentAddresses)) {
        newConfig.addresses = newAddresses;
      }

      // Port change
      if (port.trim() !== (interfaceData.port || "")) {
        newConfig.port = port.trim() || null;
      }

      // Private key change (only if not masked)
      if (privateKey !== "***" && privateKey.trim() !== "") {
        newConfig.private_key = privateKey.trim();
      }

      // MTU change
      if (mtu.trim() !== (interfaceData.mtu || "")) {
        newConfig.mtu = mtu.trim() || null;
      }

      // Per-client thread change
      if (perClientThread !== interfaceData.per_client_thread) {
        newConfig.per_client_thread = perClientThread;
      }

      // Disabled change
      if (disabled !== (interfaceData.disabled || false)) {
        newConfig.disabled = disabled;
      }

      // Check if there are any changes
      if (Object.keys(newConfig).length === 0) {
        handleClose();
        return;
      }

      const result = await wireguardService.updateInterface(
        interfaceData.name,
        interfaceData,
        newConfig
      );

      if (result.success) {
        handleClose();
        onSuccess();
      } else {
        setError(result.error || "Failed to update interface");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update interface");
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Edit Interface: {interfaceData.name}
          </DialogTitle>
          <DialogDescription>
            Modify the WireGuard interface configuration.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Interface Status */}
            <div className={`flex items-center space-x-2 rounded-lg border p-3 ${disabled ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
              <Checkbox
                id="edit-disabled"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="edit-disabled" className="cursor-pointer">
                  Disable Interface
                </Label>
                <p className="text-xs text-muted-foreground">
                  When disabled, the interface will be inactive and all peers will be disconnected.
                </p>
              </div>
            </div>

            {/* Interface Name (read-only) */}
            <div className="space-y-2">
              <Label>Interface Name</Label>
              <Input value={interfaceData.name} disabled className="bg-muted" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VPN tunnel description"
              />
            </div>

            {/* Private Key */}
            <div className="space-y-2">
              <Label htmlFor="edit-privateKey">Private Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="edit-privateKey"
                    type={showPrivateKey ? "text" : "password"}
                    value={privateKey}
                    onChange={(e) => {
                      setPrivateKey(e.target.value);
                      setGeneratedPublicKey(null);
                    }}
                    placeholder="Leave as *** to keep current key"
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
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep as "***" to preserve existing key, or generate/enter a new one.
              </p>
            </div>

            {/* Show Public Key after generation */}
            {generatedPublicKey && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium text-green-600">
                    New Public Key (share with peers)
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
              <Label htmlFor="edit-addresses">Interface Addresses</Label>
              <Input
                id="edit-addresses"
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
              <Label htmlFor="edit-port">Listen Port</Label>
              <Input
                id="edit-port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="51820"
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* MTU */}
            <div className="space-y-2">
              <Label htmlFor="edit-mtu">MTU</Label>
              <Input
                id="edit-mtu"
                type="number"
                value={mtu}
                onChange={(e) => setMtu(e.target.value)}
                placeholder="1420"
              />
              <p className="text-xs text-muted-foreground">
                Maximum transmission unit. Leave empty for automatic.
              </p>
            </div>

            {/* Per-Client Thread */}
            {capabilities?.features.per_client_thread.supported && (
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <Checkbox
                  id="edit-perClientThread"
                  checked={perClientThread}
                  onCheckedChange={(checked) =>
                    setPerClientThread(checked === true)
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="edit-perClientThread" className="cursor-pointer">
                    Per-Client Thread
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {capabilities.features.per_client_thread.description}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

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
