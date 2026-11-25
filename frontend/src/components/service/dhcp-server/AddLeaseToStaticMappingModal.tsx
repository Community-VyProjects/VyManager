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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Network, Plus } from "lucide-react";
import type { DHCPLease, DHCPSharedNetwork } from "@/lib/api/dhcp-server";
import { failedSaveMessage } from "./dhcp-save";
import {
  emptyMappingDraft,
  submitMappingCreate,
  validateMappingCreate,
  type MappingDraft,
} from "./dhcp-form";
import { isIPInSubnet } from "./dhcp-server-form";
import type { ApiError } from "@/lib/types/api";

interface AddLeaseToStaticMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lease: DHCPLease;
  network: DHCPSharedNetwork;
}

export function AddLeaseToStaticMappingModal({
  open,
  onOpenChange,
  onSuccess,
  lease,
  network,
}: AddLeaseToStaticMappingModalProps) {
  const t = useTranslations("dhcpServer");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields - pre-populated from lease
  const [mappingName, setMappingName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [selectedSubnet, setSelectedSubnet] = useState("");

  // Load lease data when modal opens
  useEffect(() => {
    if (open && lease) {
      // Use hostname as mapping name, fallback to a sanitized version of MAC
      const defaultName = lease.hostname || lease.mac_address.replace(/:/g, "-");
      setMappingName(defaultName);
      setIpAddress(lease.ip_address);
      setMacAddress(lease.mac_address);
      setError(null);

      // Auto-select subnet if there's only one, or try to match by IP
      if (network.subnets.length === 1) {
        setSelectedSubnet(network.subnets[0].subnet);
      } else if (network.subnets.length > 1) {
        // Try to find a matching subnet based on IP address
        const matchingSubnet = network.subnets.find((subnet) => isIPInSubnet(lease.ip_address, subnet.subnet));
        setSelectedSubnet(matchingSubnet?.subnet ?? network.subnets[0].subnet);
      }
    }
  }, [open, lease, network]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const draft = (): MappingDraft => ({
    ...emptyMappingDraft(),
    subnet: selectedSubnet,
    name: mappingName,
    ipAddress,
    macAddress: macAddress.trim().toLowerCase(),
  });

  const handleSubmit = async () => {
    const next = draft();
    const validationError = validateMappingCreate(next, false);
    if (validationError) {
      setError(t(validationError));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await submitMappingCreate(network.name, next);
      const createError = failedSaveMessage(result, t("mapping.createFailed"));
      if (createError) {
        setError(createError);
        return;
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message || t("mapping.createFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t("leaseMapping.title")}
          </DialogTitle>
          <DialogDescription>
            {t("leaseMapping.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Context Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Network className="h-4 w-4" />
            <span>{t("networkLabel")}{" "}<span className="font-medium text-foreground">{network.name}</span></span>
          </div>

          {/* Original Lease Info */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("leaseMapping.originalLease")}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono">{lease.ip_address}</Badge>
              <Badge variant="outline" className="font-mono text-xs">{lease.mac_address}</Badge>
              {lease.hostname && (
                <Badge variant="secondary">{lease.hostname}</Badge>
              )}
            </div>
          </div>

          {/* Subnet Selection */}
          <div className="space-y-2">
            <Label htmlFor="subnet">{t("subnet")}</Label>
            <Select value={selectedSubnet} onValueChange={setSelectedSubnet}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectSubnet")} />
              </SelectTrigger>
              <SelectContent>
                {network.subnets.map((subnet) => (
                  <SelectItem key={subnet.subnet} value={subnet.subnet}>
                    {subnet.subnet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("leaseMapping.subnetHelp")}
            </p>
          </div>

          {/* Mapping Name */}
          <div className="space-y-2">
            <Label htmlFor="mapping-name">{t("mapping.name")}</Label>
            <Input
              id="mapping-name"
              placeholder={t("examplePlaceholder", { example: "desktop-pc" })}
              value={mappingName}
              onChange={(e) => setMappingName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("mapping.nameHelp")}
            </p>
          </div>

          {/* IP Address */}
          <div className="space-y-2">
            <Label htmlFor="ip-address">{t("mapping.ipAddress")}</Label>
            <Input
              id="ip-address"
              placeholder={t("examplePlaceholder", { example: "192.168.1.100" })}
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("leaseMapping.ipHelp")}
            </p>
          </div>

          {/* MAC Address */}
          <div className="space-y-2">
            <Label htmlFor="mac-address">{t("mapping.macAddress")}</Label>
            <Input
              id="mac-address"
              placeholder={t("examplePlaceholder", { example: "aa:bb:cc:dd:ee:ff" })}
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t("leaseMapping.macHelp")}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? tc("creating") : t("leaseMapping.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
