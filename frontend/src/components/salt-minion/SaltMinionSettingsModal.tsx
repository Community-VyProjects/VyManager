"use client";

import { useState, useEffect, KeyboardEvent } from "react";
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
import { saltMinionService, SaltMinionConfig, SaltMinionSettingsUpdate } from "@/lib/api/salt-minion";
import { showService } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface SaltMinionSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SaltMinionConfig;
  onSuccess: () => void;
}

const HASH_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "default",  label: "Default (SHA-256)", description: "Use VyOS default — sha256" },
  { value: "sha256",   label: "SHA-256",            description: "Recommended — explicit sha256" },
  { value: "sha384",   label: "SHA-384",            description: "Higher security variant of SHA-2" },
  { value: "sha512",   label: "SHA-512",            description: "Strongest SHA-2 variant" },
  { value: "sha224",   label: "SHA-224",            description: "Truncated SHA-2 variant" },
  { value: "sha1",     label: "SHA-1",              description: "Legacy — not recommended for new deployments" },
  { value: "md5",      label: "MD5",               description: "Legacy — not recommended for new deployments" },
];

interface IfaceOption {
  name: string;
  type: string;
  description: string | null;
}

interface MultiValueFieldProps {
  label: string;
  description: string;
  placeholder: string;
  values: string[];
  onAdd: (val: string) => void;
  onRemove: (val: string) => void;
}

function MultiValueField({
  label,
  description,
  placeholder,
  values,
  onAdd,
  onRemove,
}: MultiValueFieldProps) {
  const [input, setInput] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleAdd = () => {
    const val = input.trim();
    if (!val) return;
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

export function SaltMinionSettingsModal({
  open,
  onOpenChange,
  config,
  onSuccess,
}: SaltMinionSettingsModalProps) {
  const [masters, setMasters] = useState<string[]>(config.masters);
  const [id, setId] = useState(config.id ?? "");
  const [interval, setInterval] = useState(
    config.interval !== null ? String(config.interval) : ""
  );
  const [hash, setHash] = useState(config.hash ?? "default");
  const [masterKey, setMasterKey] = useState(config.master_key ?? "");
  const [sourceInterface, setSourceInterface] = useState(config.source_interface ?? "none");

  const [ifaces, setIfaces] = useState<IfaceOption[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    showService
      .getAllInterfaces()
      .then((r) => setIfaces(r.interfaces))
      .catch(() => setIfaces([]));
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const update: SaltMinionSettingsUpdate = {
      original: config,
      masters,
      id,
      interval,
      hash,
      masterKey,
      sourceInterface: sourceInterface === "none" ? "" : sourceInterface,
    };
    try {
      await saltMinionService.updateSettings(update);
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
          <DialogTitle>Edit Salt Minion Settings</DialogTitle>
          <DialogDescription>
            Configure master servers, minion identity, and connection options
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6 py-1">
            {/* Masters */}
            <MultiValueField
              label="Master Servers"
              description="Hostname or IP address of each Salt master. At least one is required for the minion to connect."
              placeholder="e.g. salt-master.example.com or 10.0.0.1"
              values={masters}
              onAdd={(v) => setMasters((prev) => [...prev, v])}
              onRemove={(v) => setMasters((prev) => prev.filter((m) => m !== v))}
            />

            <Separator />

            {/* Minion ID */}
            <div className="space-y-1.5">
              <Label htmlFor="sm-id" className="text-sm font-medium">
                Minion ID
              </Label>
              <p className="text-xs text-muted-foreground">
                Unique identifier for this minion. Leave empty to use the system hostname.
              </p>
              <Input
                id="sm-id"
                placeholder="Hostname (default)"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </div>

            <Separator />

            {/* Update Interval */}
            <div className="space-y-1.5">
              <Label htmlFor="sm-interval" className="text-sm font-medium">
                Update Interval
              </Label>
              <p className="text-xs text-muted-foreground">
                How often (in minutes) the minion checks in with the master. Range: 1–1440. Leave empty to use the default (60 min).
              </p>
              <div className="flex items-center gap-2">
                <Input
                  id="sm-interval"
                  type="number"
                  min={1}
                  max={1440}
                  placeholder="60 (default)"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-40"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>

            <Separator />

            {/* Hash Algorithm */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Hash Algorithm</Label>
              <p className="text-xs text-muted-foreground">
                Hash used when discovering files on the master server.
              </p>
              <Select value={hash} onValueChange={setHash}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HASH_OPTIONS.map((opt) => (
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

            {/* Master Key URL */}
            <div className="space-y-1.5">
              <Label htmlFor="sm-master-key" className="text-sm font-medium">
                Master Key URL
              </Label>
              <p className="text-xs text-muted-foreground">
                URL containing the master&apos;s public key signature for auth reply verification. Leave empty to skip verification.
              </p>
              <Input
                id="sm-master-key"
                placeholder="https://..."
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
              />
            </div>

            <Separator />

            {/* Source Interface */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Source Interface</Label>
              <p className="text-xs text-muted-foreground">
                Network interface used to establish the connection to the master. Leave unset to use the default route.
              </p>
              <InterfaceSelect
                value={sourceInterface}
                onValueChange={setSourceInterface}
                interfaces={ifaces.map((i) => ({ name: i.name, type: i.type, description: i.description ?? null }))}
                noneOption={{ label: "None", value: "none" }}
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
