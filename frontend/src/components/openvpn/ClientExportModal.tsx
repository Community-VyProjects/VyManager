"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

  const [result, setResult] = useState<{ filename: string; config: string } | null>(null);

  // Per-client ("assigned user") entries configured on this server.
  const clients = useMemo(
    () => interfaceData?.server?.clients ?? [],
    [interfaceData]
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
    setRemoteHost(interfaceData.local_host ?? interfaceData.remote_host?.[0] ?? "");

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
        if (!cancelled) setError((err as ApiError).message || "Failed to load PKI material");
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, interfaceData, clients]);

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
    assignedClient !== MANUAL ? clients.find((c) => c.name === assignedClient) : undefined;
  const matchedCertName =
    assignedClient !== MANUAL ? cnToCert.get(assignedClient) ?? null : null;
  const noMatch = assignedClient !== MANUAL && matchedCertName === null;

  const certLabel = (c: OpenvpnExportCertificate) =>
    c.cn ? `${c.name} — CN: ${c.cn}` : c.name;

  const handleGenerate = async () => {
    if (!interfaceData) return;
    if (!ca) {
      setError("Select a CA certificate");
      return;
    }
    if (!certificate) {
      setError("Select a client certificate");
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
        setError(res.error || "Failed to generate client config");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to generate client config");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.config], { type: "application/x-openvpn-profile" });
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
            Export Client Config
          </DialogTitle>
          <DialogDescription>
            {result
              ? `Client profile for ${interfaceData.name}`
              : `Generate a ready-to-use .ovpn for ${interfaceData.name}`}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-remote-host">Server address</Label>
              <Input
                id="export-remote-host"
                value={remoteHost}
                onChange={(e) => setRemoteHost(e.target.value)}
                placeholder="vpn.example.com"
              />
              <p className="text-xs text-muted-foreground">
                Public hostname or IP clients connect to. Fills the{" "}
                <code className="font-mono">remote</code> line.
              </p>
            </div>

            <div className="space-y-2">
              <Label>CA certificate</Label>
              <Select value={ca} onValueChange={setCa} disabled={optionsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={optionsLoading ? "Loading…" : "Select CA"} />
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
                <Label>Assigned client</Label>
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
                        {c.disable ? " (disabled)" : ""}
                      </SelectItem>
                    ))}
                    <SelectItem value={MANUAL}>Other / pick certificate manually</SelectItem>
                  </SelectContent>
                </Select>
                {selectedClient && matchedCertName && (
                  <p className="text-xs text-muted-foreground">
                    Matched certificate <span className="font-mono">{matchedCertName}</span>
                    {selectedClient.ip ? (
                      <>
                        {" "}
                        · server assigns fixed IP{" "}
                        <span className="font-mono">{selectedClient.ip}</span>
                      </>
                    ) : null}
                  </p>
                )}
                {noMatch && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-500">
                      No certificate has a Common Name of{" "}
                      <span className="font-mono">{assignedClient}</span>. Per-client
                      settings (fixed IP, routes) won&apos;t apply unless the exported
                      certificate&apos;s CN matches. Pick a certificate below.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Client certificate</Label>
              <Select
                value={certificate}
                onValueChange={handleCertificateChange}
                disabled={optionsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={optionsLoading ? "Loading…" : "Select client certificate"}
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
              <Label>Client key</Label>
              <Select value={keyName} onValueChange={setKeyName} disabled={optionsLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SAME_AS_CERT}>Same as certificate</SelectItem>
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
                <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-green-600/20 bg-green-600/10 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Client profile ready</p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {result.filename}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Includes the CA, client certificate/key and the server&apos;s TLS key.
              Treat this file as a secret &mdash; anyone with it can connect.
            </p>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generating || optionsLoading}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setResult(null)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
