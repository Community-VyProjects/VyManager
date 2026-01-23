"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  RefreshCw,
  Plus,
  Gauge,
  Network,
  Trash2,
  AlertCircle,
  Settings,
  ArrowRightLeft,
  Activity,
  Timer,
  Layers,
} from "lucide-react";
import {
  qosService,
  type QoSConfigResponse,
  type QoSPolicy,
  type InterfaceBinding,
  type QoSCapabilities,
} from "@/lib/api/qos";
import { useToast } from "@/hooks/useToast";
import { QoSPolicyModal } from "./QoSPolicyModal";
import { QoSBindingModal } from "./QoSBindingModal";
import { QoSDeleteConfirmModal } from "./QoSDeleteConfirmModal";

const POLICY_TYPE_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  shaper: { label: "Shaper (HTB)", icon: <Gauge className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-500" },
  "rate-control": { label: "Rate Control", icon: <Activity className="h-4 w-4" />, color: "bg-green-500/10 text-green-500" },
  limiter: { label: "Limiter", icon: <ArrowRightLeft className="h-4 w-4" />, color: "bg-orange-500/10 text-orange-500" },
  "fq-codel": { label: "FQ-CoDel", icon: <Layers className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-500" },
  cake: { label: "CAKE", icon: <Layers className="h-4 w-4" />, color: "bg-pink-500/10 text-pink-500" },
  "priority-queue": { label: "Priority Queue", icon: <Layers className="h-4 w-4" />, color: "bg-cyan-500/10 text-cyan-500" },
  "round-robin": { label: "Round Robin", icon: <ArrowRightLeft className="h-4 w-4" />, color: "bg-indigo-500/10 text-indigo-500" },
  "network-emulator": { label: "Network Emulator", icon: <Timer className="h-4 w-4" />, color: "bg-red-500/10 text-red-500" },
  "drop-tail": { label: "Drop Tail (FIFO)", icon: <Layers className="h-4 w-4" />, color: "bg-gray-500/10 text-gray-500" },
  "fair-queue": { label: "Fair Queue (SFQ)", icon: <ArrowRightLeft className="h-4 w-4" />, color: "bg-teal-500/10 text-teal-500" },
  "random-detect": { label: "Random Detect", icon: <Activity className="h-4 w-4" />, color: "bg-amber-500/10 text-amber-500" },
};

export function QoSPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [config, setConfig] = useState<QoSConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<QoSCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [bindingModalOpen, setBindingModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QoSPolicy | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<QoSPolicy | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      setRefreshing(true);

      const [configResult, capsResult] = await Promise.allSettled([
        qosService.getConfig(),
        qosService.getCapabilities(),
      ]);

      if (configResult.status === "fulfilled") {
        setConfig(configResult.value);
      } else {
        throw new Error("Failed to load QoS config");
      }

      if (capsResult.status === "fulfilled") {
        setCapabilities(capsResult.value);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load QoS data";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeletePolicy = async (policy: QoSPolicy) => {
    try {
      const result = await qosService.deletePolicy(policy.type, policy.name);
      if (result.success) {
        toast.success("Policy Deleted", `Policy "${policy.name}" has been deleted`);
        setDeleteTarget(null);
        loadData();
      } else {
        toast.error("Failed", result.error || "Failed to delete policy");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    }
  };

  const handleUnbindInterface = async (binding: InterfaceBinding, direction: "egress" | "ingress") => {
    try {
      const result = direction === "egress"
        ? await qosService.unbindEgress(binding.interface)
        : await qosService.unbindIngress(binding.interface);

      if (result.success) {
        toast.success("Unbound", `${direction} policy unbound from ${binding.interface}`);
        loadData();
      } else {
        toast.error("Failed", result.error || "Failed to unbind policy");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    }
  };

  // Calculate statistics
  const totalPolicies = config?.policies.length || 0;
  const totalBindings = config?.interface_bindings.length || 0;
  const policiesByType = config?.policies.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Failed to load QoS configuration</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={loadData} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">QoS / Traffic Shaping</h2>
          <p className="text-muted-foreground">
            Configure traffic policies for bandwidth management and quality of service
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPolicies}</p>
                <p className="text-xs text-muted-foreground">Total Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Network className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBindings}</p>
                <p className="text-xs text-muted-foreground">Interface Bindings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Gauge className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{policiesByType["shaper"] || 0}</p>
                <p className="text-xs text-muted-foreground">Shapers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <ArrowRightLeft className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{policiesByType["limiter"] || 0}</p>
                <p className="text-xs text-muted-foreground">Limiters</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="policies" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Policies ({totalPolicies})
          </TabsTrigger>
          <TabsTrigger value="bindings" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Interface Bindings ({totalBindings})
          </TabsTrigger>
        </TabsList>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              setEditingPolicy(null);
              setPolicyModalOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Button>
          </div>

          {totalPolicies === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Gauge className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No QoS policies configured</p>
                  <p className="text-sm text-muted-foreground">
                    Create a policy to manage traffic and bandwidth
                  </p>
                  <Button variant="outline" onClick={() => setPolicyModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Policy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {config?.policies.map((policy) => (
                <PolicyCard
                  key={`${policy.type}-${policy.name}`}
                  policy={policy}
                  onDelete={() => setDeleteTarget(policy)}
                  onEdit={() => {
                    setEditingPolicy(policy);
                    setPolicyModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Bindings Tab */}
        <TabsContent value="bindings" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setBindingModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Bind Policy to Interface
            </Button>
          </div>

          {totalBindings === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Network className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No interface bindings configured</p>
                  <p className="text-sm text-muted-foreground">
                    Bind policies to interfaces to apply traffic shaping
                  </p>
                  <Button variant="outline" onClick={() => setBindingModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Binding
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Interface</TableHead>
                        <TableHead>Egress Policy</TableHead>
                        <TableHead>Ingress Policy</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config?.interface_bindings.map((binding) => (
                        <TableRow key={binding.interface}>
                          <TableCell className="font-mono font-medium">
                            {binding.interface}
                          </TableCell>
                          <TableCell>
                            {binding.egress ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-500/10">
                                  {binding.egress}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnbindInterface(binding, "egress")}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {binding.ingress ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-orange-500/10">
                                  {binding.ingress}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnbindInterface(binding, "ingress")}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBindingModalOpen(true)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <QoSPolicyModal
        open={policyModalOpen}
        onOpenChange={(open) => {
          setPolicyModalOpen(open);
          if (!open) setEditingPolicy(null);
        }}
        onSuccess={loadData}
        capabilities={capabilities}
        existingPolicy={editingPolicy}
      />

      <QoSBindingModal
        open={bindingModalOpen}
        onOpenChange={setBindingModalOpen}
        onSuccess={loadData}
        policies={config?.policies || []}
        existingBindings={config?.interface_bindings || []}
      />

      {deleteTarget && (
        <QoSDeleteConfirmModal
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          onConfirm={() => handleDeletePolicy(deleteTarget)}
          policy={deleteTarget}
        />
      )}
    </div>
  );
}

// Policy Card Component
interface PolicyCardProps {
  policy: QoSPolicy;
  onEdit: () => void;
  onDelete: () => void;
}

function PolicyCard({ policy, onEdit, onDelete }: PolicyCardProps) {
  const typeInfo = POLICY_TYPE_INFO[policy.type] || {
    label: policy.type,
    icon: <Gauge className="h-4 w-4" />,
    color: "bg-gray-500/10 text-gray-500",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeInfo.color}`}>
              {typeInfo.icon}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <code className="font-mono">{policy.name}</code>
                <Badge variant="outline" className={typeInfo.color}>
                  {typeInfo.label}
                </Badge>
              </CardTitle>
              {policy.description && <CardDescription>{policy.description}</CardDescription>}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {policy.bandwidth && (
            <div>
              <p className="text-muted-foreground">Bandwidth</p>
              <p className="font-mono font-medium">{policy.bandwidth}</p>
            </div>
          )}
          {policy.delay && (
            <div>
              <p className="text-muted-foreground">Delay</p>
              <p className="font-mono font-medium">{policy.delay}</p>
            </div>
          )}
          {policy.loss && (
            <div>
              <p className="text-muted-foreground">Packet Loss</p>
              <p className="font-mono font-medium">{policy.loss}%</p>
            </div>
          )}
          {policy.burst && (
            <div>
              <p className="text-muted-foreground">Burst</p>
              <p className="font-mono font-medium">{policy.burst}</p>
            </div>
          )}
          {policy.latency && (
            <div>
              <p className="text-muted-foreground">Latency</p>
              <p className="font-mono font-medium">{policy.latency}</p>
            </div>
          )}
          {policy.flow_isolation && (
            <div>
              <p className="text-muted-foreground">Flow Isolation</p>
              <p className="font-mono font-medium">{policy.flow_isolation}</p>
            </div>
          )}
          {policy.classes && policy.classes.length > 0 && (
            <div>
              <p className="text-muted-foreground">Classes</p>
              <p className="font-medium">{policy.classes.length}</p>
            </div>
          )}
          {policy.queue_limit && (
            <div>
              <p className="text-muted-foreground">Queue Limit</p>
              <p className="font-mono font-medium">{policy.queue_limit}</p>
            </div>
          )}
        </div>

        {/* Default class info for shapers */}
        {policy.type === "shaper" && policy.default && Object.keys(policy.default).some(k => policy.default[k]) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Default Class</p>
            <div className="flex flex-wrap gap-2">
              {(policy.default as { bandwidth?: string }).bandwidth && (
                <Badge variant="secondary">Bandwidth: {(policy.default as { bandwidth?: string }).bandwidth}</Badge>
              )}
              {(policy.default as { ceiling?: string }).ceiling && (
                <Badge variant="secondary">Ceiling: {(policy.default as { ceiling?: string }).ceiling}</Badge>
              )}
              {(policy.default as { queue_type?: string }).queue_type && (
                <Badge variant="secondary">Queue: {(policy.default as { queue_type?: string }).queue_type}</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
