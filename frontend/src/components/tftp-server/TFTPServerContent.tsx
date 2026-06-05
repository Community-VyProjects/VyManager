"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FolderUp,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Settings2,
  Radio,
  Check,
  X,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  tftpServerService,
  TFTPServerConfig,
  TFTPServerCapabilities,
  TFTPServerListenAddress,
} from "@/lib/api/tftp-server";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { TFTPServerGeneralModal } from "./TFTPServerGeneralModal";
import { TFTPServerListenAddressModal } from "./TFTPServerListenAddressModal";
import { DeleteListenAddressModal } from "./DeleteListenAddressModal";

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

export function TFTPServerContent() {
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.TFTP_SERVER);

  const [config, setConfig] = useState<TFTPServerConfig | null>(null);
  const [capabilities, setCapabilities] = useState<TFTPServerCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [generalOpen, setGeneralOpen] = useState(false);
  const [listenModal, setListenModal] = useState<{ open: boolean; edit: TFTPServerListenAddress | null }>({ open: false, edit: null });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadData = useCallback(async (refreshData = false) => {
    try {
      setLoading(true);
      setError(null);
      const [cfg, caps] = await Promise.all([
        tftpServerService.getConfig(refreshData),
        capabilities ? Promise.resolve(capabilities) : tftpServerService.getCapabilities(),
      ]);
      setConfig(cfg);
      setCapabilities(caps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load TFTP server configuration");
    } finally {
      setLoading(false);
    }
    // capabilities fetched once; intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && (!config || !capabilities)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!config || !capabilities) return null;

  const refresh = () => loadData(true);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <FolderUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">TFTP Server</h1>
                  {!hasWrite && <Badge variant="secondary">Read Only</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Trivial File Transfer Protocol — serve files to network devices
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasWrite && (
                <Button size="sm" onClick={() => setGeneralOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Settings
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 pt-4 overflow-auto space-y-6">
          {/* Settings */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Settings2 className="h-4 w-4" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div className="flex flex-col sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Directory</dt>
                  <dd className="text-sm font-mono">
                    {config.directory ? config.directory : <Dash />}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs text-muted-foreground">Port</dt>
                  <dd className="text-sm">
                    {config.port ?? `Default (${capabilities.features.port.default})`}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs text-muted-foreground">Uploads</dt>
                  <dd className="text-sm">
                    <span className="flex items-center gap-1.5">
                      {config.allow_upload ? (
                        <>
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          Allowed
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Read-only</span>
                        </>
                      )}
                    </span>
                  </dd>
                </div>
              </dl>
              {!config.directory && (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    A directory must be set for the TFTP server to start serving files.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Listen addresses */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Radio className="h-4 w-4" />
                  Listen Addresses
                  {config.listen_addresses.length > 0 && (
                    <Badge variant="secondary">{config.listen_addresses.length}</Badge>
                  )}
                </CardTitle>
                {hasWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setListenModal({ open: true, edit: null })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {config.listen_addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Listening on all addresses. Add one to restrict binding.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead>VRF</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.listen_addresses.map((a) => (
                      <TableRow key={a.address}>
                        <TableCell className="font-mono font-medium">{a.address}</TableCell>
                        <TableCell className="font-mono">{a.vrf ?? <Dash />}</TableCell>
                        {hasWrite && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setListenModal({ open: true, edit: a })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(a.address)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {generalOpen && (
        <TFTPServerGeneralModal
          open={generalOpen}
          onOpenChange={setGeneralOpen}
          config={config}
          capabilities={capabilities}
          onSuccess={refresh}
        />
      )}
      {listenModal.open && (
        <TFTPServerListenAddressModal
          open={listenModal.open}
          onOpenChange={(o) => setListenModal((p) => ({ ...p, open: o }))}
          existing={listenModal.edit}
          existingAddresses={config.listen_addresses.map((a) => a.address)}
          onSuccess={refresh}
        />
      )}
      {deleteTarget && (
        <DeleteListenAddressModal
          open={!!deleteTarget}
          onOpenChange={(o) => {
            if (!o) setDeleteTarget(null);
          }}
          address={deleteTarget}
          onSuccess={refresh}
        />
      )}
    </>
  );
}
