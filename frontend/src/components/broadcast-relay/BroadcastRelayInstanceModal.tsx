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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { BroadcastRelayInstance } from "@/lib/api/broadcast-relay";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: BroadcastRelayInstance | null;
  onSuccess: () => void;
  onSubmit: (data: Partial<BroadcastRelayInstance> & { id: string }) => Promise<void>;
}

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

function isValidIPv4(value: string): boolean {
  if (!IPV4_REGEX.test(value)) return false;
  return value.split(".").every((octet) => parseInt(octet, 10) <= 255);
}

export function BroadcastRelayInstanceModal({ open, onOpenChange, instance, onSuccess, onSubmit }: Props) {
  const t = useTranslations("broadcastRelay");
  const tc = useTranslations("common");
  const isEditMode = !!instance;

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [, setInterfacesLoading] = useState(false);

  const [instanceId, setInstanceId] = useState("");
  const [port, setPort] = useState("");
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [selectedInterface, setSelectedInterface] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [disabled, setDisabled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (instance) {
        setInstanceId(instance.id);
        setPort(instance.port != null ? String(instance.port) : "");
        setInterfaces([...instance.interfaces]);
        setAddress(instance.address ?? "");
        setDescription(instance.description ?? "");
        setDisabled(instance.disabled);
      } else {
        resetForm();
      }
      loadInterfaces();
    }
  }, [open, instance]);

  const loadInterfaces = async () => {
    setInterfacesLoading(true);
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces);
    } catch {
      // non-critical
    } finally {
      setInterfacesLoading(false);
    }
  };

  const resetForm = () => {
    setInstanceId("");
    setPort("");
    setInterfaces([]);
    setSelectedInterface("");
    setAddress("");
    setDescription("");
    setDisabled(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleAddInterface = () => {
    if (!selectedInterface || interfaces.includes(selectedInterface)) return;
    setInterfaces([...interfaces, selectedInterface]);
    setSelectedInterface("");
    setError(null);
  };

  const handleRemoveInterface = (iface: string) => {
    setInterfaces(interfaces.filter((i) => i !== iface));
  };

  const validate = (): string | null => {
    if (!isEditMode) {
      const idNum = parseInt(instanceId, 10);
      if (!instanceId || isNaN(idNum) || idNum < 1 || idNum > 99) {
        return t("modal.idRange");
      }
    }

    const portNum = parseInt(port, 10);
    if (!port || isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return t("modal.portRange");
    }

    if (interfaces.length === 0) {
      return t("modal.interfaceRequired");
    }

    if (address && !isValidIPv4(address)) {
      return t("modal.addressInvalid");
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        id: isEditMode ? instance!.id : instanceId,
        port: parseInt(port, 10),
        interfaces,
        address: address || null,
        description: description || null,
        disabled,
      });
      handleClose();
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const availableToAdd = availableInterfaces.filter((i) => !interfaces.includes(i.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("modal.editTitle") : t("modal.addTitle")}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("modal.editDescription", { id: instance!.id })
              : t("modal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 pb-2">
            {/* Instance ID */}
            <div className="space-y-2">
              <Label htmlFor="br-instance-id">{t("modal.instanceId")}</Label>
              <Input
                id="br-instance-id"
                type="number"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                min={1}
                max={99}
                disabled={isEditMode}
                className={isEditMode ? "bg-muted font-mono" : "font-mono"}
                placeholder="1–99"
              />
              {isEditMode && (
                <p className="text-xs text-muted-foreground">{t("modal.instanceIdLocked")}</p>
              )}
            </div>

            {/* UDP Port */}
            <div className="space-y-2">
              <Label htmlFor="br-port">{t("modal.udpPort")}</Label>
              <Input
                id="br-port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                min={1}
                max={65535}
                placeholder={t("modal.udpPortPlaceholder")}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">{t("modal.udpPortHint")}</p>
            </div>

            {/* Interfaces */}
            <div className="space-y-3">
              <div>
                <Label>{t("modal.interfaces")}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("modal.interfacesHint")}
                </p>
              </div>

              {interfaces.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {interfaces.map((iface) => (
                    <Badge key={iface} variant="secondary" className="font-mono gap-1 pr-1">
                      {iface}
                      <button
                        onClick={() => handleRemoveInterface(iface)}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <InterfaceSelect
                  value={selectedInterface}
                  onValueChange={setSelectedInterface}
                  interfaces={availableToAdd}
                  className="flex-1"
                  placeholder={t("modal.selectInterface")}
                  emptyText={t("modal.noMoreInterfaces")}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleAddInterface}
                  disabled={!selectedInterface}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Source Address */}
            <div className="space-y-2">
              <Label htmlFor="br-address">{t("modal.sourceAddress")}</Label>
              <Input
                id="br-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("modal.sourceAddressPlaceholder")}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {t("modal.sourceAddressHint")}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="br-description">{tc("description")}</Label>
              <Input
                id="br-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tc("optionalDescription")}
                maxLength={255}
              />
            </div>

            {/* Disabled */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="br-disabled"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(checked === true)}
              />
              <Label htmlFor="br-disabled" className="cursor-pointer">
                {t("modal.disableInstance")}
              </Label>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
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
                {isEditMode ? tc("saving") : t("modal.adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              t("content.addInstance")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
