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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { CachePeer, WebProxyCapabilities } from "@/lib/api/webproxy";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peer: CachePeer | null;
  caps: WebProxyCapabilities | null;
  onSubmit: (peer: CachePeer, isEdit: boolean) => Promise<void>;
}

const numOrNull = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
};

export function WebProxyCachePeerModal({ open, onOpenChange, peer, caps, onSubmit }: Props) {
  const t = useTranslations("webproxy");
  const tc = useTranslations("common");
  const isEdit = !!peer;
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("");
  const [httpPort, setHttpPort] = useState("");
  const [icpPort, setIcpPort] = useState("");
  const [options, setOptions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(peer?.name ?? "");
      setAddress(peer?.address ?? "");
      setType(peer?.type ?? "");
      setHttpPort(peer?.http_port != null ? String(peer.http_port) : "");
      setIcpPort(peer?.icp_port != null ? String(peer.icp_port) : "");
      setOptions(peer?.options ?? "");
      setError(null);
    }
  }, [open, peer]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t("peer.nameRequired"));
      return;
    }
    if (!address.trim()) {
      setError(t("peer.addressRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim(),
        type: type || null,
        http_port: numOrNull(httpPort),
        icp_port: numOrNull(icpPort),
        options: options.trim() || null,
      }, isEdit);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("peer.editTitle") : t("peer.addTitle")}</DialogTitle>
          <DialogDescription>{t("peer.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cp-name">{t("peer.name")}</Label>
            <Input id="cp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="upstream-cache" disabled={isEdit} className={isEdit ? "bg-muted font-mono" : "font-mono"} />
            {isEdit && <p className="text-xs text-muted-foreground">{t("common.nameImmutable")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-address">{t("peer.addressHostname")}</Label>
            <Input id="cp-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("peer.addressPlaceholder")} className="font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("content.type")}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder={tc("shown.parent")} /></SelectTrigger>
                <SelectContent>
                  {(caps?.options.cache_peer_type ?? ["parent", "sibling", "multicast"]).map((pt) => (
                    <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-http">{t("content.httpPort")}</Label>
              <Input id="cp-http" type="number" value={httpPort} onChange={(e) => setHttpPort(e.target.value)} placeholder="3128" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-icp">{t("content.icpPort")}</Label>
              <Input id="cp-icp" type="number" value={icpPort} onChange={(e) => setIcpPort(e.target.value)} placeholder="0" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-options">{t("content.options")}</Label>
              {/* eslint-disable-next-line vymanager/no-untranslated-text -- example value */}
              <Input id="cp-options" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="no-query default" className="font-mono" />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : isEdit ? tc("saveChanges") : t("content.addPeer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
