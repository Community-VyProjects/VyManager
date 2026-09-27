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
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (ip: string, port: number | null) => Promise<void>;
}

export function DNSForwardingNameServerModal({ open, onOpenChange, onSubmit }: Props) {
  const t = useTranslations("dnsForwarding");
  const tc = useTranslations("common");
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIp("");
      setPort("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!ip.trim()) {
      setError(t("nameServer.ipRequired"));
      return;
    }
    const portNum = port ? parseInt(port, 10) : null;
    if (port && (isNaN(portNum!) || portNum! < 1 || portNum! > 65535)) {
      setError(t("nameServer.portRange"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(ip.trim(), portNum);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("content.addNameServer")}</DialogTitle>
          <DialogDescription>{t("nameServer.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ns-ip">{t("content.ipAddress")}</Label>
            <Input
              id="ns-ip"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder={t("nameServer.ipPlaceholder")}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ns-port">{t("nameServer.portOptional")}</Label>
            <Input
              id="ns-port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder={t("defaultValue", { value: "53" })}
              min={1}
              max={65535}
              className="font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("adding")}</> : tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
