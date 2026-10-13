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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import type { AdminGroup, TeInterface } from "@/lib/api/traffic-engineering";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface TeInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: TeInterface) => Promise<void>;
  existingInterface?: TeInterface | null;
  adminGroups: AdminGroup[];
}

export function TeInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  adminGroups,
}: TeInterfaceModalProps) {
  const t = useTranslations("trafficEngineering");
  const tc = useTranslations("common");
  const isEditMode = !!existingInterface;

  const [name, setName] = useState("");
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [interfacesLoading, setInterfacesLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [maxBandwidth, setMaxBandwidth] = useState("");
  const [maxReservableBandwidth, setMaxReservableBandwidth] = useState("");
  const [metric, setMetric] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setName(existingInterface.name);
        setSelectedGroups(new Set(existingInterface.admin_groups));
        setMaxBandwidth(existingInterface.max_bandwidth != null ? String(existingInterface.max_bandwidth) : "");
        setMaxReservableBandwidth(
          existingInterface.max_reservable_bandwidth != null
            ? String(existingInterface.max_reservable_bandwidth)
            : ""
        );
        setMetric(existingInterface.metric != null ? String(existingInterface.metric) : "");
      } else {
        setName("");
        setSelectedGroups(new Set());
        setMaxBandwidth("");
        setMaxReservableBandwidth("");
        setMetric("");
      }
      setError(null);

      setInterfacesLoading(true);
      showService
        .getAllInterfaces()
        .then((res) => setAvailableInterfaces([...res.interfaces].sort((a, b) => a.name.localeCompare(b.name))))
        .catch(() => setAvailableInterfaces([]))
        .finally(() => setInterfacesLoading(false));
    }
  }, [open, existingInterface]);

  const validateBandwidth = (val: string, label: string): string | null => {
    if (!val) return null;
    const v = parseInt(val, 10);
    if (isNaN(v) || v < 1 || v > 4294967295) return t("interfaceModal.bandwidthRange", { label });
    return null;
  };

  const validate = (): string | null => {
    if (!name) return t("interfaceModal.interfaceRequired");
    const bwErr = validateBandwidth(maxBandwidth, t("interfaceModal.maxBandwidth"));
    if (bwErr) return bwErr;
    const rbwErr = validateBandwidth(maxReservableBandwidth, t("interfaceModal.maxReservableBandwidth"));
    if (rbwErr) return rbwErr;
    if (metric) {
      const v = parseInt(metric, 10);
      if (isNaN(v) || v < 1 || v > 4294967295) return t("interfaceModal.metricRange");
    }
    return null;
  };

  const toggleGroup = (groupName: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
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
        name,
        admin_groups: Array.from(selectedGroups),
        max_bandwidth: maxBandwidth ? parseInt(maxBandwidth, 10) : null,
        max_reservable_bandwidth: maxReservableBandwidth ? parseInt(maxReservableBandwidth, 10) : null,
        metric: metric ? parseInt(metric, 10) : null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("interfaceModal.editTitle") : t("interfaceModal.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("interfaceModal.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("interfaces.interface")}</Label>
              {isEditMode ? (
                <Input value={name} disabled className="bg-muted" />
              ) : (
                <InterfaceSelect
                  value={name}
                  onValueChange={setName}
                  disabled={interfacesLoading}
                  interfaces={availableInterfaces}
                  placeholder={tc("selectInterface")}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t("adminGroups")}</Label>
              {adminGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">
                  {t("interfaceModal.noGroups")}
                </p>
              ) : (
                <div className="rounded-md border border-border divide-y divide-border max-h-40 overflow-y-auto">
                  {adminGroups.map((group) => (
                    <div key={group.name} className="flex items-center gap-3 px-3 py-2">
                      <Checkbox
                        id={`ag-${group.name}`}
                        checked={selectedGroups.has(group.name)}
                        onCheckedChange={() => toggleGroup(group.name)}
                      />
                      <Label htmlFor={`ag-${group.name}`} className="cursor-pointer flex-1 font-normal">
                        <span className="font-mono">{group.name}</span>
                        {group.bit_position != null && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {t("interfaceModal.bit", { position: String(group.bit_position) })}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="te-max-bw">{t("interfaces.maxBw")}</Label>
                <Input
                  id="te-max-bw"
                  type="number"
                  min={1}
                  value={maxBandwidth}
                  onChange={(e) => setMaxBandwidth(e.target.value)}
                  placeholder={tc("optional")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="te-max-rbw">{t("interfaces.maxReservBw")}</Label>
                <Input
                  id="te-max-rbw"
                  type="number"
                  min={1}
                  value={maxReservableBandwidth}
                  onChange={(e) => setMaxReservableBandwidth(e.target.value)}
                  placeholder={tc("optional")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="te-metric">{t("interfaces.metric")}</Label>
              <Input
                id="te-metric"
                type="number"
                min={1}
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder={tc("optional")}
              />
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : tc("creating")}
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
