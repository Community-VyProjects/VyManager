"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Gauge,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Network,
  Layers,
  Filter,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  qosService,
  QoSConfig,
  QoSCapabilities,
  QoSPolicy,
  QoSInterface,
  QoSTrafficMatchGroup,
} from "@/lib/api/qos";
import { POLICY_TYPE_META } from "@/lib/qos-schema";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { QoSPolicyModal } from "./QoSPolicyModal";
import { QoSInterfaceModal } from "./QoSInterfaceModal";
import { QoSTrafficMatchGroupModal } from "./QoSTrafficMatchGroupModal";
import { QoSConfirmDeleteModal } from "./QoSConfirmDeleteModal";

interface DeleteTarget {
  title: string;
  itemName: string;
  description?: string;
  onConfirm: () => Promise<void>;
}

function typeLabel(type: string): string {
  return POLICY_TYPE_META[type]?.label ?? type;
}

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

export function QoSContent() {
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.QOS);

  const [config, setConfig] = useState<QoSConfig | null>(null);
  const [capabilities, setCapabilities] = useState<QoSCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [policyModal, setPolicyModal] = useState<{ open: boolean; edit: QoSPolicy | null }>({ open: false, edit: null });
  const [ifaceModal, setIfaceModal] = useState<{ open: boolean; edit: QoSInterface | null }>({ open: false, edit: null });
  const [tmgModal, setTmgModal] = useState<{ open: boolean; edit: QoSTrafficMatchGroup | null }>({ open: false, edit: null });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const loadData = useCallback(async (refreshData = false) => {
    try {
      setLoading(true);
      setError(null);
      const [cfg, caps] = await Promise.all([
        qosService.getConfig(refreshData),
        capabilities ? Promise.resolve(capabilities) : qosService.getCapabilities(),
      ]);
      setConfig(cfg);
      setCapabilities(caps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load QoS configuration");
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
        <Button variant="outline" onClick={() => loadData()}>Retry</Button>
      </div>
    );
  }

  if (!config || !capabilities) return null;

  const refresh = () => loadData(true);
  const tmgSupported = capabilities.features.traffic_match_group.supported;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">QoS</h1>
                  {!hasWrite && <Badge variant="secondary">Read Only</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Quality of Service — shape, prioritise and police traffic
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          <Tabs defaultValue="policies" className="w-full">
            <TabsList>
              <TabsTrigger value="policies">
                Policies
                {config.policies.length > 0 && <Badge variant="secondary" className="ml-2">{config.policies.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="interfaces">
                Interfaces
                {config.interfaces.length > 0 && <Badge variant="secondary" className="ml-2">{config.interfaces.length}</Badge>}
              </TabsTrigger>
              {tmgSupported && (
                <TabsTrigger value="tmg">
                  Match Groups
                  {config.traffic_match_groups.length > 0 && <Badge variant="secondary" className="ml-2">{config.traffic_match_groups.length}</Badge>}
                </TabsTrigger>
              )}
            </TabsList>

            {/* Policies */}
            <TabsContent value="policies" className="mt-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Layers className="h-4 w-4" />
                      Policies
                    </CardTitle>
                    {hasWrite && (
                      <Button size="sm" variant="outline" onClick={() => setPolicyModal({ open: true, edit: null })}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Policy
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {config.policies.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No QoS policies defined. Add one to start shaping traffic.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Bandwidth</TableHead>
                          <TableHead>Classes</TableHead>
                          <TableHead>Description</TableHead>
                          {hasWrite && <TableHead className="w-[80px]" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.policies.map((p) => (
                          <TableRow key={`${p.type}/${p.name}`}>
                            <TableCell className="font-mono font-medium">{p.name}</TableCell>
                            <TableCell><Badge variant="secondary">{typeLabel(p.type)}</Badge></TableCell>
                            <TableCell>{p.bandwidth ?? <Dash />}</TableCell>
                            <TableCell>{p.classes.length > 0 ? p.classes.length : <Dash />}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{p.description ?? <Dash />}</TableCell>
                            {hasWrite && (
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPolicyModal({ open: true, edit: p })}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() =>
                                      setDeleteTarget({
                                        title: "Remove Policy",
                                        itemName: p.name,
                                        description: `(${typeLabel(p.type)})`,
                                        onConfirm: () => qosService.deletePolicy(p.type, p.name).then(() => {}),
                                      })
                                    }
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
            </TabsContent>

            {/* Interfaces */}
            <TabsContent value="interfaces" className="mt-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Network className="h-4 w-4" />
                      Interface Bindings
                    </CardTitle>
                    {hasWrite && (
                      <Button size="sm" variant="outline" onClick={() => setIfaceModal({ open: true, edit: null })}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Binding
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {config.interfaces.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No interfaces bound. Attach a policy to an interface to apply it.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Interface</TableHead>
                          <TableHead>Egress</TableHead>
                          <TableHead>Ingress</TableHead>
                          {hasWrite && <TableHead className="w-[80px]" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.interfaces.map((i) => (
                          <TableRow key={i.name}>
                            <TableCell className="font-mono font-medium">{i.name}</TableCell>
                            <TableCell className="font-mono">{i.egress ?? <Dash />}</TableCell>
                            <TableCell className="font-mono">{i.ingress ?? <Dash />}</TableCell>
                            {hasWrite && (
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIfaceModal({ open: true, edit: i })}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() =>
                                      setDeleteTarget({
                                        title: "Remove Interface Binding",
                                        itemName: i.name,
                                        onConfirm: () => qosService.deleteInterface(i.name).then(() => {}),
                                      })
                                    }
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
            </TabsContent>

            {/* Traffic match groups */}
            {tmgSupported && (
              <TabsContent value="tmg" className="mt-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        Traffic Match Groups
                      </CardTitle>
                      {hasWrite && (
                        <Button size="sm" variant="outline" onClick={() => setTmgModal({ open: true, edit: null })}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Group
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {config.traffic_match_groups.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No traffic match groups. Create one to share match rules across classes.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Match Rules</TableHead>
                            <TableHead>Description</TableHead>
                            {hasWrite && <TableHead className="w-[80px]" />}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {config.traffic_match_groups.map((g) => (
                            <TableRow key={g.name}>
                              <TableCell className="font-mono font-medium">{g.name}</TableCell>
                              <TableCell>{g.matches.length > 0 ? g.matches.length : <Dash />}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{g.description ?? <Dash />}</TableCell>
                              {hasWrite && (
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTmgModal({ open: true, edit: g })}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() =>
                                        setDeleteTarget({
                                          title: "Remove Traffic Match Group",
                                          itemName: g.name,
                                          onConfirm: () => qosService.deleteTmg(g.name).then(() => {}),
                                        })
                                      }
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
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      {policyModal.open && (
        <QoSPolicyModal
          open={policyModal.open}
          onOpenChange={(o) => setPolicyModal((p) => ({ ...p, open: o }))}
          capabilities={capabilities}
          existing={policyModal.edit}
          existingNames={config.policies.filter((p) => !policyModal.edit || p.type === policyModal.edit.type).map((p) => p.name)}
          availableMatchGroups={config.traffic_match_groups.map((g) => g.name)}
          onSuccess={refresh}
        />
      )}
      {ifaceModal.open && (
        <QoSInterfaceModal
          open={ifaceModal.open}
          onOpenChange={(o) => setIfaceModal((p) => ({ ...p, open: o }))}
          existing={ifaceModal.edit}
          existingNames={config.interfaces.map((i) => i.name)}
          policies={config.policies}
          onSuccess={refresh}
        />
      )}
      {tmgModal.open && (
        <QoSTrafficMatchGroupModal
          open={tmgModal.open}
          onOpenChange={(o) => setTmgModal((p) => ({ ...p, open: o }))}
          capabilities={capabilities}
          existing={tmgModal.edit}
          existingNames={config.traffic_match_groups.map((g) => g.name)}
          availableMatchGroups={config.traffic_match_groups
            .map((g) => g.name)
            .filter((n) => n !== tmgModal.edit?.name)}
          onSuccess={refresh}
        />
      )}
      {deleteTarget && (
        <QoSConfirmDeleteModal
          open={!!deleteTarget}
          onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
          title={deleteTarget.title}
          itemName={deleteTarget.itemName}
          description={deleteTarget.description}
          onConfirm={deleteTarget.onConfirm}
          onSuccess={refresh}
        />
      )}
    </>
  );
}
