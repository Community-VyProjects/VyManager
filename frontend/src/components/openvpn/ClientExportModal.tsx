"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import {
  openvpnService,
  type OpenvpnInterface,
  type OpenvpnExportCertificate,
} from "@/lib/api/openvpn";
import { ApiError } from "@/lib/types/api";

interface ClientExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interfaceData: OpenvpnInterface | null;
}

// Radix Select can't use an empty-string value, so use sentinels.
const SAME_AS_CERT = "__same__"; // derive client key from the certificate
const MANUAL = "__manual__"; // pick the certificate by hand (not by assigned client)

export function ClientExportModal({
  open,
  onOpenChange,
  interfaceData,
}: ClientExportModalProps) {
  const t = useTranslations("openvpnTools");
  const tc = useTranslations("common");
  const [caOptions, setCaOptions] = useState<string[]>([]);
  const [certs, setCerts] = useState<OpenvpnExportCertificate[]>([]);

  const [ca, setCa] = useState("");
  const [assignedClient, setAssignedClient] = useState(MANUAL);
  const [certificate, setCertificate] = useState("");
  const [keyName, setKeyName] = useState(SAME_AS_CERT);
  const [remoteHost, setRemoteHost] = useState("");

  const [optionsLoading, setOptionsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<{
    filename: string;
    config: string;
  } | null>(null);

  // Per-client ("assigned user") entries configured on this server.
  const clients = useMemo(
    () => interfaceData?.server?.clients ?? [],
    [interfaceData],
  );
  const hasClients = clients.length > 0;

  // Map a certificate Common Name -> certificate node name (first match wins).
  const cnToCert = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of certs) {
      if (c.cn && !map.has(c.cn)) map.set(c.cn, c.name);
    }
    return map;
  }, [certs]);

  // Reset + load PKI material (with decoded CNs) whenever the modal opens.
  useEffect(() => {
    if (!open || !interfaceData) return;

    setError(null);
    setResult(null);
    setKeyName(SAME_AS_CERT);
    setCertificate("");
    setAssignedClient(MANUAL);
    setCa(interfaceData.tls?.ca_certificates?.[0] ?? "");
    setRemoteHost(
      interfaceData.local_host ?? interfaceData.remote_host?.[0] ?? "",
    );

    let cancelled = false;
    setOptionsLoading(true);
    openvpnService
      .getExportOptions()
      .then((opts) => {
        if (cancelled) return;
        setCaOptions(opts.cas);
        setCerts(opts.certificates);

        const configuredCa = interfaceData.tls?.ca_certificates?.[0];
        if (configuredCa && opts.cas.includes(configuredCa)) {
          setCa(configuredCa);
        } else if (opts.cas.length === 1) {
          setCa(opts.cas[0]);
        }

        // If this server has per-client entries, preselect the first enabled
        // one and auto-match its certificate by CN.
        const firstClient = clients.find((c) => !c.disable) ?? clients[0];
        if (firstClient) {
          setAssignedClient(firstClient.name);
          const cnMap = new Map<string, string>();
          for (const c of opts.certificates) {
            if (c.cn && !cnMap.has(c.cn)) cnMap.set(c.cn, c.name);
          }
          setCertificate(cnMap.get(firstClient.name) ?? "");
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError((err as ApiError).message || t("export.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, interfaceData, clients, t]);

  const handleAssignedClientChange = (value: string) => {
    setAssignedClient(value);
    if (value !== MANUAL) {
      setCertificate(cnToCert.get(value) ?? "");
    }
  };

  const handleCertificateChange = (value: string) => {
    setCertificate(value);
    // Manual override breaks the "matched by assigned client" link.
    if (hasClients) setAssignedClient(MANUAL);
  };

  // Hint state for the assigned-client matching.
  const selectedClient =
    assignedClient !== MANUAL
      ? clients.find((c) => c.name === assignedClient)
      : undefined;
  const matchedCertName =
    assignedClient !== MANUAL ? (cnToCert.get(assignedClient) ?? null) : null;
  const noMatch = assignedClient !== MANUAL && matchedCertName === null;

  const certLabel = (c: OpenvpnExportCertificate) =>
    c.cn ? `${c.name} — CN: ${c.cn}` : c.name;

  const handleGenerate = async () => {
    if (!interfaceData) return;
    if (!ca) {
      setError(t("export.selectCaError"));
      return;
    }
    if (!certificate) {
      setError(t("export.selectCertError"));
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const res = await openvpnService.exportClientConfig({
        interface: interfaceData.name,
        ca,
        certificate,
        key: keyName === SAME_AS_CERT ? undefined : keyName,
        remote_host: remoteHost.trim() || undefined,
      });
      if (res.success && res.config) {
        setResult({
          filename: res.filename || `${interfaceData.name}-${certificate}.ovpn`,
          config: res.config,
        });
      } else {
        setError(res.error || t("export.generateFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("export.generateFailed"));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.config], {
      type: "application/x-openvpn-profile",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            {t("export.title")}
          </DialogTitle>
          <DialogDescription>
            {result
              ? t("export.resultDescription", { name: interfaceData.name })
              : t("export.description", { name: interfaceData.name })}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-remote-host">
                {t("export.serverAddress")}
              </Label>
              <Input
                id="export-remote-host"
                value={remoteHost}
                onChange={(e) => setRemoteHost(e.target.value)}
                placeholder="vpn.example.com"
              />
              <p className="text-xs text-muted-foreground">
                {t.rich("export.serverAddressHint", {
                  code: (chunks) => <code className="font-mono">{chunks}</code>,
                })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("export.caCertificate")}</Label>
              <Select
                value={ca}
                onValueChange={setCa}
                disabled={optionsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      optionsLoading ? t("export.loading") : t("export.selectCa")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {caOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasClients && (
              <div className="space-y-2">
                <Label>{t("export.assignedClient")}</Label>
                <Select
                  value={assignedClient}
                  onValueChange={handleAssignedClientChange}
                  disabled={optionsLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                        {c.disable ? t("export.disabledSuffix") : ""}
                      </SelectItem>
                    ))}
                    <SelectItem value={MANUAL}>
                      {t("export.manual")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {selectedClient && matchedCertName && (
                  <p className="text-xs text-muted-foreground">
                    {t.rich("export.matchedCert", {
                      cert: matchedCertName,
                      mono: (chunks) => (
                        <span className="font-mono">{chunks}</span>
                      ),
                    })}
                    {selectedClient.ip.length > 0 ? (
                      <>
                        {" "}
                        {t.rich("export.fixedIp", {
                          ip: selectedClient.ip.join(", "),
                          mono: (chunks) => (
                            <span className="font-mono">{chunks}</span>
                          ),
                        })}
                      </>
                    ) : null}
                  </p>
                )}
                {noMatch && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-500">
                      {t.rich("export.noMatch", {
                        name: assignedClient,
                        mono: (chunks) => (
                          <span className="font-mono">{chunks}</span>
                        ),
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("export.clientCertificate")}</Label>
              <Select
                value={certificate}
                onValueChange={handleCertificateChange}
                disabled={optionsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      optionsLoading
                        ? t("export.loading")
                        : t("export.selectClientCert")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {certs.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {certLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("export.clientKey")}</Label>
              <Select
                value={keyName}
                onValueChange={setKeyName}
                disabled={optionsLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SAME_AS_CERT}>
                    {t("export.sameAsCert")}
                  </SelectItem>
                  {certs.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap">
                  {error}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-green-600/20 bg-green-600/10 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{t("export.profileReady")}</p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {result.filename}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("export.secretWarning")}
            </p>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={generating}
              >
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating || optionsLoading}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("export.generating")}
                  </>
                ) : (
                  t("export.generate")
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setResult(null)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("back")}
              </Button>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                {t("export.download")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
