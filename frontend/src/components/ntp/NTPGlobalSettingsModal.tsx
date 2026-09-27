"use client";

import { useState, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { ntpService, NTPConfig, NTPGlobalSettingsUpdate } from "@/lib/api/ntp";
import type { NTPCapabilities, NTPTimestampInterface } from "@/lib/api/ntp";

interface NTPGlobalSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: NTPConfig;
  capabilities: NTPCapabilities | null;
  onSuccess: () => void;
}

function isValidIPOrCIDR(value: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  const ipv6 = /^[0-9a-fA-F:]+(?:\/\d{1,3})?$/;
  return ipv4.test(value) || ipv6.test(value);
}

// "default" is a UI sentinel meaning "delete the leap-second node" (let VyOS use its default)
// Labels/descriptions are translated at render time via leapSecond.<value> / leapSecond.<value>Desc
const LEAP_SECOND_OPTIONS = [
  { value: "default" },
  { value: "timezone" },
  { value: "ignore" },
  { value: "smear" },
  { value: "system" },
] as const;

interface MultiValueFieldProps {
  label: string;
  description: string;
  placeholder: string;
  values: string[];
  onAdd: (val: string) => void;
  onRemove: (val: string) => void;
  validate?: (val: string) => string | null;
}

function MultiValueField({
  label,
  description,
  placeholder,
  values,
  onAdd,
  onRemove,
  validate,
}: MultiValueFieldProps) {
  const t = useTranslations("ntp");
  const [input, setInput] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleAdd = () => {
    const val = input.trim();
    if (!val) return;
    if (validate) {
      const err = validate(val);
      if (err) {
        setFieldError(err);
        return;
      }
    }
    if (values.includes(val)) {
      setFieldError(t("settings.alreadyAdded"));
      return;
    }
    onAdd(val);
    setInput("");
    setFieldError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setFieldError(null);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((val) => (
            <Badge key={val} variant="secondary" className="font-mono gap-1 pr-1">
              {val}
              <button
                type="button"
                onClick={() => onRemove(val)}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface TimestampFilterFieldProps {
  values: NTPTimestampInterface[];
  filterOptions: string[];
  onAdd: (iface: string, filter: string) => void;
  onRemove: (iface: string) => void;
}

function TimestampFilterField({
  values,
  filterOptions,
  onAdd,
  onRemove,
}: TimestampFilterFieldProps) {
  const t = useTranslations("ntp");
  const [iface, setIface] = useState("");
  const [filter, setFilter] = useState(filterOptions[0] ?? "all");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleAdd = () => {
    const name = iface.trim();
    if (!name) {
      setFieldError(t("settings.enterInterface"));
      return;
    }
    onAdd(name, filter);
    setIface("");
    setFilter(filterOptions[0] ?? "all");
    setFieldError(null);
  };

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{t("settings.receiveFilters")}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("settings.receiveFiltersHint")}
        </p>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={t("settings.ifacePlaceholder")}
          value={iface}
          onChange={(e) => {
            setIface(e.target.value);
            setFieldError(null);
          }}
          className="flex-1"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((ts) => (
            <Badge
              key={ts.interface}
              variant="secondary"
              className="font-mono gap-1 pr-1"
            >
              {ts.interface}: {ts.receive_filter}
              <button
                type="button"
                onClick={() => onRemove(ts.interface)}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function NTPGlobalSettingsModal({
  open,
  onOpenChange,
  config,
  capabilities,
  onSuccess,
}: NTPGlobalSettingsModalProps) {
  const t = useTranslations("ntp");
  const tc = useTranslations("common");
  const [listenAddresses, setListenAddresses] = useState<string[]>(
    config.listen_addresses
  );
  const [allowClients, setAllowClients] = useState<string[]>(config.allow_clients);
  const [interfaces, setInterfaces] = useState<string[]>(config.interfaces);
  const [leapSecond, setLeapSecond] = useState<string>(config.leap_second ?? "default");
  const [vrf, setVrf] = useState(config.vrf ?? "");
  const [timestampInterfaces, setTimestampInterfaces] = useState<NTPTimestampInterface[]>(
    config.timestamp_interfaces
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showTimestampFilters =
    capabilities?.features.timestamp_receive_filter.supported ?? false;
  const receiveFilterValues =
    capabilities?.features.timestamp_receive_filter.values ?? ["all", "ntp", "ptp", "none"];

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const update: NTPGlobalSettingsUpdate = {
      original: config,
      listenAddresses,
      allowClients,
      interfaces,
      leapSecond: leapSecond === "default" ? "" : leapSecond,
      vrf,
      timestampInterfaces: showTimestampFilters
        ? timestampInterfaces
        : config.timestamp_interfaces,
    };
    try {
      await ntpService.updateGlobalSettings(update);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>
            {t("settings.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6 py-1">
            <MultiValueField
              label={t("settings.listenAddresses")}
              description={t("settings.listenAddressesHint")}
              placeholder={t("settings.listenAddressesPlaceholder")}
              values={listenAddresses}
              onAdd={(v) => setListenAddresses((prev) => [...prev, v])}
              onRemove={(v) =>
                setListenAddresses((prev) => prev.filter((a) => a !== v))
              }
              validate={(v) =>
                isValidIPOrCIDR(v) ? null : t("settings.invalidAddress")
              }
            />

            <Separator />

            <MultiValueField
              label={t("settings.allowClients")}
              description={t("settings.allowClientsHint")}
              placeholder={t("settings.allowClientsPlaceholder")}
              values={allowClients}
              onAdd={(v) => setAllowClients((prev) => [...prev, v])}
              onRemove={(v) =>
                setAllowClients((prev) => prev.filter((a) => a !== v))
              }
              validate={(v) =>
                isValidIPOrCIDR(v) ? null : t("settings.invalidAddressOrCidr")
              }
            />

            <Separator />

            <MultiValueField
              label={t("settings.interfaces")}
              description={t("settings.interfacesHint")}
              placeholder={t("settings.interfacesPlaceholder")}
              values={interfaces}
              onAdd={(v) => setInterfaces((prev) => [...prev, v])}
              onRemove={(v) => setInterfaces((prev) => prev.filter((i) => i !== v))}
            />

            <Separator />

            {/* Leap second */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("settings.leapSecond")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.leapSecondHint")}
              </p>
              <Select value={leapSecond} onValueChange={setLeapSecond}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAP_SECOND_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="font-medium">{t(`leapSecond.${opt.value}`)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t(`leapSecond.${opt.value}Desc`)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* VRF */}
            <div className="space-y-1.5">
              <Label htmlFor="ntp-vrf" className="text-sm font-medium">
                {t("settings.vrf")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.vrfHint")}
              </p>
              <VrfSelect
                id="ntp-vrf"
                placeholder={t("settings.vrfPlaceholder")}
                value={vrf}
                onValueChange={setVrf}
                extraOptions={[{ label: tc("default"), value: "default" }]}
              />
            </div>

            {showTimestampFilters && (
              <>
                <Separator />
                <TimestampFilterField
                  values={timestampInterfaces}
                  filterOptions={receiveFilterValues}
                  onAdd={(iface, filter) =>
                    setTimestampInterfaces((prev) => [
                      ...prev.filter((t) => t.interface !== iface),
                      { interface: iface, receive_filter: filter },
                    ])
                  }
                  onRemove={(iface) =>
                    setTimestampInterfaces((prev) =>
                      prev.filter((t) => t.interface !== iface)
                    )
                  }
                />
              </>
            )}
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
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
