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
import { VrfSelect } from "@/components/ui/vrf-select";
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
  Globe,
  Network,
  Shield,
  Key,
  Code2,
} from "lucide-react";
import { httpsService, HTTPSCapabilities, HTTPSConfig, HTTPSApiKey } from "@/lib/api/https";
import {
  MASKED_SECRET,
  httpsCorsIndependent,
  httpsGraphqlAuthTypes,
  httpsRange,
  httpsRestContainer,
  httpsTlsVersions,
  type HttpsRange,
} from "@/lib/api/https-save-ops";
import type { ApiError } from "@/lib/types/api";
import { pkiService, PKICertificate, PKICA, PKIDH } from "@/lib/api/pki";

interface HTTPSModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config: HTTPSConfig | null;
  capabilities: HTTPSCapabilities | null;
}

interface ApiKeyRow extends HTTPSApiKey {
  key_: number;
}

function outOfRange(raw: string, range: HttpsRange): boolean {
  const value = parseInt(raw, 10);
  if (isNaN(value)) return true;
  return (range.min != null && value < range.min) || (range.max != null && value > range.max);
}

function rangeValues(range: HttpsRange) {
  return { min: range.min ?? "", max: range.max ?? "" };
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

export function HTTPSModal({ open, onClose, onSuccess, config, capabilities }: HTTPSModalProps) {
  const t = useTranslations("https");
  const tc = useTranslations("common");
  const capsReady = capabilities !== null;
  const corsIndependent = httpsCorsIndependent(capabilities);
  const restContainer = httpsRestContainer(capabilities);
  const tlsOptions = httpsTlsVersions(capabilities);
  const authTypes = httpsGraphqlAuthTypes(capabilities);
  const portRange = httpsRange(capabilities, "port", "min", "max", "default");
  const bodySizeRange = httpsRange(capabilities, "request_body_size_limit", "min", "max", "default");
  const expirationRange = httpsRange(
    capabilities, "api_graphql_auth", "token_expiration_min", "token_expiration_max", "token_expiration_default",
  );
  const secretLengthRange = httpsRange(
    capabilities, "api_graphql_auth", "secret_length_min", "secret_length_max", "secret_length_default",
  );
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
  const [tlsVersions, setTlsVersions] = useState<string[]>([]);
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
  const [graphqlAuthType, setGraphqlAuthType] = useState("");
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
    setTlsVersions([...src.tls_versions]);
    setVrf(src.vrf ?? "");

    setCertificate(src.certificates.certificate ?? "");
    setCaCertificate(src.certificates.ca_certificate ?? "");
    setDhParams(src.certificates.dh_params ?? "");

    const rows: ApiKeyRow[] = src.api.keys.map((k, i) => ({ ...k, key_: i }));
    setKeyRows(rows);
    setNextKeyIndex(rows.length);
    setNewKeyId("");
    setNewKeySecret("");

    setRestEnabled(src.api.rest.enabled);
    setRestDebug(src.api.rest.debug);
    setRestStrict(src.api.rest.strict);

    setGraphqlEnabled(src.api.graphql.enabled);
    setGraphqlIntrospection(src.api.graphql.introspection);
    setGraphqlAuthType(src.api.graphql.authentication.auth_type ?? "");
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
      setError(t("modal.errors.keyIdUnique"));
      return;
    }
    if (id.includes(",")) {
      setError(t("modal.errors.keyIdComma"));
      return;
    }
    if (secret === MASKED_SECRET) {
      setError(t("modal.errors.keySecretMasked"));
      return;
    }
    setKeyRows((prev) => [...prev, { id, key: secret, key_: nextKeyIndex }]);
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

  function validate(): string | null {
    if (port && outOfRange(port, portRange)) {
      return t("modal.errors.portRange", rangeValues(portRange));
    }
    if (requestBodySizeLimit && outOfRange(requestBodySizeLimit, bodySizeRange)) {
      return t("modal.errors.bodySizeRange", rangeValues(bodySizeRange));
    }
    if (graphqlEnabled && graphqlExpiration && outOfRange(graphqlExpiration, expirationRange)) {
      return t("modal.errors.expirationRange", rangeValues(expirationRange));
    }
    if (graphqlEnabled && graphqlSecretLength && outOfRange(graphqlSecretLength, secretLengthRange)) {
      return t("modal.errors.secretLengthRange", rangeValues(secretLengthRange));
    }
    const ids = keyRows.map((r) => r.id);
    if (new Set(ids).size !== ids.length) return t("modal.errors.keyIdsUnique");
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
            auth_type: graphqlEnabled ? graphqlAuthType || null : null,
            expiration: graphqlEnabled && graphqlExpiration ? parseInt(graphqlExpiration, 10) : null,
            secret_length: graphqlEnabled && graphqlSecretLength ? parseInt(graphqlSecretLength, 10) : null,
          },
          cors_allow_origins: corsOrigins,
        },
      },
    };

    try {
      const result = await httpsService.saveConfig(config ?? EMPTY_CONFIG, payload, {
        capsReady,
        corsIndependent,
        restContainer,
      });
      if (!result.success) {
        setError(result.error || t("modal.errors.configurationFailed"));
        return;
      }
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("modal.errors.unexpected"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("content.configureHttps")}</DialogTitle>
          <DialogDescription>
            {t("modal.description")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 shrink-0">
            <TabsTrigger value="general" className="flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5" />
              {t("modal.tabs.general")}
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              {t("content.certificates")}
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              {t("content.apiKeys")}
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
                  <Label>{t("content.listenAddresses")}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("modal.listenPlaceholder")}
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
                  <Label>{t("modal.allowedClientAddresses")}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("modal.allowedClientPlaceholder")}
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
                  <Label htmlFor="port">{t("content.port")}</Label>
                  <Input
                    id="port"
                    type="number"
                    min={portRange.min}
                    max={portRange.max}
                    placeholder={portRange.default != null ? t("content.withDefault", { value: String(portRange.default) }) : undefined}
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                </div>

                {/* Request Body Size Limit */}
                <div className="space-y-2">
                  <Label htmlFor="body-size">{t("modal.bodySizeLimitMb")}</Label>
                  <Input
                    id="body-size"
                    type="number"
                    min={bodySizeRange.min}
                    max={bodySizeRange.max}
                    placeholder={bodySizeRange.default != null ? t("content.withDefault", { value: String(bodySizeRange.default) }) : undefined}
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
                  <Label htmlFor="http-redirect">{t("modal.redirectHttp")}</Label>
                </div>

                {/* TLS Versions */}
                <div className="space-y-2">
                  <Label>{t("content.tlsVersions")}</Label>
                  <div className="flex gap-4">
                    {tlsOptions.map((version) => (
                      <div key={version} className="flex items-center gap-2">
                        <Checkbox
                          id={`tls-${version}`}
                          checked={tlsVersions.includes(version)}
                          onCheckedChange={(v) =>
                            setTlsVersions((prev) =>
                              v ? [...prev.filter((x) => x !== version), version] : prev.filter((x) => x !== version),
                            )
                          }
                        />
                        <Label htmlFor={`tls-${version}`}>{version}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VRF */}
                <div className="space-y-2">
                  <Label htmlFor="vrf">VRF</Label>
                  <VrfSelect
                    id="vrf"
                    value={vrf}
                    onValueChange={setVrf}
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab 2: Certificates ── */}
          <TabsContent value="certificates" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 py-2">
                {/* Certificate */}
                <div className="space-y-2">
                  <Label htmlFor="cert">{t("content.certificate")}</Label>
                  {pkiLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("modal.loadingPki")}
                    </div>
                  ) : (
                    <Select value={certificate || "none"} onValueChange={(v) => setCertificate(v === "none" ? "" : v)}>
                      <SelectTrigger id="cert">
                        <SelectValue placeholder={tc("none")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{tc("none")}</SelectItem>
                        {pkiCerts.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* CA Certificate */}
                <div className="space-y-2">
                  <Label htmlFor="ca-cert">{t("content.caCertificate")}</Label>
                  {pkiLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("modal.loadingPki")}
                    </div>
                  ) : (
                    <Select value={caCertificate || "none"} onValueChange={(v) => setCaCertificate(v === "none" ? "" : v)}>
                      <SelectTrigger id="ca-cert">
                        <SelectValue placeholder={tc("none")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{tc("none")}</SelectItem>
                        {pkiCAs.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* DH Parameters */}
                <div className="space-y-2">
                  <Label htmlFor="dh-params">{t("content.dhParameters")}</Label>
                  {pkiLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("modal.loadingPki")}
                    </div>
                  ) : (
                    <Select value={dhParams || "none"} onValueChange={(v) => setDhParams(v === "none" ? "" : v)}>
                      <SelectTrigger id="dh-params">
                        <SelectValue placeholder={tc("none")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{tc("none")}</SelectItem>
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
                {/* Existing keys */}
                {keyRows.length > 0 && (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">{t("modal.keyId")}</th>
                          <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">{t("modal.secretKey")}</th>
                          <th className="px-3 py-2 w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {keyRows.map((row) => (
                          <tr key={row.key_} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {row.key ? "••••••••" : "—"}
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
                  <Label className="text-xs text-muted-foreground">{t("modal.addNewKey")}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("modal.keyId")}
                      value={newKeyId}
                      onChange={(e) => setNewKeyId(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder={t("modal.secretKeyPlaceholder")}
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
                {restContainer && (
                <div className="flex items-center gap-3 p-3 rounded-md border">
                  <Checkbox
                    id="rest-enabled"
                    checked={restEnabled}
                    onCheckedChange={(v) => {
                      setRestEnabled(!!v);
                      if (!v) { setRestDebug(false); setRestStrict(false); }
                    }}
                  />
                  <Label htmlFor="rest-enabled" className="font-medium cursor-pointer">{t("modal.enableRest")}</Label>
                </div>
                )}

                <div className={`space-y-3 pl-3 border-l-2 ${!restContainer || restEnabled ? "border-primary/30" : "border-muted opacity-50"}`}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rest-debug"
                      checked={restDebug}
                      disabled={restContainer && !restEnabled}
                      onCheckedChange={(v) => setRestDebug(!!v)}
                    />
                    <Label htmlFor="rest-debug" className={!restContainer || restEnabled ? "cursor-pointer" : "cursor-not-allowed"}>
                      {t("modal.debugLogging")}
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rest-strict"
                      checked={restStrict}
                      disabled={restContainer && !restEnabled}
                      onCheckedChange={(v) => setRestStrict(!!v)}
                    />
                    <Label htmlFor="rest-strict" className={!restContainer || restEnabled ? "cursor-pointer" : "cursor-not-allowed"}>
                      {t("modal.strictPath")}
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
                        if (!corsIndependent) setCorsOrigins([]);
                      }
                    }}
                  />
                  <Label htmlFor="graphql-enabled" className="font-medium cursor-pointer">{t("modal.enableGraphql")}</Label>
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
                      {t("modal.schemaIntrospection")}
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="graphql-auth-type">{t("modal.authType")}</Label>
                    <Select
                      value={graphqlAuthType || "__none__"}
                      onValueChange={(v) => setGraphqlAuthType(v === "__none__" ? "" : v)}
                      disabled={!graphqlEnabled}
                    >
                      <SelectTrigger id="graphql-auth-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{tc("default")}</SelectItem>
                        {authTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {graphqlEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="graphql-expiration">{t("modal.tokenExpiration")}</Label>
                        <Input
                          id="graphql-expiration"
                          type="number"
                          min={expirationRange.min}
                          max={expirationRange.max}
                          placeholder={expirationRange.default != null ? t("content.withDefault", { value: String(expirationRange.default) }) : undefined}
                          value={graphqlExpiration}
                          onChange={(e) => setGraphqlExpiration(e.target.value)}
                          disabled={!graphqlEnabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="graphql-secret-length">{t("modal.secretLength")}</Label>
                        <Input
                          id="graphql-secret-length"
                          type="number"
                          min={secretLengthRange.min}
                          max={secretLengthRange.max}
                          placeholder={secretLengthRange.default != null ? t("content.withDefault", { value: String(secretLengthRange.default) }) : undefined}
                          value={graphqlSecretLength}
                          onChange={(e) => setGraphqlSecretLength(e.target.value)}
                          disabled={!graphqlEnabled}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className={`space-y-2 pl-3 border-l-2 ${corsIndependent || graphqlEnabled ? "border-primary/30" : "border-muted opacity-50"}`}>
                  <Label>{t("modal.corsOrigins")}</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://app.example.com"
                        value={corsInput}
                        disabled={!graphqlEnabled && !corsIndependent}
                        onChange={(e) => setCorsInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCorsOrigin())}
                      />
                      <Button type="button" size="sm" variant="outline" disabled={!graphqlEnabled && !corsIndependent} onClick={addCorsOrigin}>
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
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !capsReady}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
