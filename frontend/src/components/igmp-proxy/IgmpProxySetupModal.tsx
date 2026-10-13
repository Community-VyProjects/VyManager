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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Loader2,
  Plus,
  X,
  ArrowUpFromLine,
  ArrowDownToLine,
} from "lucide-react";
import type { IgmpProxyInterface } from "@/lib/api/igmp-proxy";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface IgmpProxySetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (interfaces: IgmpProxyInterface[]) => Promise<void>;
}

export function IgmpProxySetupModal({
  open,
  onOpenChange,
  onSubmit,
}: IgmpProxySetupModalProps) {
  const t = useTranslations("igmpProxy");
  const tc = useTranslations("common");
  // Available interfaces from VyOS
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [, setInterfacesLoading] = useState(false);

  // Upstream state
  const [upstreamName, setUpstreamName] = useState("");
  const [upstreamThreshold, setUpstreamThreshold] = useState("");
  const [upstreamAltSubnets, setUpstreamAltSubnets] = useState<string[]>([]);
  const [newUpstreamAltSubnet, setNewUpstreamAltSubnet] = useState("");
  const [upstreamWhitelists, setUpstreamWhitelists] = useState<string[]>([]);
  const [newUpstreamWhitelist, setNewUpstreamWhitelist] = useState("");

  // Downstream state
  const [downstreamName, setDownstreamName] = useState("");
  const [downstreamThreshold, setDownstreamThreshold] = useState("");
  const [downstreamWhitelists, setDownstreamWhitelists] = useState<string[]>([]);
  const [newDownstreamWhitelist, setNewDownstreamWhitelist] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      resetForm();
      loadInterfaces();
    }
  }, [open]);

  const loadInterfaces = async () => {
    setInterfacesLoading(true);
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces);
    } catch {
      // Non-critical - user can still type manually
    } finally {
      setInterfacesLoading(false);
    }
  };

  const resetForm = () => {
    setUpstreamName("");
    setUpstreamThreshold("");
    setUpstreamAltSubnets([]);
    setNewUpstreamAltSubnet("");
    setUpstreamWhitelists([]);
    setNewUpstreamWhitelist("");
    setDownstreamName("");
    setDownstreamThreshold("");
    setDownstreamWhitelists([]);
    setNewDownstreamWhitelist("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateCidr = (value: string): boolean => {
    return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(value);
  };

  const validateForm = (): string | null => {
    if (!upstreamName) {
      return t("setupModal.upstreamRequired");
    }
    if (!downstreamName) {
      return t("setupModal.downstreamRequired");
    }
    if (upstreamName === downstreamName) {
      return t("setupModal.mustDiffer");
    }

    if (upstreamThreshold.trim()) {
      const val = parseInt(upstreamThreshold.trim(), 10);
      if (isNaN(val) || val < 1 || val > 255) {
        return t("setupModal.upstreamThresholdRange");
      }
    }

    if (downstreamThreshold.trim()) {
      const val = parseInt(downstreamThreshold.trim(), 10);
      if (isNaN(val) || val < 1 || val > 255) {
        return t("setupModal.downstreamThresholdRange");
      }
    }

    for (const subnet of upstreamAltSubnets) {
      if (!validateCidr(subnet)) {
        return t("setupModal.invalidUpstreamAltSubnet", { value: subnet });
      }
    }

    for (const wl of [...upstreamWhitelists, ...downstreamWhitelists]) {
      if (!validateCidr(wl)) {
        return t("setupModal.invalidWhitelist", { value: wl });
      }
    }

    return null;
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
      const interfaces: IgmpProxyInterface[] = [
        {
          name: upstreamName,
          role: "upstream",
          threshold: upstreamThreshold.trim() ? parseInt(upstreamThreshold.trim(), 10) : null,
          alt_subnets: upstreamAltSubnets,
          whitelists: upstreamWhitelists,
        },
        {
          name: downstreamName,
          role: "downstream",
          threshold: downstreamThreshold.trim() ? parseInt(downstreamThreshold.trim(), 10) : null,
          alt_subnets: [],
          whitelists: downstreamWhitelists,
        },
      ];

      await onSubmit(interfaces);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tc("operationFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // List add/remove helpers
  const addToList = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void,
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (list.includes(trimmed)) {
      setError(t("setupModal.entryExists"));
      return;
    }
    setList([...list, trimmed]);
    setInput("");
    setError(null);
  };

  const removeFromList = (
    index: number,
    list: string[],
    setList: (v: string[]) => void,
  ) => {
    setList(list.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("setupProxy")}</DialogTitle>
          <DialogDescription>
            {t("setupModal.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* ============================================================ */}
            {/* Upstream Interface */}
            {/* ============================================================ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-semibold">{t("setupModal.upstreamInterface")}</h4>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                {t("setupModal.upstreamHelp")}
              </p>

              <div className="space-y-2">
                <Label>{t("interface")}</Label>
                <InterfaceSelect
                  value={upstreamName}
                  onValueChange={setUpstreamName}
                  interfaces={availableInterfaces}
                  placeholder={tc("selectInterface")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-upstream-threshold">{t("ttlThreshold")}</Label>
                <Input
                  id="setup-upstream-threshold"
                  type="number"
                  value={upstreamThreshold}
                  onChange={(e) => setUpstreamThreshold(e.target.value)}
                  placeholder={t("thresholdPlaceholder")}
                  min={1}
                  max={255}
                />
              </div>

              {/* Upstream Alt Subnets */}
              <div className="space-y-2">
                <Label>{t("alternateSubnets")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("setupModal.altSubnetsHelp")}
                </p>
                {upstreamAltSubnets.length > 0 && (
                  <div className="space-y-2">
                    {upstreamAltSubnets.map((subnet, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 rounded-md border bg-muted font-mono text-sm">
                          {subnet}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => removeFromList(index, upstreamAltSubnets, setUpstreamAltSubnets)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    value={newUpstreamAltSubnet}
                    onChange={(e) => setNewUpstreamAltSubnet(e.target.value)}
                    placeholder={t("altSubnetPlaceholder")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addToList(newUpstreamAltSubnet, upstreamAltSubnets, setUpstreamAltSubnets, setNewUpstreamAltSubnet);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => addToList(newUpstreamAltSubnet, upstreamAltSubnets, setUpstreamAltSubnets, setNewUpstreamAltSubnet)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Upstream Whitelists */}
              <div className="space-y-2">
                <Label>{t("whitelist")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("setupModal.whitelistHelp")}
                </p>
                {upstreamWhitelists.length > 0 && (
                  <div className="space-y-2">
                    {upstreamWhitelists.map((wl, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 rounded-md border bg-muted font-mono text-sm">
                          {wl}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => removeFromList(index, upstreamWhitelists, setUpstreamWhitelists)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    value={newUpstreamWhitelist}
                    onChange={(e) => setNewUpstreamWhitelist(e.target.value)}
                    placeholder={t("whitelistPlaceholder")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addToList(newUpstreamWhitelist, upstreamWhitelists, setUpstreamWhitelists, setNewUpstreamWhitelist);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => addToList(newUpstreamWhitelist, upstreamWhitelists, setUpstreamWhitelists, setNewUpstreamWhitelist)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* ============================================================ */}
            {/* Downstream Interface */}
            {/* ============================================================ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-green-500" />
                <h4 className="text-sm font-semibold">{t("setupModal.downstreamInterface")}</h4>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                {t("setupModal.downstreamHelp")}
              </p>

              <div className="space-y-2">
                <Label>{t("interface")}</Label>
                <InterfaceSelect
                  value={downstreamName}
                  onValueChange={setDownstreamName}
                  interfaces={availableInterfaces}
                  placeholder={tc("selectInterface")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-downstream-threshold">{t("ttlThreshold")}</Label>
                <Input
                  id="setup-downstream-threshold"
                  type="number"
                  value={downstreamThreshold}
                  onChange={(e) => setDownstreamThreshold(e.target.value)}
                  placeholder={t("thresholdPlaceholder")}
                  min={1}
                  max={255}
                />
              </div>

              {/* Downstream Whitelists */}
              <div className="space-y-2">
                <Label>{t("whitelist")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("setupModal.whitelistHelp")}
                </p>
                {downstreamWhitelists.length > 0 && (
                  <div className="space-y-2">
                    {downstreamWhitelists.map((wl, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 rounded-md border bg-muted font-mono text-sm">
                          {wl}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => removeFromList(index, downstreamWhitelists, setDownstreamWhitelists)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    value={newDownstreamWhitelist}
                    onChange={(e) => setNewDownstreamWhitelist(e.target.value)}
                    placeholder={t("whitelistPlaceholder")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addToList(newDownstreamWhitelist, downstreamWhitelists, setDownstreamWhitelists, setNewDownstreamWhitelist);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => addToList(newDownstreamWhitelist, downstreamWhitelists, setDownstreamWhitelists, setNewDownstreamWhitelist)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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
                {t("setupModal.settingUp")}
              </>
            ) : (
              t("setupProxy")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
