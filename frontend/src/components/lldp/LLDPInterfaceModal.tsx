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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { lldpService, LLDPInterface, LLDPCapabilities } from "@/lib/api/lldp";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface LLDPInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: LLDPInterface | null;
  capabilities: LLDPCapabilities;
  existingNames: string[];
  onSuccess: () => void;
}

type LocationType = "none" | "coordinate-based" | "elin";

function getInitialLocationType(iface: LLDPInterface | null): LocationType {
  if (!iface?.location) return "none";
  if (iface.location.elin != null) return "elin";
  if (iface.location.coordinate_based != null) return "coordinate-based";
  return "none";
}

export function LLDPInterfaceModal({
  open,
  onOpenChange,
  existing,
  capabilities,
  existingNames,
  onSuccess,
}: LLDPInterfaceModalProps) {
  const t = useTranslations("lldp");
  const tc = useTranslations("common");
  const isEdit = existing !== null;

  const [interfaceName, setInterfaceName] = useState(existing?.name ?? "");
  const [mode, setMode] = useState(existing?.mode ?? "rx-tx");
  const [disableFlag, setDisableFlag] = useState(existing?.disabled ?? false);
  const [locationType, setLocationType] = useState<LocationType>(
    getInitialLocationType(existing)
  );
  const [locationExpanded, setLocationExpanded] = useState(
    getInitialLocationType(existing) !== "none"
  );

  const [latitude, setLatitude] = useState(
    existing?.location?.coordinate_based?.latitude ?? ""
  );
  const [longitude, setLongitude] = useState(
    existing?.location?.coordinate_based?.longitude ?? ""
  );
  const [altitude, setAltitude] = useState(
    existing?.location?.coordinate_based?.altitude ?? ""
  );
  const [datum, setDatum] = useState(
    existing?.location?.coordinate_based?.datum ?? "WGS84"
  );
  const [elin, setElin] = useState(existing?.location?.elin ?? "");

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => {
      setAvailableInterfaces([...res.interfaces].sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, [open]);

  const validate = (): string | null => {
    if (!interfaceName) return t("modal.selectInterfaceError");
    if (!isEdit && existingNames.includes(interfaceName)) {
      return t("modal.overrideExists", { name: interfaceName });
    }
    if (locationType === "coordinate-based") {
      if (!latitude || !longitude) return t("modal.latLongRequired");
    }
    if (locationType === "elin") {
      if (!/^\d{10,25}$/.test(elin)) return t("modal.elinInvalid");
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await lldpService.setInterface(
        existing,
        {
          name: interfaceName,
          mode,
          disableFlag,
          locationType,
          locationCoordinate:
            locationType === "coordinate-based"
              ? { latitude, longitude, altitude: altitude || undefined, datum }
              : undefined,
          locationElin: locationType === "elin" ? elin : undefined,
        },
        capabilities
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const use15Mode = capabilities.features.interface_mode.supported;
  const use14Disable = capabilities.features.interface_disable_flag.supported;

  const selectableInterfaces: InterfaceName[] = [
    { name: "all", type: "", description: t("modal.allInterfaces") },
    ...availableInterfaces,
  ].filter((i) => !existingNames.includes(i.name) || i.name === existing?.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("modal.editTitle") : t("modal.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("modal.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            {/* Interface */}
            <div className="space-y-1.5">
              <Label>{t("modal.interface")}</Label>
              {isEdit ? (
                <Input value={interfaceName} disabled />
              ) : (
                <InterfaceSelect
                  value={interfaceName}
                  onValueChange={setInterfaceName}
                  interfaces={selectableInterfaces}
                  placeholder={t("modal.selectInterface")}
                />
              )}
            </div>

            {/* Mode */}
            {use15Mode && (
              <div className="space-y-1.5">
                <Label>{t("modal.mode")}</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rx-tx">rx-tx — {t("modal.modeRxTx")}</SelectItem>
                    <SelectItem value="rx">rx — {t("modal.modeRx")}</SelectItem>
                    <SelectItem value="tx">tx — {t("modal.modeTx")}</SelectItem>
                    <SelectItem value="disable">{tc("shown.disable")} — {tc("disabled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {use14Disable && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="disable-flag"
                  checked={disableFlag}
                  onCheckedChange={(checked) => setDisableFlag(!!checked)}
                />
                <Label htmlFor="disable-flag" className="cursor-pointer">
                  {t("modal.disableFlag")}
                </Label>
              </div>
            )}

            {/* Location (collapsible) */}
            <div className="border rounded-md">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50"
                onClick={() => setLocationExpanded((v) => !v)}
              >
                <span>{t("modal.location")}</span>
                {locationExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {locationExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  <RadioGroup
                    value={locationType}
                    onValueChange={(v) => setLocationType(v as LocationType)}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="none" id="loc-none" />
                      <Label htmlFor="loc-none" className="cursor-pointer">
                        {tc("none")}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="coordinate-based" id="loc-coord" />
                      <Label htmlFor="loc-coord" className="cursor-pointer">
                        {t("modal.coordinateBased")}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="elin" id="loc-elin" />
                      <Label htmlFor="loc-elin" className="cursor-pointer">
                        {t("modal.elin")}
                      </Label>
                    </div>
                  </RadioGroup>

                  {locationType === "coordinate-based" && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("modal.latitude")}</Label>
                        <Input
                          placeholder={t("modal.latitudePlaceholder")}
                          value={latitude}
                          onChange={(e) => setLatitude(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("modal.longitude")}</Label>
                        <Input
                          placeholder={t("modal.longitudePlaceholder")}
                          value={longitude}
                          onChange={(e) => setLongitude(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("modal.altitude")}</Label>
                        <Input
                          placeholder={t("modal.altitudePlaceholder")}
                          value={altitude}
                          onChange={(e) => setAltitude(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("modal.datum")}</Label>
                        <Select value={datum} onValueChange={setDatum}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WGS84">WGS84</SelectItem>
                            <SelectItem value="NAD83">NAD83</SelectItem>
                            <SelectItem value="MLLW">MLLW</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {locationType === "elin" && (
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs">{t("modal.emergencyNumber")}</Label>
                      <Input
                        placeholder={t("modal.emergencyNumberPlaceholder")}
                        value={elin}
                        onChange={(e) => setElin(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? tc("save") : tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
