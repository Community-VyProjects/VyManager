"use client";

import { useState, KeyboardEvent } from "react";
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

interface NTPGlobalSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: NTPConfig;
  onSuccess: () => void;
}

function isValidIPOrCIDR(value: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  const ipv6 = /^[0-9a-fA-F:]+(?:\/\d{1,3})?$/;
  return ipv4.test(value) || ipv6.test(value);
}

// "default" is a UI sentinel meaning "delete the leap-second node" (let VyOS use its default)
const LEAP_SECOND_OPTIONS: { value: string; label: string; description: string }[] = [
  {
    value: "default",
    label: "Default",
    description: "Use UTC timezone database (VyOS default behaviour)",
  },
  {
    value: "timezone",
    label: "Timezone",
    description: "Explicitly set: use UTC timezone database to determine leap second",
  },
  {
    value: "ignore",
    label: "Ignore",
    description: "No correction is applied to the clock",
  },
  {
    value: "smear",
    label: "Smear",
    description: "Correct time gradually by slewing instead of stepping",
  },
  {
    value: "system",
    label: "System",
    description: "Kernel steps the system clock forward or backward",
  },
];

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
      setFieldError("Already added");
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

export function NTPGlobalSettingsModal({
  open,
  onOpenChange,
  config,
  onSuccess,
}: NTPGlobalSettingsModalProps) {
  const [listenAddresses, setListenAddresses] = useState<string[]>(
    config.listen_addresses
  );
  const [allowClients, setAllowClients] = useState<string[]>(config.allow_clients);
  const [interfaces, setInterfaces] = useState<string[]>(config.interfaces);
  const [leapSecond, setLeapSecond] = useState<string>(config.leap_second ?? "default");
  const [vrf, setVrf] = useState(config.vrf ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    };
    try {
      await ntpService.updateGlobalSettings(update);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit NTP Settings</DialogTitle>
          <DialogDescription>
            Configure listen addresses, client restrictions, and global NTP behaviour
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6 py-1">
            <MultiValueField
              label="Listen Addresses"
              description="Local IP addresses to bind the NTP service to. Leave empty to listen on all interfaces."
              placeholder="e.g. 192.168.1.1 or 2001:db8::1"
              values={listenAddresses}
              onAdd={(v) => setListenAddresses((prev) => [...prev, v])}
              onRemove={(v) =>
                setListenAddresses((prev) => prev.filter((a) => a !== v))
              }
              validate={(v) =>
                isValidIPOrCIDR(v) ? null : "Enter a valid IPv4 or IPv6 address"
              }
            />

            <Separator />

            <MultiValueField
              label="Allow Clients"
              description="Restrict NTP service to specific client addresses or subnets. Leave empty to allow all clients."
              placeholder="e.g. 10.0.0.0/8 or 192.168.1.0/24"
              values={allowClients}
              onAdd={(v) => setAllowClients((prev) => [...prev, v])}
              onRemove={(v) =>
                setAllowClients((prev) => prev.filter((a) => a !== v))
              }
              validate={(v) =>
                isValidIPOrCIDR(v) ? null : "Enter a valid IPv4/IPv6 address or CIDR"
              }
            />

            <Separator />

            <MultiValueField
              label="Interfaces"
              description="Listen for NTP on specific network interfaces only. Leave empty for all interfaces."
              placeholder="e.g. eth0 or bond0"
              values={interfaces}
              onAdd={(v) => setInterfaces((prev) => [...prev, v])}
              onRemove={(v) => setInterfaces((prev) => prev.filter((i) => i !== v))}
            />

            <Separator />

            {/* Leap second */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Leap Second Handling</Label>
              <p className="text-xs text-muted-foreground">
                How the system clock behaves when a leap second is inserted
              </p>
              <Select value={leapSecond} onValueChange={setLeapSecond}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAP_SECOND_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="font-medium">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {opt.description}
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
                VRF Instance
              </Label>
              <p className="text-xs text-muted-foreground">
                Bind the NTP service to a specific VRF. Leave empty to use the default routing table.
              </p>
              <Input
                id="ntp-vrf"
                placeholder="e.g. mgmt"
                value={vrf}
                onChange={(e) => setVrf(e.target.value)}
              />
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
