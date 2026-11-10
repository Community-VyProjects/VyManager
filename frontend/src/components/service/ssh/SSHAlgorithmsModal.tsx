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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import { sshService, SSHConfig, SSHCapabilities } from "@/lib/api/ssh";
import { SSHAlgorithmSelect } from "./SSHAlgorithmSelect";

interface SSHAlgorithmsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SSHConfig;
  capabilities: SSHCapabilities;
  onSuccess: () => void;
}

export function SSHAlgorithmsModal({
  open,
  onOpenChange,
  config,
  capabilities,
  onSuccess,
}: SSHAlgorithmsModalProps) {
  const t = useTranslations("ssh");
  const tc = useTranslations("common");
  const f = capabilities.features;

  const [ciphers, setCiphers] = useState<string[]>(config.ciphers);
  const [macs, setMacs] = useState<string[]>(config.macs);
  const [keyExchanges, setKeyExchanges] = useState<string[]>(config.key_exchanges);
  const [hostkeyAlgorithms, setHostkeyAlgorithms] = useState<string[]>(config.hostkey_algorithms);
  const [pubkeyAlgorithms, setPubkeyAlgorithms] = useState<string[]>(config.pubkey_accepted_algorithms);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const next: SSHConfig = {
      ...config,
      ciphers,
      macs,
      key_exchanges: keyExchanges,
      hostkey_algorithms: hostkeyAlgorithms,
      pubkey_accepted_algorithms: pubkeyAlgorithms,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("content.cryptoAlgorithms")}</DialogTitle>
          <DialogDescription>
            {t("algorithms.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            <SSHAlgorithmSelect
              label={t("content.ciphers")}
              description={t("algorithms.ciphersHelp")}
              options={f.cipher.values ?? []}
              selected={ciphers}
              onChange={setCiphers}
            />
            <Separator />
            <SSHAlgorithmSelect
              label="MACs"
              description={t("algorithms.macsHelp")}
              options={f.mac.values ?? []}
              selected={macs}
              onChange={setMacs}
            />
            <Separator />
            <SSHAlgorithmSelect
              label={t("content.keyExchange")}
              description={t("algorithms.kexHelp")}
              options={f.key_exchange.values ?? []}
              selected={keyExchanges}
              onChange={setKeyExchanges}
            />
            <Separator />
            <SSHAlgorithmSelect
              label={t("content.hostKeyAlgorithms")}
              description={t("algorithms.hostKeyHelp")}
              options={f.hostkey_algorithm.values ?? []}
              selected={hostkeyAlgorithms}
              onChange={setHostkeyAlgorithms}
            />
            <Separator />
            <SSHAlgorithmSelect
              label={t("content.pubkeyAlgorithms")}
              description={t("algorithms.pubkeyHelp")}
              options={f.pubkey_accepted_algorithm.values ?? []}
              selected={pubkeyAlgorithms}
              onChange={setPubkeyAlgorithms}
            />
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
