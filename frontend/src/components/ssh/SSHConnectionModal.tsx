"use client";

import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { sshService, SSHConfig, SSHCapabilities } from "@/lib/api/ssh";
import { SSHMultiValueField, isValidIP } from "./SSHMultiValueField";
import { VrfMultiSelect } from "@/components/ui/vrf-multi-select";

interface SSHConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SSHConfig;
  capabilities: SSHCapabilities;
  onSuccess: () => void;
}

const DEFAULT_LOGLEVEL = "__default__";

function isPort(v: string): boolean {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

export function SSHConnectionModal({
  open,
  onOpenChange,
  config,
  capabilities,
  onSuccess,
}: SSHConnectionModalProps) {
  const t = useTranslations("ssh");
  const tc = useTranslations("common");
  const [ports, setPorts] = useState<string[]>(config.ports);
  const [listenAddresses, setListenAddresses] = useState<string[]>(config.listen_addresses);
  const [vrfs, setVrfs] = useState<string[]>(config.vrfs);
  const [loglevel, setLoglevel] = useState(config.loglevel ?? DEFAULT_LOGLEVEL);
  const [keepalive, setKeepalive] = useState(config.client_keepalive_interval ?? "");
  const [rekeyData, setRekeyData] = useState(config.rekey.data ?? "");
  const [rekeyTime, setRekeyTime] = useState(config.rekey.time ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const next: SSHConfig = {
      ...config,
      ports,
      listen_addresses: listenAddresses,
      vrfs,
      loglevel: loglevel === DEFAULT_LOGLEVEL ? null : loglevel,
      client_keepalive_interval: keepalive.trim() || null,
      rekey: { data: rekeyData.trim() || null, time: rekeyTime.trim() || null },
    };
    try {
      await sshService.updateConfig(config, next);
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
          <DialogTitle>{t("connection.title")}</DialogTitle>
          <DialogDescription>
            {t("connection.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            <SSHMultiValueField
              label={t("content.ports")}
              description={t("connection.portsHelp", { port: String(capabilities.features.port.default) })}
              placeholder={t("connection.portsPlaceholder")}
              values={ports}
              onChange={setPorts}
              validate={(v) => (isPort(v) ? null : t("connection.portRange"))}
            />

            <Separator />

            <SSHMultiValueField
              label={t("content.listenAddresses")}
              description={t("connection.listenHelp")}
              placeholder={t("connection.listenPlaceholder")}
              values={listenAddresses}
              onChange={setListenAddresses}
              validate={(v) => (isValidIP(v) ? null : t("connection.invalidIp"))}
            />

            <Separator />

            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">VRFs</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("connection.vrfsHelp")}
                </p>
              </div>
              <VrfMultiSelect
                values={vrfs}
                onChange={setVrfs}
                placeholder={t("connection.selectVrf")}
                extraOptions={[{ label: tc("default"), value: "default" }]}
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("content.logLevel")}</Label>
              <Select value={loglevel} onValueChange={setLoglevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_LOGLEVEL}>
                    {t("content.defaultValue", { value: String(capabilities.features.loglevel.default) })}
                  </SelectItem>
                  {(capabilities.features.loglevel.values ?? []).map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ssh-keepalive" className="text-sm font-medium">
                {t("connection.keepaliveInterval")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("connection.keepaliveHelp")}
              </p>
              <Input
                id="ssh-keepalive"
                type="number"
                min={1}
                max={65535}
                placeholder={t("connection.keepalivePlaceholder")}
                value={keepalive}
                onChange={(e) => setKeepalive(e.target.value)}
              />
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium">{t("connection.rekeyLimits")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("connection.rekeyHelp")}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rekey-data" className="text-xs font-medium">
                    {t("connection.dataMb")}
                  </Label>
                  <Input
                    id="rekey-data"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder={t("connection.dataPlaceholder")}
                    value={rekeyData}
                    onChange={(e) => setRekeyData(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rekey-time" className="text-xs font-medium">
                    {t("connection.timeMinutes")}
                  </Label>
                  <Input
                    id="rekey-time"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder={t("connection.timePlaceholder")}
                    value={rekeyTime}
                    onChange={(e) => setRekeyTime(e.target.value)}
                  />
                </div>
              </div>
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
