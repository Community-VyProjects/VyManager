"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  Network,
  Shield,
  Key,
  Code2,
} from "lucide-react";
import { httpsService, HTTPSConfig, HTTPSApiKey } from "@/lib/api/https";
import { pkiService, PKICertificate, PKICA, PKIDH } from "@/lib/api/pki";

interface HTTPSModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config: HTTPSConfig | null;
}

interface ApiKeyRow extends HTTPSApiKey {
  key_: number;
  revealed: boolean;
}

const EMPTY_CONFIG: HTTPSConfig = {
  listen_addresses: [],
  allow_client_addresses: [],
  port: null,
  request_body_size_limit: null,
  tls_versions: [],
  vrf: null,
  enable_http_redirect: false,
  certificates: {},
  api: {
    keys: [],
    graphql: { enabled: false, introspection: false, authentication: {}, cors_allow_origins: [] },
    rest: { enabled: false, debug: false, strict: false },
  },
};

export function HTTPSModal({ open, onClose, onSuccess, config }: HTTPSModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PKI data
  const [pkiCerts, setPkiCerts] = useState<PKICertificate[]>([]);
  const [pkiCAs, setPkiCAs] = useState<PKICA[]>([]);
  const [pkiDH, setPkiDH] = useState<PKIDH[]>([]);
  const [pkiLoading, setPkiLoading] = useState(false);

  // Tab 1 — General
  const [listenAddresses, setListenAddresses] = useState<string[]>([]);
  const [listenInput, setListenInput] = useState("");
  const [allowClientAddresses, setAllowClientAddresses] = useState<string[]>([]);
  const [allowClientInput, setAllowClientInput] = useState("");
  const [port, setPort] = useState("");
  const [requestBodySizeLimit, setRequestBodySizeLimit] = useState("");
  const [httpRedirect, setHttpRedirect] = useState(false);
  const [tls12, setTls12] = useState(false);
  const [tls13, setTls13] = useState(false);
  const [vrf, setVrf] = useState("");

  // Tab 2 — Certificates
  const [certificate, setCertificate] = useState("");
  const [caCertificate, setCaCertificate] = useState("");
  const [dhParams, setDhParams] = useState("");

  // Tab 3 — API Keys
  const [keyRows, setKeyRows] = useState<ApiKeyRow[]>([]);
  const [nextKeyIndex, setNextKeyIndex] = useState(0);
  const [newKeyId, setNewKeyId] = useState("");
  const [newKeySecret, setNewKeySecret] = useState("");

  // Tab 4 — REST API
  const [restEnabled, setRestEnabled] = useState(false);
  const [restDebug, setRestDebug] = useState(false);
  const [restStrict, setRestStrict] = useState(false);

  // Tab 5 — GraphQL
  const [graphqlEnabled, setGraphqlEnabled] = useState(false);
  const [graphqlIntrospection, setGraphqlIntrospection] = useState(false);
  const [graphqlAuthType, setGraphqlAuthType] = useState("key");
  const [graphqlExpiration, setGraphqlExpiration] = useState("");
  const [graphqlSecretLength, setGraphqlSecretLength] = useState("");
  const [corsOrigins, setCorsOrigins] = useState<string[]>([]);
  const [corsInput, setCorsInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);

    const src = config ?? EMPTY_CONFIG;

    setListenAddresses([...src.listen_addresses]);
    setListenInput("");
    setAllowClientAddresses([...src.allow_client_addresses]);
    setAllowClientInput("");
    setPort(src.port != null ? String(src.port) : "");
    setRequestBodySizeLimit(src.request_body_size_limit != null ? String(src.request_body_size_limit) : "");
    setHttpRedirect(src.enable_http_redirect);
    setTls12(src.tls_versions.includes("1.2"));
    setTls13(src.tls_versions.includes("1.3"));
    setVrf(src.vrf ?? "");

    setCertificate(src.certificates.certificate ?? "");
    setCaCertificate(src.certificates.ca_certificate ?? "");
    setDhParams(src.certificates.dh_params ?? "");

    const rows: ApiKeyRow[] = src.api.keys.map((k, i) => ({
      ...k,
      key_: i,
      revealed: false,
    }));
    setKeyRows(rows);
    setNextKeyIndex(rows.length);
    setNewKeyId("");
    setNewKeySecret("");

    setRestEnabled(src.api.rest.enabled);
    setRestDebug(src.api.rest.debug);
    setRestStrict(src.api.rest.strict);

    setGraphqlEnabled(src.api.graphql.enabled);
    setGraphqlIntrospection(src.api.graphql.introspection);
    setGraphqlAuthType(src.api.graphql.authentication.auth_type ?? "key");
    setGraphqlExpiration(src.api.graphql.authentication.expiration != null ? String(src.api.graphql.authentication.expiration) : "");
    setGraphqlSecretLength(src.api.graphql.authentication.secret_length != null ? String(src.api.graphql.authentication.secret_length) : "");
    setCorsOrigins([...src.api.graphql.cors_allow_origins]);
    setCorsInput("");

    // Load PKI data (non-critical)
    setPkiLoading(true);
    pkiService.getConfig()
      .then((pki) => {
        setPkiCerts(pki.certificates);
        setPkiCAs(pki.ca);
        setPkiDH(pki.dh);
      })
      .catch(() => {/* non-critical */})
      .finally(() => setPkiLoading(false));
  }, [open, config]);

  function addListenAddress() {
    const addr = listenInput.trim();
    if (addr && !listenAddresses.includes(addr)) {
      setListenAddresses((prev) => [...prev, addr]);
    }
    setListenInput("");
  }

  function addAllowClientAddress() {
    const addr = allowClientInput.trim();
    if (addr && !allowClientAddresses.includes(addr)) {
      setAllowClientAddresses((prev) => [...prev, addr]);
    }
    setAllowClientInput("");
  }

  function addApiKey() {
    const id = newKeyId.trim();
    const secret = newKeySecret.trim();
    if (!id || !secret) return;
    if (keyRows.some((r) => r.id === id)) {
      setError("API key ID must be unique.");
      return;
    }
    setKeyRows((prev) => [...prev, { id, key: secret, key_: nextKeyIndex, revealed: false }]);
    setNextKeyIndex((n) => n + 1);
    setNewKeyId("");
    setNewKeySecret("");
    setError(null);
  }

  function addCorsOrigin() {
    const origin = corsInput.trim();
    if (origin && !corsOrigins.includes(origin)) {
      setCorsOrigins((prev) => [...prev, origin]);
    }
    setCorsInput("");
  }

  function toggleReveal(key_: number) {
    setKeyRows((prev) => prev.map((r) => r.key_ === key_ ? { ...r, revealed: !r.revealed } : r));
  }

  function validate(): string | null {
    if (port) {
      const p = parseInt(port, 10);
      if (isNaN(p) || p < 1 || p > 65535) return "Port must be between 1 and 65535.";
    }
    if (requestBodySizeLimit) {
      const s = parseInt(requestBodySizeLimit, 10);
      if (isNaN(s) || s < 1 || s > 256) return "Request body size limit must be between 1 and 256 MB.";
    }
    if (graphqlEnabled && graphqlExpiration) {
      const e = parseInt(graphqlExpiration, 10);
      if (isNaN(e) || e < 60 || e > 31536000) return "JWT token expiration must be between 60 and 31,536,000 seconds.";
    }
    if (graphqlEnabled && graphqlSecretLength) {
      const s = parseInt(graphqlSecretLength, 10);
      if (isNaN(s) || s < 16 || s > 65535) return "JWT secret length must be between 16 and 65,535 bytes.";
    }
    const ids = keyRows.map((r) => r.id);
    if (new Set(ids).size !== ids.length) return "API key IDs must be unique.";
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);

    const tlsVersions: string[] = [];
    if (tls12) tlsVersions.push("1.2");
    if (tls13) tlsVersions.push("1.3");

    const payload: HTTPSConfig = {
      listen_addresses: listenAddresses,
      allow_client_addresses: allowClientAddresses,
      port: port ? parseInt(port, 10) : null,
      request_body_size_limit: requestBodySizeLimit ? parseInt(requestBodySizeLimit, 10) : null,
      tls_versions: tlsVersions,
      vrf: vrf.trim() || null,
      enable_http_redirect: httpRedirect,
      certificates: {
        certificate: certificate || null,
        ca_certificate: caCertificate || null,
        dh_params: dhParams || null,
      },
      api: {
        keys: keyRows.map((r) => ({ id: r.id, key: r.key })),
        rest: { enabled: restEnabled, debug: restDebug, strict: restStrict },
        graphql: {
          enabled: graphqlEnabled,
          introspection: graphqlIntrospection,
          authentication: {
            auth_type: graphqlEnabled ? (graphqlAuthType || "key") : null,
            expiration: graphqlEnabled && graphqlAuthType === "token" && graphqlExpiration ? parseInt(graphqlExpiration, 10) : null,
            secret_length: graphqlEnabled && graphqlAuthType === "token" && graphqlSecretLength ? parseInt(graphqlSecretLength, 10) : null,
          },
          cors_allow_origins: corsOrigins,
        },
      },
    };

    try {
      const result = await httpsService.saveConfig(payload);
      if (!result.success) {
        setError(result.error ?? "Configuration failed");
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure HTTPS</DialogTitle>
          <DialogDescription>
            Configure the HTTPS management interface, certificates, and API access.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 shrink-0">
            <TabsTrigger value="general" className="flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5" />
              General
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Certificates
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="rest" className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              REST API
            </TabsTrigger>
            <TabsTrigger value="graphql" className="flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5" />
              GraphQL
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: General ── */}
          <TabsContent value="general" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 py-2">
                {/* Listen Addresses */}
                <div className="space-y-2">
                  <Label>Listen Addresses</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 192.168.1.1"
                      value={listenInput}
                      onChange={(e) => setListenInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addListenAddress())}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={addListenAddress}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {listenAddresses.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {listenAddresses.map((a) => (
                        <Badge
                          key={a}
                          variant="secondary"
                          className="font-mono text-xs cursor-pointer"
                          onClick={() => setListenAddresses((prev) => prev.filter((x) => x !== a))}
                        >
                          {a} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Allowed Client Addresses */}
                <div className="space-y-2">
                  <Label>Allowed Client Addresses</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 10.0.0.0/8"
                      value={allowClientInput}
                      onChange={(e) => setAllowClientInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllowClientAddress())}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={addAllowClientAddress}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {allowClientAddresses.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {allowClientAddresses.map((a) => (
                        <Badge
                          key={a}
                          variant="secondary"
                          className="font-mono text-xs cursor-pointer"
                          onClick={() => setAllowClientAddresses((prev) => prev.filter((x) => x !== a))}
                        >
                          {a} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Port */}
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder="443 (default)"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                </div>

                {/* Request Body Size Limit */}
                <div className="space-y-2">
                  <Label htmlFor="body-size">Request Body Size Limit (MB)</Label>
                  <Input
                    id="body-size"
                    type="number"
                    min={1}
                    max={256}
                    placeholder="1 (default)"
                    value={requestBodySizeLimit}
                    onChange={(e) => setRequestBodySizeLimit(e.target.value)}
                  />
                </div>

                {/* HTTP Redirect */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="http-redirect"
                    checked={httpRedirect}
                    onCheckedChange={(v) => setHttpRedirect(!!v)}
                  />
                  <Label htmlFor="http-redirect">Redirect HTTP to HTTPS</Label>
                </div>

                {/* TLS Versions */}
                <div className="space-y-2">
                  <Label>TLS Versions</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="tls12"
                        checked={tls12}
                        onCheckedChange={(v) => setTls12(!!v)}
                      />
                      <Label htmlFor="tls12">TLS 1.2</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="tls13"
                        checked={tls13}
                        onCheckedChange={(v) => setTls13(!!v)}
                      />
                      <Label htmlFor="tls13">TLS 1.3</Label>
                    </div>
                  </div>
                </div>

                {/* VRF */}
                <div className="space-y-2">
                  <Label htmlFor="vrf">VRF</Label>
                  <Input
                    id="vrf"
                    placeholder="VRF instance name (optional)"
                    value={vrf}
                    onChange={(e) => setVrf(e.target.value)}
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab 2: Certificates ── */}
          <TabsContent value="certificates" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 py-2">
                <p className="text-xs text-muted-foreground">
                  Certificates are managed in the PKI section.
                </p>

                {/* Certificate */}
                <div className="space-y-2">
                  <Label htmlFor="cert">Certificate</Label>
                  {pkiLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading PKI data…
                    </div>
                  ) : (
                    <Select value={certificate || "none"} onValueChange={(v) => setCertificate(v === "none" ? "" : v)}>
                      <SelectTrigger id="cert">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {pkiCerts.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* CA Certificate */}
                <div className="space-y-2">
                  <Label htmlFor="ca-cert">CA Certificate</Label>
                  {pkiLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading PKI data…
                    </div>
                  ) : (
                    <Select value={caCertificate || "none"} onValueChange={(v) => setCaCertificate(v === "none" ? "" : v)}>
                      <SelectTrigger id="ca-cert">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {pkiCAs.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* DH Parameters */}
                <div className="space-y-2">
                  <Label htmlFor="dh-params">DH Parameters</Label>
                  {pkiLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading PKI data…
                    </div>
                  ) : (
                    <Select value={dhParams || "none"} onValueChange={(v) => setDhParams(v === "none" ? "" : v)}>
                      <SelectTrigger id="dh-params">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {pkiDH.map((d) => (
                          <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab 3: API Keys ── */}
          <TabsContent value="keys" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 py-2">
                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                  Keys grant full API access — treat them as passwords.
                </p>

                {/* Existing keys */}
                {keyRows.length > 0 && (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Key ID</th>
                          <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Secret Key</th>
                          <th className="px-3 py-2 w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {keyRows.map((row) => (
                          <tr key={row.key_} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                            <td className="px-3 py-2 font-mono text-xs">
                              <div className="flex items-center gap-2">
                                <span>{row.revealed ? row.key : "••••••••"}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => toggleReveal(row.key_)}
                                >
                                  {row.revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setKeyRows((prev) => prev.filter((r) => r.key_ !== row.key_))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add new key */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Add New Key</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Key ID"
                      value={newKeyId}
                      onChange={(e) => setNewKeyId(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Input
                      placeholder="Secret key"
                      value={newKeySecret}
                      onChange={(e) => setNewKeySecret(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addApiKey}
                      disabled={!newKeyId.trim() || !newKeySecret.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab 4: REST API ── */}
          <TabsContent value="rest" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 p-3 rounded-md border">
                  <Checkbox
                    id="rest-enabled"
                    checked={restEnabled}
                    onCheckedChange={(v) => {
                      setRestEnabled(!!v);
                      if (!v) { setRestDebug(false); setRestStrict(false); }
                    }}
                  />
                  <Label htmlFor="rest-enabled" className="font-medium cursor-pointer">Enable REST API</Label>
                </div>

                <div className={`space-y-3 pl-3 border-l-2 ${restEnabled ? "border-primary/30" : "border-muted opacity-50"}`}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rest-debug"
                      checked={restDebug}
                      disabled={!restEnabled}
                      onCheckedChange={(v) => setRestDebug(!!v)}
                    />
                    <Label htmlFor="rest-debug" className={restEnabled ? "cursor-pointer" : "cursor-not-allowed"}>
                      Debug Logging
                      <span className="block text-xs text-muted-foreground font-normal">Log detailed request/response information</span>
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rest-strict"
                      checked={restStrict}
                      disabled={!restEnabled}
                      onCheckedChange={(v) => setRestStrict(!!v)}
                    />
                    <Label htmlFor="rest-strict" className={restEnabled ? "cursor-pointer" : "cursor-not-allowed"}>
                      Strict Path Checking
                      <span className="block text-xs text-muted-foreground font-normal">Reject requests with unknown URI path components</span>
                    </Label>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab 5: GraphQL ── */}
          <TabsContent value="graphql" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 p-3 rounded-md border">
                  <Checkbox
                    id="graphql-enabled"
                    checked={graphqlEnabled}
                    onCheckedChange={(v) => {
                      setGraphqlEnabled(!!v);
                      if (!v) {
                        setGraphqlIntrospection(false);
                        setGraphqlExpiration("");
                        setGraphqlSecretLength("");
                        setCorsOrigins([]);
                      }
                    }}
                  />
                  <Label htmlFor="graphql-enabled" className="font-medium cursor-pointer">Enable GraphQL</Label>
                </div>

                <div className={`space-y-4 pl-3 border-l-2 ${graphqlEnabled ? "border-primary/30" : "border-muted opacity-50"}`}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="graphql-introspection"
                      checked={graphqlIntrospection}
                      disabled={!graphqlEnabled}
                      onCheckedChange={(v) => setGraphqlIntrospection(!!v)}
                    />
                    <Label htmlFor="graphql-introspection" className={graphqlEnabled ? "cursor-pointer" : "cursor-not-allowed"}>
                      Schema Introspection
                      <span className="block text-xs text-muted-foreground font-normal">Allow clients to query the API schema</span>
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="graphql-auth-type">Authentication Type</Label>
                    <Select
                      value={graphqlAuthType}
                      onValueChange={setGraphqlAuthType}
                      disabled={!graphqlEnabled}
                    >
                      <SelectTrigger id="graphql-auth-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="key">API Key (default)</SelectItem>
                        <SelectItem value="token">JWT Token</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {graphqlAuthType === "token" && graphqlEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="graphql-expiration">Token Expiration (seconds)</Label>
                        <Input
                          id="graphql-expiration"
                          type="number"
                          min={60}
                          max={31536000}
                          placeholder="3600 (default)"
                          value={graphqlExpiration}
                          onChange={(e) => setGraphqlExpiration(e.target.value)}
                          disabled={!graphqlEnabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="graphql-secret-length">Secret Length (bytes)</Label>
                        <Input
                          id="graphql-secret-length"
                          type="number"
                          min={16}
                          max={65535}
                          placeholder="32 (default)"
                          value={graphqlSecretLength}
                          onChange={(e) => setGraphqlSecretLength(e.target.value)}
                          disabled={!graphqlEnabled}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>CORS Allow Origins</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://app.example.com"
                        value={corsInput}
                        disabled={!graphqlEnabled}
                        onChange={(e) => setCorsInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCorsOrigin())}
                      />
                      <Button type="button" size="sm" variant="outline" disabled={!graphqlEnabled} onClick={addCorsOrigin}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {corsOrigins.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {corsOrigins.map((o) => (
                          <Badge
                            key={o}
                            variant="secondary"
                            className="font-mono text-xs cursor-pointer"
                            onClick={() => setCorsOrigins((prev) => prev.filter((x) => x !== o))}
                          >
                            {o} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
