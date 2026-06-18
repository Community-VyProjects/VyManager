"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Server,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  natService,
  type CGNATConfig,
  type CGNATExternalPool,
  type CGNATInternalPool,
  type CGNATRule,
} from "@/lib/api/nat";

// ==================== Props ====================

interface CGNATViewProps {
  config: CGNATConfig | null | undefined;
  onRefresh: () => void;
  canWrite: boolean;
  loading: boolean;
}

type TabValue = "pools" | "rules";

// ==================== Form State Types ====================

interface ExternalPoolFormState {
  name: string;
  external_port_range: string;
  per_user_limit_port: string;
  ranges: Array<{ range: string; seq: string }>;
}

interface InternalPoolFormState {
  name: string;
  ranges: string[];
}

interface CGNATRuleFormState {
  source_pool: string;
  translation_pool: string;
}

interface DeleteTarget {
  type: "external_pool" | "internal_pool" | "rule";
  name: string;
  ruleNumber?: number;
}

// ==================== Component ====================

export function CGNATView({ config, onRefresh, canWrite, loading }: CGNATViewProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("pools");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [externalPoolOpen, setExternalPoolOpen] = useState(false);
  const [internalPoolOpen, setInternalPoolOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Edit targets (null = create mode)
  const [editingExternalPool, setEditingExternalPool] = useState<CGNATExternalPool | null>(null);
  const [editingInternalPool, setEditingInternalPool] = useState<CGNATInternalPool | null>(null);
  const [editingRule, setEditingRule] = useState<CGNATRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Form states
  const [extPoolForm, setExtPoolForm] = useState<ExternalPoolFormState>({
    name: "",
    external_port_range: "",
    per_user_limit_port: "",
    ranges: [{ range: "", seq: "" }],
  });

  const [intPoolForm, setIntPoolForm] = useState<InternalPoolFormState>({
    name: "",
    ranges: [""],
  });

  const [ruleForm, setRuleForm] = useState<CGNATRuleFormState>({
    source_pool: "",
    translation_pool: "",
  });

  const externalPools = config?.external_pools ?? [];
  const internalPools = config?.internal_pools ?? [];
  const rules = useMemo(() => config?.rules ?? [], [config]);
  const logAllocation = config?.log_allocation ?? false;

  // ==================== Helpers ====================

  const resetError = useCallback(() => setError(null), []);

  const withSaving = useCallback(async (fn: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Operation failed";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [onRefresh]);

  // ==================== Log Allocation ====================

  const handleToggleLogAllocation = useCallback(() => {
    if (!canWrite) return;
    withSaving(async () => {
      await natService.setCGNATLogAllocation(!logAllocation);
    });
  }, [canWrite, logAllocation, withSaving]);

  // ==================== External Pool Handlers ====================

  const openCreateExternalPool = useCallback(() => {
    setEditingExternalPool(null);
    setExtPoolForm({
      name: "",
      external_port_range: "",
      per_user_limit_port: "",
      ranges: [{ range: "", seq: "" }],
    });
    resetError();
    setExternalPoolOpen(true);
  }, [resetError]);

  const openEditExternalPool = useCallback((pool: CGNATExternalPool) => {
    setEditingExternalPool(pool);
    setExtPoolForm({
      name: pool.name,
      external_port_range: pool.external_port_range ?? "",
      per_user_limit_port: pool.per_user_limit_port ?? "",
      ranges: pool.ranges.length > 0
        ? pool.ranges.map((r) => ({ range: r.range, seq: r.seq ?? "" }))
        : [{ range: "", seq: "" }],
    });
    resetError();
    setExternalPoolOpen(true);
  }, [resetError]);

  const handleSaveExternalPool = useCallback(() => {
    const name = extPoolForm.name.trim();
    if (!name) {
      setError("Pool name is required");
      return;
    }

    const validRanges = extPoolForm.ranges
      .filter((r) => r.range.trim() !== "")
      .map((r) => ({
        range: r.range.trim(),
        ...(r.seq.trim() ? { seq: r.seq.trim() } : {}),
      }));

    withSaving(async () => {
      if (editingExternalPool) {
        const oldRangeStrings = editingExternalPool.ranges.map((r) => r.range);
        await natService.updateExternalPool(name, {
          external_port_range: extPoolForm.external_port_range.trim() || undefined,
          per_user_limit_port: extPoolForm.per_user_limit_port.trim() || undefined,
          delete_external_port_range: !extPoolForm.external_port_range.trim() && !!editingExternalPool.external_port_range,
          delete_per_user_limit_port: !extPoolForm.per_user_limit_port.trim() && !!editingExternalPool.per_user_limit_port,
          delete_ranges: oldRangeStrings,
          ranges: validRanges,
        });
      } else {
        await natService.createExternalPool(name, {
          external_port_range: extPoolForm.external_port_range.trim() || undefined,
          per_user_limit_port: extPoolForm.per_user_limit_port.trim() || undefined,
          ranges: validRanges,
        });
      }
      setExternalPoolOpen(false);
    });
  }, [extPoolForm, editingExternalPool, withSaving]);

  // ==================== Internal Pool Handlers ====================

  const openCreateInternalPool = useCallback(() => {
    setEditingInternalPool(null);
    setIntPoolForm({ name: "", ranges: [""] });
    resetError();
    setInternalPoolOpen(true);
  }, [resetError]);

  const openEditInternalPool = useCallback((pool: CGNATInternalPool) => {
    setEditingInternalPool(pool);
    setIntPoolForm({
      name: pool.name,
      ranges: pool.ranges.length > 0 ? [...pool.ranges] : [""],
    });
    resetError();
    setInternalPoolOpen(true);
  }, [resetError]);

  const handleSaveInternalPool = useCallback(() => {
    const name = intPoolForm.name.trim();
    if (!name) {
      setError("Pool name is required");
      return;
    }

    const validRanges = intPoolForm.ranges.filter((r) => r.trim() !== "");

    withSaving(async () => {
      if (editingInternalPool) {
        await natService.updateInternalPool(name, {
          delete_ranges: editingInternalPool.ranges,
          ranges: validRanges,
        });
      } else {
        await natService.createInternalPool(name, { ranges: validRanges });
      }
      setInternalPoolOpen(false);
    });
  }, [intPoolForm, editingInternalPool, withSaving]);

  // ==================== Rule Handlers ====================

  const getNextCGNATRuleNumber = useCallback((): number => {
    if (rules.length === 0) return 100;
    const maxRule = Math.max(...rules.map(r => r.rule_number));
    return maxRule + 1;
  }, [rules]);

  const openCreateRule = useCallback(() => {
    setEditingRule(null);
    setRuleForm({ source_pool: "", translation_pool: "" });
    resetError();
    setRuleDialogOpen(true);
  }, [resetError]);

  const openEditRule = useCallback((rule: CGNATRule) => {
    setEditingRule(rule);
    setRuleForm({
      source_pool: rule.source_pool ?? "",
      translation_pool: rule.translation_pool ?? "",
    });
    resetError();
    setRuleDialogOpen(true);
  }, [resetError]);

  const handleSaveRule = useCallback(() => {
    withSaving(async () => {
      const ruleConfig = {
        source_pool: ruleForm.source_pool || undefined,
        translation_pool: ruleForm.translation_pool || undefined,
      };

      if (editingRule) {
        await natService.updateCGNATRule(editingRule.rule_number, ruleConfig);
      } else {
        const ruleNum = getNextCGNATRuleNumber();
        await natService.createCGNATRule(ruleNum, ruleConfig);
      }
      setRuleDialogOpen(false);
    });
  }, [ruleForm, editingRule, getNextCGNATRuleNumber, withSaving]);

  // ==================== Delete Handlers ====================

  const openDelete = useCallback((target: DeleteTarget) => {
    setDeleteTarget(target);
    resetError();
    setDeleteDialogOpen(true);
  }, [resetError]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;

    withSaving(async () => {
      switch (deleteTarget.type) {
        case "external_pool":
          await natService.deleteExternalPool(deleteTarget.name);
          break;
        case "internal_pool":
          await natService.deleteInternalPool(deleteTarget.name);
          break;
        case "rule":
          if (deleteTarget.ruleNumber !== undefined) {
            await natService.deleteAndCompactCGNATRules(deleteTarget.ruleNumber);
          }
          break;
      }
      setDeleteDialogOpen(false);
    });
  }, [deleteTarget, withSaving]);

  // ==================== Render ====================

  return (
    <div className="space-y-4">
      {/* Header: Tabs + Log Allocation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab("pools")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === "pools"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Server className="h-4 w-4" />
            Pools
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === "rules"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-4 w-4" />
            Rules
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="cgnat-log-allocation"
            checked={logAllocation}
            onCheckedChange={handleToggleLogAllocation}
            disabled={!canWrite || saving}
          />
          <Label
            htmlFor="cgnat-log-allocation"
            className="text-sm font-medium cursor-pointer select-none"
          >
            Log Allocation
          </Label>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Pools Tab */}
      {activeTab === "pools" && (
        <div className="space-y-6">
          {/* External Pools */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">External Pools</h3>
                {canWrite && (
                  <Button size="sm" onClick={openCreateExternalPool} disabled={loading}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Pool
                  </Button>
                )}
              </div>
              <ScrollArea className={externalPools.length > 5 ? "h-[320px]" : undefined}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>IP Ranges</TableHead>
                      <TableHead>Port Range</TableHead>
                      <TableHead>Per-User Port Limit</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {externalPools.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No external pools configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      externalPools.map((pool) => (
                        <TableRow key={pool.name} className="group">
                          <TableCell className="font-medium">{pool.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {pool.ranges.map((r, idx) => (
                                <Badge key={idx} variant="outline" className="font-mono text-xs">
                                  {r.range}
                                  {r.seq && <span className="text-muted-foreground ml-1">seq:{r.seq}</span>}
                                </Badge>
                              ))}
                              {pool.ranges.length === 0 && (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                              {pool.external_port_range || "-"}
                            </code>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                              {pool.per_user_limit_port || "-"}
                            </code>
                          </TableCell>
                          <TableCell>
                            {canWrite && (
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditExternalPool(pool)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => openDelete({ type: "external_pool", name: pool.name })}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Internal Pools */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Internal Pools</h3>
                {canWrite && (
                  <Button size="sm" onClick={openCreateInternalPool} disabled={loading}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Pool
                  </Button>
                )}
              </div>
              <ScrollArea className={internalPools.length > 5 ? "h-[320px]" : undefined}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>IP Ranges</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {internalPools.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No internal pools configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      internalPools.map((pool) => (
                        <TableRow key={pool.name} className="group">
                          <TableCell className="font-medium">{pool.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {pool.ranges.map((r, idx) => (
                                <Badge key={idx} variant="outline" className="font-mono text-xs">
                                  {r}
                                </Badge>
                              ))}
                              {pool.ranges.length === 0 && (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {canWrite && (
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditInternalPool(pool)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => openDelete({ type: "internal_pool", name: pool.name })}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">CGNAT Rules</h3>
              {canWrite && (
                <Button size="sm" onClick={openCreateRule} disabled={loading}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rule
                </Button>
              )}
            </div>
            <ScrollArea className={rules.length > 8 ? "h-[400px]" : undefined}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Rule #</TableHead>
                    <TableHead>Source Pool</TableHead>
                    <TableHead>Translation Pool</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No CGNAT rules configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map((rule) => (
                      <TableRow key={rule.rule_number} className="group">
                        <TableCell className="font-mono font-semibold text-base">
                          {rule.rule_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {rule.source_pool || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                            {rule.translation_pool || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {canWrite && (
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditRule(rule)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  openDelete({
                                    type: "rule",
                                    name: `Rule ${rule.rule_number}`,
                                    ruleNumber: rule.rule_number,
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ==================== External Pool Dialog ==================== */}
      <Dialog open={externalPoolOpen} onOpenChange={setExternalPoolOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingExternalPool ? "Edit External Pool" : "Create External Pool"}
            </DialogTitle>
            <DialogDescription>
              Configure an external IP pool for CGNAT with port allocation settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ext-pool-name">Pool Name</Label>
              <Input
                id="ext-pool-name"
                value={extPoolForm.name}
                onChange={(e) => setExtPoolForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="external-pool-1"
                disabled={!!editingExternalPool}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ext-port-range">External Port Range</Label>
                <Input
                  id="ext-port-range"
                  value={extPoolForm.external_port_range}
                  onChange={(e) => setExtPoolForm((f) => ({ ...f, external_port_range: e.target.value }))}
                  placeholder="1024-65535"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ext-per-user-limit">Per-User Port Limit</Label>
                <Input
                  id="ext-per-user-limit"
                  value={extPoolForm.per_user_limit_port}
                  onChange={(e) => setExtPoolForm((f) => ({ ...f, per_user_limit_port: e.target.value }))}
                  placeholder="2000"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>IP Ranges</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setExtPoolForm((f) => ({
                      ...f,
                      ranges: [...f.ranges, { range: "", seq: "" }],
                    }))
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Range
                </Button>
              </div>
              <div className="space-y-2">
                {extPoolForm.ranges.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={r.range}
                      onChange={(e) => {
                        const updated = [...extPoolForm.ranges];
                        updated[idx] = { ...updated[idx], range: e.target.value };
                        setExtPoolForm((f) => ({ ...f, ranges: updated }));
                      }}
                      placeholder="203.0.113.0/24 or 203.0.113.1-203.0.113.10"
                      className="font-mono text-sm"
                    />
                    <Input
                      value={r.seq}
                      onChange={(e) => {
                        const updated = [...extPoolForm.ranges];
                        updated[idx] = { ...updated[idx], seq: e.target.value };
                        setExtPoolForm((f) => ({ ...f, ranges: updated }));
                      }}
                      placeholder="seq"
                      className="w-20 font-mono text-sm"
                    />
                    {extPoolForm.ranges.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setExtPoolForm((f) => ({
                            ...f,
                            ranges: f.ranges.filter((_, i) => i !== idx),
                          }));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setExternalPoolOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveExternalPool} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Internal Pool Dialog ==================== */}
      <Dialog open={internalPoolOpen} onOpenChange={setInternalPoolOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingInternalPool ? "Edit Internal Pool" : "Create Internal Pool"}
            </DialogTitle>
            <DialogDescription>
              Configure an internal IP pool for CGNAT source address matching.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="int-pool-name">Pool Name</Label>
              <Input
                id="int-pool-name"
                value={intPoolForm.name}
                onChange={(e) => setIntPoolForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="internal-pool-1"
                disabled={!!editingInternalPool}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>IP Ranges</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setIntPoolForm((f) => ({ ...f, ranges: [...f.ranges, ""] }))
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Range
                </Button>
              </div>
              <div className="space-y-2">
                {intPoolForm.ranges.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={r}
                      onChange={(e) => {
                        const updated = [...intPoolForm.ranges];
                        updated[idx] = e.target.value;
                        setIntPoolForm((f) => ({ ...f, ranges: updated }));
                      }}
                      placeholder="100.64.0.0/24 or 100.64.0.1-100.64.0.254"
                      className="font-mono text-sm"
                    />
                    {intPoolForm.ranges.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setIntPoolForm((f) => ({
                            ...f,
                            ranges: f.ranges.filter((_, i) => i !== idx),
                          }));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInternalPoolOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveInternalPool} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== CGNAT Rule Dialog ==================== */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit CGNAT Rule" : "Create CGNAT Rule"}
            </DialogTitle>
            <DialogDescription>
              Map an internal pool to an external pool for carrier-grade NAT translation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rule Number</Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 font-mono text-sm">
                {editingRule ? editingRule.rule_number : getNextCGNATRuleNumber()}
                <span className="ml-2 text-muted-foreground text-xs">(auto-assigned)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-pool">Source Pool (Internal)</Label>
              <Select
                value={ruleForm.source_pool}
                onValueChange={(value) => setRuleForm((f) => ({ ...f, source_pool: value }))}
              >
                <SelectTrigger id="source-pool">
                  <SelectValue placeholder="Select internal pool" />
                </SelectTrigger>
                <SelectContent>
                  {internalPools.map((pool) => (
                    <SelectItem key={pool.name} value={pool.name}>
                      {pool.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="translation-pool">Translation Pool (External)</Label>
              <Select
                value={ruleForm.translation_pool}
                onValueChange={(value) => setRuleForm((f) => ({ ...f, translation_pool: value }))}
              >
                <SelectTrigger id="translation-pool">
                  <SelectValue placeholder="Select external pool" />
                </SelectTrigger>
                <SelectContent>
                  {externalPools.map((pool) => (
                    <SelectItem key={pool.name} value={pool.name}>
                      {pool.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Delete Confirmation Dialog ==================== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
