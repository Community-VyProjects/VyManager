"use client";

import { useState, useEffect, KeyboardEvent } from "react";
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

// Descriptions (and the "default" label) are translated at render time via hash.<value>
const HASH_OPTIONS = [
  { value: "default",  label: null },
  { value: "sha256",   label: "SHA-256" },
  { value: "sha384",   label: "SHA-384" },
  { value: "sha512",   label: "SHA-512" },
  { value: "sha224",   label: "SHA-224" },
  { value: "sha1",     label: "SHA-1" },
  { value: "md5",      label: "MD5" },
] as const;

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
  const t = useTranslations("saltMinion");
  const [input, setInput] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleAdd = () => {
    const val = input.trim();
    if (!val) return;
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

export function SaltMinionSettingsModal({
  open,
  onOpenChange,
  config,
  onSuccess,
}: SaltMinionSettingsModalProps) {
  const t = useTranslations("saltMinion");
  const tc = useTranslations("common");
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
            {/* Masters */}
            <MultiValueField
              label={t("settings.masterServers")}
              description={t("settings.masterServersHint")}
              placeholder={t("settings.masterServersPlaceholder")}
              values={masters}
              onAdd={(v) => setMasters((prev) => [...prev, v])}
              onRemove={(v) => setMasters((prev) => prev.filter((m) => m !== v))}
            />

            <Separator />

            {/* Minion ID */}
            <div className="space-y-1.5">
              <Label htmlFor="sm-id" className="text-sm font-medium">
                {t("settings.minionId")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.minionIdHint")}
              </p>
              <Input
                id="sm-id"
                placeholder={t("settings.minionIdPlaceholder")}
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </div>

            <Separator />

            {/* Update Interval */}
            <div className="space-y-1.5">
              <Label htmlFor="sm-interval" className="text-sm font-medium">
                {t("settings.interval")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.intervalHint")}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  id="sm-interval"
                  type="number"
                  min={1}
                  max={1440}
                  placeholder={t("settings.intervalPlaceholder")}
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-40"
                />
                <span className="text-sm text-muted-foreground">{t("settings.minutes")}</span>
              </div>
            </div>

            <Separator />

            {/* Hash Algorithm */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("settings.hash")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.hashHint")}
              </p>
              <Select value={hash} onValueChange={setHash}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HASH_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="font-medium">{opt.label ?? t("hash.defaultLabel")}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t(`hash.${opt.value}`)}
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
                {t("settings.masterKeyUrl")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.masterKeyUrlHint")}
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
              <Label className="text-sm font-medium">{t("settings.sourceInterface")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.sourceInterfaceHint")}
              </p>
              <InterfaceSelect
                value={sourceInterface}
                onValueChange={setSourceInterface}
                interfaces={ifaces.map((i) => ({ name: i.name, type: i.type, description: i.description ?? null }))}
                noneOption={{ label: tc("none"), value: "none" }}
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
