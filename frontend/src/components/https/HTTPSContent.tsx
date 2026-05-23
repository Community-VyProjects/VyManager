"use client";

import { useState, useEffect, useCallback } from "react";
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
      setError(err instanceof Error ? err.message : "Failed to load HTTPS configuration");
    } finally {
      setLoading(false);
    }
  }, []);

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
        <Button variant="outline" onClick={() => loadData()}>Retry</Button>
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
                    <Badge variant="secondary">View Only</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  HTTPS management interface configuration
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {hasWritePermission && (
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {configured ? "Edit Configuration" : "Configure HTTPS"}
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
                <p className="text-sm font-medium text-foreground mb-1">HTTPS is not configured</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure the HTTPS management interface to enable secure access.
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    Configure HTTPS
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
                    <p className="text-sm font-semibold">Network</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">Port</span>
                      <span className="font-mono text-xs">
                        {config!.port ?? "443 (default)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Listen Addresses</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config!.listen_addresses.length > 0 ? (
                          config!.listen_addresses.map((a) => (
                            <Badge key={a} variant="secondary" className="font-mono text-xs">{a}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">All (default)</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Allowed Clients</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config!.allow_client_addresses.length > 0 ? (
                          config!.allow_client_addresses.map((a) => (
                            <Badge key={a} variant="outline" className="font-mono text-xs">{a}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">All (default)</span>
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
                      <span className="text-muted-foreground w-32 shrink-0">HTTP Redirect</span>
                      {config!.enable_http_redirect ? (
                        <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">Enabled</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Disabled</span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">TLS Versions</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config!.tls_versions.length > 0 ? (
                          config!.tls_versions.map((v) => (
                            <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">1.2, 1.3 (default)</span>
                        )}
                      </div>
                    </div>
                    {config!.request_body_size_limit != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-32 shrink-0">Body Size Limit</span>
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
                    <p className="text-sm font-semibold">Certificates</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">Certificate</span>
                      {config!.certificates.certificate ? (
                        <Badge variant="outline" className="font-mono text-xs">{config!.certificates.certificate}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">CA Certificate</span>
                      {config!.certificates.ca_certificate ? (
                        <Badge variant="outline" className="font-mono text-xs">{config!.certificates.ca_certificate}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">DH Parameters</span>
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
                      <span className="text-muted-foreground w-28 shrink-0">API Keys</span>
                      <span className="font-mono text-xs">{config!.api.keys.length} configured</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">REST API</span>
                      {config!.api.rest.enabled ? (
                        <div className="flex gap-1">
                          <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">Enabled</Badge>
                          {config!.api.rest.debug && <Badge variant="secondary" className="text-xs">Debug</Badge>}
                          {config!.api.rest.strict && <Badge variant="secondary" className="text-xs">Strict</Badge>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Disabled</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-32 shrink-0">GraphQL</span>
                      {config!.api.graphql.enabled ? (
                        <div className="flex gap-1">
                          <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">Enabled</Badge>
                          {config!.api.graphql.introspection && <Badge variant="secondary" className="text-xs">Introspection</Badge>}
                          {config!.api.graphql.authentication.auth_type && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              {config!.api.graphql.authentication.auth_type}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Disabled</span>
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
