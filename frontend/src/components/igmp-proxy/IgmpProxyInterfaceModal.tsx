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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { IgmpProxyInterface } from "@/lib/api/igmp-proxy";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface IgmpProxyInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: IgmpProxyInterface) => Promise<void>;
  existingInterface?: IgmpProxyInterface | null;
}

export function IgmpProxyInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
}: IgmpProxyInterfaceModalProps) {
  const t = useTranslations("igmpProxy");
  const tc = useTranslations("common");
  const isEditMode = !!existingInterface;

  // Available interfaces from VyOS
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [, setInterfacesLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [threshold, setThreshold] = useState("");
  const [altSubnets, setAltSubnets] = useState<string[]>([]);
  const [newAltSubnet, setNewAltSubnet] = useState("");
  const [whitelists, setWhitelists] = useState<string[]>([]);
  const [newWhitelist, setNewWhitelist] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setName(existingInterface.name);
        setRole(existingInterface.role || "");
        setThreshold(
          existingInterface.threshold != null
            ? String(existingInterface.threshold)
            : ""
        );
        setAltSubnets([...existingInterface.alt_subnets]);
        setWhitelists([...existingInterface.whitelists]);
      } else {
        resetForm();
      }
      loadInterfaces();
    }
  }, [open, existingInterface]);

  const loadInterfaces = async () => {
    setInterfacesLoading(true);
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces);
    } catch {
      // Non-critical
    } finally {
      setInterfacesLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setRole("");
    setThreshold("");
    setAltSubnets([]);
    setNewAltSubnet("");
    setWhitelists([]);
    setNewWhitelist("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!name) {
      return t("interfaceModal.interfaceRequired");
    }

    if (!role) {
      return t("interfaceModal.roleRequired");
    }

    if (threshold.trim()) {
      const val = parseInt(threshold.trim(), 10);
      if (isNaN(val) || val < 1 || val > 255) {
        return t("interfaceModal.thresholdRange");
      }
    }

    for (const subnet of altSubnets) {
      if (!subnet.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/)) {
        return t("interfaceModal.invalidAltSubnet", { value: subnet });
      }
    }

    for (const wl of whitelists) {
      if (!wl.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/)) {
        return t("interfaceModal.invalidWhitelist", { value: wl });
      }
    }

    return null;
  };

  const handleAddAltSubnet = () => {
    const value = newAltSubnet.trim();
    if (!value) return;
    if (altSubnets.includes(value)) {
      setError(t("interfaceModal.altSubnetExists"));
      return;
    }
    setAltSubnets([...altSubnets, value]);
    setNewAltSubnet("");
    setError(null);
  };

  const handleRemoveAltSubnet = (index: number) => {
    setAltSubnets(altSubnets.filter((_, i) => i !== index));
  };

  const handleAddWhitelist = () => {
    const value = newWhitelist.trim();
    if (!value) return;
    if (whitelists.includes(value)) {
      setError(t("interfaceModal.whitelistExists"));
      return;
    }
    setWhitelists([...whitelists, value]);
    setNewWhitelist("");
    setError(null);
  };

  const handleRemoveWhitelist = (index: number) => {
    setWhitelists(whitelists.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const iface: IgmpProxyInterface = {
        name,
        role: role || null,
        threshold: threshold.trim() ? parseInt(threshold.trim(), 10) : null,
        alt_subnets: altSubnets,
        whitelists: whitelists,
      };

      await onSubmit(iface);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tc("operationFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("interfaceModal.editTitle") : tc("addInterface")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("interfaceModal.editDescription", { name: String(existingInterface?.name) })
              : t("interfaceModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* Interface Name */}
            <div className="space-y-2">
              <Label>{t("interface")}</Label>
              {isEditMode ? (
                <Input
                  value={name}
                  disabled
                  className="bg-muted font-mono"
                />
              ) : (
                <InterfaceSelect
                  value={name}
                  onValueChange={setName}
                  interfaces={availableInterfaces}
                  placeholder={tc("selectInterface")}
                />
              )}
              <p className="text-xs text-muted-foreground">
                {t("interfaceModal.interfaceHelp")}
              </p>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>{t("interfaceModal.role")}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder={t("interfaceModal.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upstream">{t("upstream")}</SelectItem>
                  <SelectItem value="downstream">{t("downstream")}</SelectItem>
                  <SelectItem value="disabled">{tc("disabled")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("interfaceModal.roleHelp")}
              </p>
            </div>

            {/* Threshold */}
            <div className="space-y-2">
              <Label htmlFor="igmp-iface-threshold">{t("ttlThreshold")}</Label>
              <Input
                id="igmp-iface-threshold"
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={t("thresholdPlaceholder")}
                min={1}
                max={255}
              />
              <p className="text-xs text-muted-foreground">
                {t("interfaceModal.thresholdHelp")}
              </p>
            </div>

            {/* Alt Subnets */}
            <div className="space-y-3">
              <div>
                <Label>{t("alternateSubnets")}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("interfaceModal.altSubnetsHelp")}
                </p>
              </div>

              {altSubnets.length > 0 && (
                <div className="space-y-2">
                  {altSubnets.map((subnet, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-md border bg-muted font-mono text-sm">
                        {subnet}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleRemoveAltSubnet(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  value={newAltSubnet}
                  onChange={(e) => setNewAltSubnet(e.target.value)}
                  placeholder={t("altSubnetPlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAltSubnet();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleAddAltSubnet}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Whitelists */}
            <div className="space-y-3">
              <div>
                <Label>{t("whitelist")}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("interfaceModal.whitelistHelp")}
                </p>
              </div>

              {whitelists.length > 0 && (
                <div className="space-y-2">
                  {whitelists.map((wl, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-md border bg-muted font-mono text-sm">
                        {wl}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleRemoveWhitelist(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  value={newWhitelist}
                  onChange={(e) => setNewWhitelist(e.target.value)}
                  placeholder={t("whitelistPlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddWhitelist();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleAddWhitelist}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Error Display */}
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
                {isEditMode ? tc("saving") : t("adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              tc("addInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
