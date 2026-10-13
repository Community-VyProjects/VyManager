"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Pencil,
  Lock,
  Network,
  Shield,
  Key,
  Globe,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { httpsService, HTTPSConfig } from "@/lib/api/https";
import { HTTPSModal } from "./HTTPSModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

function isConfigured(config: HTTPSConfig): boolean {
  return (
    config.listen_addresses.length > 0 ||
    config.allow_client_addresses.length > 0 ||
    config.port != null ||
    config.request_body_size_limit != null ||
    config.tls_versions.length > 0 ||
    !!config.vrf ||
    config.enable_http_redirect ||
    !!config.certificates.certificate ||
    !!config.certificates.ca_certificate ||
    !!config.certificates.dh_params ||
    config.api.keys.length > 0 ||
    config.api.rest.enabled ||
    config.api.graphql.enabled
  );
}

export function HTTPSContent() {
  const t = useTranslations("https");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.HTTPS);

  const [config, setConfig] = useState<HTTPSConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await httpsService.getConfig(refresh);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("content.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSuccess = async () => {
    setModalOpen(false);
    await loadData(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>{tc("retry")}</Button>
      </div>
    );
  }

  const configured = config ? isConfigured(config) : false;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">HTTPS</h1>
                  {!hasWritePermission && (
                    <Badge variant="secondary">{t("content.viewOnly")}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("content.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc("refresh")}
              </Button>
              {hasWritePermission && (
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {configured ? t("content.editConfiguration") : t("content.configureHttps")}
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-auto">
          {!configured ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lock className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">{t("content.notConfigured")}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("content.notConfiguredHelp")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    {t("content.configureHttps")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Network card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{t("content.network")}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">{t("content.port")}</span>
                      <span className="font-mono text-xs">
                        {config!.port ?? t("content.withDefault", { value: "443" })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t("content.listenAddresses")}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config!.listen_addresses.length > 0 ? (
                          config!.listen_addresses.map((a) => (
                            <Badge key={a} variant="secondary" className="font-mono text-xs">{a}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("content.allDefault")}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t("content.allowedClients")}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config!.allow_client_addresses.length > 0 ? (
                          config!.allow_client_addresses.map((a) => (
                            <Badge key={a} variant="outline" className="font-mono text-xs">{a}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("content.allDefault")}</span>
                        )}
                      </div>
                    </div>
                    {config!.vrf && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-32 shrink-0">VRF</span>
                        <Badge variant="outline" className="font-mono text-xs">{config!.vrf}</Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">{t("content.httpRedirect")}</span>
                      {config!.enable_http_redirect ? (
                        <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">{tc("enabled")}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{tc("disabled")}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t("content.tlsVersions")}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config!.tls_versions.length > 0 ? (
                          config!.tls_versions.map((v) => (
                            <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("content.withDefault", { value: "1.2, 1.3" })}</span>
                        )}
                      </div>
                    </div>
                    {config!.request_body_size_limit != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-32 shrink-0">{t("content.bodySizeLimit")}</span>
                        <span className="font-mono text-xs">{config!.request_body_size_limit} MB</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Certificates card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{t("content.certificates")}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">{t("content.certificate")}</span>
                      {config!.certificates.certificate ? (
                        <Badge variant="outline" className="font-mono text-xs">{config!.certificates.certificate}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">{t("content.caCertificate")}</span>
                      {config!.certificates.ca_certificate ? (
                        <Badge variant="outline" className="font-mono text-xs">{config!.certificates.ca_certificate}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">{t("content.dhParameters")}</span>
                      {config!.certificates.dh_params ? (
                        <Badge variant="outline" className="font-mono text-xs">{config!.certificates.dh_params}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">API</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-28 shrink-0">{t("content.apiKeys")}</span>
                      <span className="font-mono text-xs">{t("content.keysConfigured", { count: config!.api.keys.length })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">REST API</span>
                      {config!.api.rest.enabled ? (
                        <div className="flex gap-1">
                          <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">{tc("enabled")}</Badge>
                          {config!.api.rest.debug && <Badge variant="secondary" className="text-xs">{t("content.debug")}</Badge>}
                          {config!.api.rest.strict && <Badge variant="secondary" className="text-xs">{t("content.strict")}</Badge>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{tc("disabled")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">GraphQL</span>
                      {config!.api.graphql.enabled ? (
                        <div className="flex gap-1">
                          <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">{tc("enabled")}</Badge>
                          {config!.api.graphql.introspection && <Badge variant="secondary" className="text-xs">{t("content.introspection")}</Badge>}
                          {config!.api.graphql.authentication.auth_type && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              {config!.api.graphql.authentication.auth_type}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{tc("disabled")}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <HTTPSModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        config={config}
      />
    </>
  );
}
