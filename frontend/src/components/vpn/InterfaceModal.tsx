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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Key,
  Settings,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import {
  wireguardService,
  WireGuardCapabilities,
  WireGuardInterface,
} from "@/lib/api/wireguard";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  buildInterfaceCreateConfig,
  buildInterfaceUpdateConfig,
  interfaceDraftFrom,
  validateInterfaceCreate,
  type InterfaceDraft,
} from "./wireguard-form";

interface InterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: WireGuardCapabilities | null;
  existingInterfaces: string[];
  existing?: WireGuardInterface | null;
}

export function InterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
  existing,
}: InterfaceModalProps) {
  const isEdit = modalIsEdit(existing);

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
  const [disabled, setDisabled] = useState(false);

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
    setDisabled(false);
    setError(null);
    setShowPrivateKey(false);
    setGeneratedPublicKey(null);
  };

  // Populate form from the interface being edited
  const populateForm = (interfaceData: WireGuardInterface) => {
    const draft = interfaceDraftFrom(interfaceData);
    setName(draft.name);
    setDescription(draft.description);
    setAddresses(draft.addresses);
    setPort(draft.port);
    setPrivateKey(draft.privateKey);
    setMtu(draft.mtu);
    setPerClientThread(draft.perClientThread);
    setMssClamping(draft.mssClamping);
    setMssCustomValue(draft.mssCustomValue);
    setDisabled(draft.disabled);
    setError(null);
    setShowPrivateKey(false);
    setGeneratedPublicKey(null);
  };

  useEffect(() => {
    if (!open) return;
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  const lockedName = lockedIdentity(existing, (i) => i.name, name);

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

  // Handle close
  const handleClose = () => {
    onOpenChange(false);
  };

  // Current form state as the plain draft the submit builders consume.
  const draft = (): InterfaceDraft => ({
    name,
    description,
    addresses,
    port,
    privateKey,
    mtu,
    perClientThread,
    mssClamping,
    mssCustomValue,
    disabled,
  });

  // Validate create-only identity rules
  const validateCreate = (): string | null =>
    validateInterfaceCreate(draft(), existingInterfaces);

  const submitCreate = async () => {
    const config = buildInterfaceCreateConfig(
      draft(),
      !!capabilities?.features.per_client_thread.supported,
    );
    return wireguardService.createInterface(config);
  };

  // Only the fields the operator actually changed are sent, so an untouched
  // leaf is never rewritten and a cleared one is deleted.
  const submitUpdate = async (current: WireGuardInterface, targetName: string) => {
    const newConfig = buildInterfaceUpdateConfig(draft(), current);

    // Nothing changed: no write to send.
    if (newConfig === null) {
      return null;
    }

    return wireguardService.updateInterface(targetName, current, newConfig);
  };

  // Handle submit
  const handleSubmit = async () => {
    const write = modalWriteKind(existing);

    if (write.kind === "create") {
      const validationError = validateCreate();
      if (validationError) {
        setError(validationError);
        return;
      }
    } else if (!existing) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitUpdate(existing, write.name)
          : await submitCreate();

      if (result === null) {
        handleClose();
        return;
      }

      if (result.success) {
        handleClose();
        onSuccess();
      } else {
        setError(
          result.error ||
            (isEdit ? "Failed to update interface" : "Failed to create interface")
        );
      }
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit ? "Failed to update interface" : "Failed to create interface")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <Settings className="h-5 w-5 text-primary" />
            ) : (
              <Key className="h-5 w-5 text-primary" />
            )}
            {isEdit ? `Edit Interface: ${existing.name}` : "Create WireGuard Interface"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modify the WireGuard interface configuration. Interface name cannot be changed."
              : "Create a new WireGuard tunnel interface with encryption keys."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Interface Status */}
            {isEdit && (
              <div className={`flex items-center space-x-2 rounded-lg border p-3 ${disabled ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                <Checkbox
                  id="wg-disabled"
                  checked={disabled}
                  onCheckedChange={(checked) => setDisabled(checked === true)}
                />
                <div className="flex-1">
                  <Label htmlFor="wg-disabled" className="cursor-pointer">
                    Disable Interface
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When disabled, the interface will be inactive and all peers will be disconnected.
                  </p>
                </div>
              </div>
            )}

            {/* Interface Name */}
            <div className="space-y-2">
              <Label htmlFor="wg-name">Interface Name</Label>
              <Input
                id="wg-name"
                value={lockedName.value}
                onChange={(e) => setName(e.target.value)}
                placeholder="wg0"
                disabled={lockedName.disabled}
                className={lockedName.disabled ? "bg-muted" : undefined}
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Interface name cannot be changed."
                  : "Must be in format wg0, wg1, etc."}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="wg-description">Description (optional)</Label>
              <Input
                id="wg-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Main VPN tunnel"
              />
            </div>

            {/* Private Key */}
            <div className="space-y-2">
              <Label htmlFor="wg-privateKey">Private Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="wg-privateKey"
                    type={showPrivateKey ? "text" : "password"}
                    value={privateKey}
                    onChange={(e) => {
                      setPrivateKey(e.target.value);
                      setGeneratedPublicKey(null);
                    }}
                    placeholder={
                      isEdit
                        ? "Leave as *** to keep current key"
                        : "Base64 encoded private key"
                    }
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
                  {isEdit ? "Regenerate" : "Generate"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Keep as \u201c***\u201d to preserve existing key, or generate/enter a new one."
                  : "Generate a new keypair or paste an existing private key."}
              </p>
            </div>

            {/* Show Public Key after generation */}
            {generatedPublicKey && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium text-green-600">
                    {isEdit
                      ? "New Public Key (share with peers)"
                      : "Public Key (share with peers)"}
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
              <Label htmlFor="wg-addresses">
                {isEdit ? "Interface Addresses" : "Interface Addresses (optional)"}
              </Label>
              <Input
                id="wg-addresses"
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
              <Label htmlFor="wg-port">Listen Port</Label>
              <Input
                id="wg-port"
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
              <Label htmlFor="wg-mtu">MTU (optional)</Label>
              <Input
                id="wg-mtu"
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
                  id="wg-perClientThread"
                  checked={perClientThread}
                  onCheckedChange={(checked) =>
                    setPerClientThread(checked === true)
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="wg-perClientThread" className="cursor-pointer">
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

        {/* Peer requirement notice */}
        {!isEdit && capabilities?.features.peer_required_on_create?.supported && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              This device requires at least one peer when creating an interface. Please use the <strong>Quick Setup Wizard</strong> instead, which creates an interface and peer together.
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
            disabled={
              loading ||
              (!isEdit && !!capabilities?.features.peer_required_on_create?.supported)
            }
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving..." : "Creating..."}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
