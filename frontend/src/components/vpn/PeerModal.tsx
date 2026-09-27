"use client";

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  UserPlus,
  UserCog,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Ban,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  wireguardService,
  WireGuardInterface,
  WireGuardPeer,
} from "@/lib/api/wireguard";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  buildPeerCreateConfig,
  buildPeerUpdateConfig,
  peerDraftFrom,
  validatePeer,
  type PeerDraft,
} from "./wireguard-form";

interface PeerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: WireGuardInterface | null;
  existing?: WireGuardPeer | null;
}

export function PeerModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
  existing,
}: PeerModalProps) {
  const t = useTranslations("wireguard");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);

  // Form state
  const [name, setName] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [allowedIps, setAllowedIps] = useState("");
  const [presharedKey, setPresharedKey] = useState("");
  const [address, setAddress] = useState("");
  const [port, setPort] = useState("");
  const [persistentKeepalive, setPersistentKeepalive] = useState("");
  const [description, setDescription] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [hostName, setHostName] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPresharedKey, setShowPresharedKey] = useState(false);

  // Reset form
  const resetForm = () => {
    setName("");
    setPublicKey("");
    setAllowedIps("");
    setPresharedKey("");
    setAddress("");
    setPort("");
    setPersistentKeepalive("");
    setDescription("");
    setDisabled(false);
    setHostName("");
    setError(null);
    setShowPresharedKey(false);
  };

  // Populate form from the peer being edited
  const populateForm = (peerData: WireGuardPeer) => {
    const draft = peerDraftFrom(peerData);
    setName(draft.name);
    setPublicKey(draft.publicKey);
    setAllowedIps(draft.allowedIps);
    setPresharedKey(draft.presharedKey);
    setAddress(draft.address);
    setPort(draft.port);
    setPersistentKeepalive(draft.persistentKeepalive);
    setDescription(draft.description);
    setDisabled(draft.disabled);
    setHostName(draft.hostName);
    setError(null);
    setShowPresharedKey(false);
  };

  useEffect(() => {
    if (!open) return;
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
  }, [open, existing]);

  const lockedName = lockedIdentity(existing, (p) => p.name, name);

  // Generate preshared key
  const handleGeneratePSK = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await wireguardService.generatePSK();
      if (result.preshared_key) {
        setPresharedKey(result.preshared_key);
      }
    } catch (err) {
      setError((err as ApiError).message || t("peerModal.generatePskFailed"));
    } finally {
      setGenerating(false);
    }
  };

  // Handle close
  const handleClose = () => {
    onOpenChange(false);
  };

  // Current form state as the plain draft the submit builders consume.
  const draft = (): PeerDraft => ({
    name,
    publicKey,
    allowedIps,
    presharedKey,
    address,
    port,
    persistentKeepalive,
    description,
    disabled,
    hostName,
  });

  // Create checks the identity fields the operator can only set once; both
  // modes check the fields VyOS requires on a peer.
  const validate = (isCreate: boolean): string | null => {
    const error = validatePeer(draft(), {
      isCreate,
      existingPeerNames: interfaceData?.peers.map((p) => p.name) ?? [],
    });
    return error && t(`validation.${error}`, { name: draft().name });
  };

  const submitCreate = async (target: WireGuardInterface) =>
    wireguardService.createPeer(target.name, buildPeerCreateConfig(draft()));

  // Only the fields the operator actually changed are sent, so an untouched
  // leaf is never rewritten and a cleared one is deleted.
  const submitUpdate = async (
    target: WireGuardInterface,
    current: WireGuardPeer,
    peerName: string
  ) => {
    const newConfig = buildPeerUpdateConfig(draft(), current);

    // Nothing changed: no write to send.
    if (newConfig === null) {
      return null;
    }

    return wireguardService.updatePeer(target.name, peerName, current, newConfig);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!interfaceData) return;

    const write = modalWriteKind(existing);

    if (write.kind === "update" && !existing) {
      return;
    }

    const validationError = validate(write.kind === "create");
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitUpdate(interfaceData, existing, write.name)
          : await submitCreate(interfaceData);

      if (result === null) {
        handleClose();
        return;
      }

      if (result.success) {
        handleClose();
        onSuccess();
      } else {
        setError(result.error || (isEdit ? t("peerModal.updateFailed") : t("peerModal.addFailed")));
      }
    } catch (err) {
      setError(
        (err as ApiError).message || (isEdit ? t("peerModal.updateFailed") : t("peerModal.addFailed"))
      );
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
            {isEdit ? (
              <UserCog className="h-5 w-5 text-primary" />
            ) : (
              <UserPlus className="h-5 w-5 text-primary" />
            )}
            {isEdit ? t("peerModal.editTitle", { name: existing.name }) : t("peerModal.addTitle", { interface: interfaceData.name })}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("peerModal.editDescription", { interface: interfaceData.name })
              : t("peerModal.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">{t("peerModal.tabBasic")}</TabsTrigger>
            <TabsTrigger value="endpoint">{t("peerModal.tabEndpoint")}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Peer Name */}
            <div className="space-y-2">
              <Label htmlFor="peer-name">{t("peerModal.peerName")}</Label>
              <Input
                id="peer-name"
                value={lockedName.value}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-laptop"
                disabled={lockedName.disabled}
                className={lockedName.disabled ? "bg-muted" : undefined}
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? t("peerModal.nameLocked")
                  : t("peerModal.nameHint")}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="peer-description">
                {isEdit ? tc("description") : t("peerModal.descriptionOptional")}
              </Label>
              <Input
                id="peer-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isEdit ? t("peerModal.descriptionPlaceholderEdit") : t("peerModal.descriptionPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("peerModal.descriptionHint")}
              </p>
            </div>

            {/* Public Key */}
            <div className="space-y-2">
              <Label htmlFor="peer-public-key">{t("peerModal.publicKey")}</Label>
              <Input
                id="peer-public-key"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder={
                  isEdit ? t("peerModal.publicKeyPlaceholderEdit") : t("peerModal.publicKeyPlaceholder")
                }
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? t("peerModal.publicKeyHintEdit")
                  : t("peerModal.publicKeyHint")}
              </p>
            </div>

            {/* Allowed IPs */}
            <div className="space-y-2">
              <Label htmlFor="peer-allowed-ips">{t("peerModal.allowedIps")}</Label>
              <Input
                id="peer-allowed-ips"
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                placeholder="10.0.0.2/32, 192.168.1.0/24"
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? t("peerModal.allowedIpsHintEdit")
                  : t("peerModal.allowedIpsHint")}
              </p>
            </div>

            {/* Preshared Key */}
            <div className="space-y-2">
              <Label htmlFor="peer-psk">
                {isEdit ? t("peerModal.presharedKey") : t("peerModal.presharedKeyOptional")}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="peer-psk"
                    type={showPresharedKey ? "text" : "password"}
                    value={presharedKey}
                    onChange={(e) => setPresharedKey(e.target.value)}
                    placeholder={
                      isEdit
                        ? t("peerModal.keepKeyPlaceholder")
                        : t("peerModal.pskPlaceholder")
                    }
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPresharedKey(!showPresharedKey)}
                  >
                    {showPresharedKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePSK}
                  disabled={generating}
                  className="gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {presharedKey === "***" ? t("peerModal.replace") : t("peerModal.generate")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? t("peerModal.pskHintEdit")
                  : t("peerModal.pskHint")}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="endpoint" className="space-y-4 mt-4">
            {!isEdit && (
              <div className="rounded-lg bg-muted/50 border p-3 mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("peerModal.endpointNotice")}
                </p>
              </div>
            )}

            {/* Endpoint Address (IP) */}
            <div className="space-y-2">
              <Label htmlFor="peer-address">{t("peerModal.endpointAddress")}</Label>
              <Input
                id="peer-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="203.0.113.1"
              />
              <p className="text-xs text-muted-foreground">
                {t("peerModal.endpointAddressHint")}
              </p>
            </div>

            {/* Endpoint Hostname */}
            <div className="space-y-2">
              <Label htmlFor="peer-hostname">{t("peerModal.endpointHostname")}</Label>
              <Input
                id="peer-hostname"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="vpn.example.com"
              />
              <p className="text-xs text-muted-foreground">
                {t("peerModal.endpointHostnameHint")}
              </p>
            </div>

            {/* Endpoint Port */}
            <div className="space-y-2">
              <Label htmlFor="peer-port">{t("peerModal.endpointPort")}</Label>
              <Input
                id="peer-port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="51820"
              />
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  {t("peerModal.endpointPortHint", { port: "51820" })}
                </p>
              )}
            </div>

            {/* Persistent Keepalive */}
            <div className="space-y-2">
              <Label htmlFor="peer-keepalive">{t("peerModal.keepalive")}</Label>
              <Input
                id="peer-keepalive"
                type="number"
                value={persistentKeepalive}
                onChange={(e) => setPersistentKeepalive(e.target.value)}
                placeholder="25"
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? t("peerModal.keepaliveHintEdit")
                  : t("peerModal.keepaliveHint")}
              </p>
            </div>

            {/* Disable Peer */}
            <div className="flex items-center space-x-3 pt-2">
              <Checkbox
                id="peer-disabled"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="peer-disabled" className="flex items-center gap-2 cursor-pointer">
                  <Ban className="h-4 w-4 text-muted-foreground" />
                  {t("peerModal.disablePeer")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isEdit
                    ? t("peerModal.disablePeerHintEdit")
                    : t("peerModal.disablePeerHint")}
                </p>
              </div>
            </div>
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
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? tc("saving") : t("peerModal.adding")}
              </>
            ) : isEdit ? (
              t("peerModal.saveChanges")
            ) : (
              t("peerModal.addPeer")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
