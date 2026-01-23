"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, GitCompare, Server, AlertCircle } from "lucide-react";
import { configService } from "@/lib/api/config";
import { dashboardService, InstanceStatus } from "@/lib/api/dashboard";
import type { ConfigBackup, InstanceCompareResponse } from "@/lib/api/config";

interface ConfigCompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentInstanceId: string;
  backups: ConfigBackup[];
}

export function ConfigCompareModal({
  open,
  onOpenChange,
  currentInstanceId,
  backups,
}: ConfigCompareModalProps) {
  const [instances, setInstances] = useState<InstanceStatus[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InstanceCompareResponse | null>(null);

  // Form state
  const [sourceBackupId, setSourceBackupId] = useState<string>("current");
  const [targetInstanceId, setTargetInstanceId] = useState<string>("");
  const [targetBackupId, setTargetBackupId] = useState<string>("latest");
  const [targetBackups, setTargetBackups] = useState<ConfigBackup[]>([]);
  const [loadingTargetBackups, setLoadingTargetBackups] = useState(false);

  // Load all instances on open
  useEffect(() => {
    if (open) {
      loadInstances();
      setResult(null);
      setError(null);
    }
  }, [open]);

  // Load target backups when target instance changes
  useEffect(() => {
    if (targetInstanceId && targetInstanceId !== currentInstanceId) {
      loadTargetBackups();
    }
  }, [targetInstanceId]);

  const loadInstances = async () => {
    setLoadingInstances(true);
    try {
      const overview = await dashboardService.getOverview();
      const allInstances = overview.sites.flatMap((site) => site.instances);
      // Filter out current instance
      setInstances(allInstances.filter((inst) => inst.id !== currentInstanceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load instances");
    } finally {
      setLoadingInstances(false);
    }
  };

  const loadTargetBackups = async () => {
    setLoadingTargetBackups(true);
    setTargetBackups([]);
    setTargetBackupId("latest");
    try {
      // We need to call a different API that can list backups for any instance
      // For now, we'll set an empty list since the comparison can use "latest"
      // The backend will fetch the latest backup automatically
      setTargetBackups([]);
    } catch (err) {
      console.error("Failed to load target backups:", err);
    } finally {
      setLoadingTargetBackups(false);
    }
  };

  const handleCompare = async () => {
    if (!targetInstanceId) {
      setError("Please select a target instance");
      return;
    }

    setComparing(true);
    setError(null);
    setResult(null);

    try {
      const response = await configService.compareInstances({
        source_backup_id: sourceBackupId === "current" ? null : sourceBackupId,
        target_instance_id: targetInstanceId,
        target_backup_id: targetBackupId === "latest" ? null : targetBackupId,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compare configurations");
    } finally {
      setComparing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setResult(null);
    setError(null);
    setSourceBackupId("current");
    setTargetInstanceId("");
    setTargetBackupId("latest");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Configurations
          </DialogTitle>
          <DialogDescription>
            Compare configuration between instances or backups
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6 py-4">
          {/* Error Display */}
          {error && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="flex items-center gap-2 py-3">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">{error}</span>
              </CardContent>
            </Card>
          )}

          {/* Comparison Selection */}
          {!result && (
            <div className="grid grid-cols-2 gap-6">
              {/* Source Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Source (Current Instance)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Configuration</Label>
                    <Select value={sourceBackupId} onValueChange={setSourceBackupId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select configuration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">
                          Current Running Configuration
                        </SelectItem>
                        {backups.map((backup) => (
                          <SelectItem key={backup.id} value={backup.id}>
                            {backup.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Target Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Target (Another Instance)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Instance</Label>
                    <Select
                      value={targetInstanceId}
                      onValueChange={setTargetInstanceId}
                      disabled={loadingInstances}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingInstances ? "Loading..." : "Select instance"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {instances.length === 0 ? (
                          <SelectItem value="_none" disabled>
                            No other instances available
                          </SelectItem>
                        ) : (
                          instances.map((inst) => (
                            <SelectItem key={inst.id} value={inst.id}>
                              {inst.name} ({inst.siteName})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Configuration</Label>
                    <Select
                      value={targetBackupId}
                      onValueChange={setTargetBackupId}
                      disabled={!targetInstanceId || loadingTargetBackups}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select configuration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="latest">Latest Backup</SelectItem>
                        {targetBackups.map((backup) => (
                          <SelectItem key={backup.id} value={backup.id}>
                            {backup.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The target instance must have at least one backup
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Comparison Results */}
          {result && (
            <div className="space-y-4">
              {/* Summary Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="bg-primary/10">
                    {result.source_instance_name}
                  </Badge>
                  <span className="text-muted-foreground">vs</span>
                  <Badge variant="outline" className="bg-primary/10">
                    {result.target_instance_name}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResult(null)}
                >
                  New Comparison
                </Button>
              </div>

              {/* Change Summary */}
              <div className="flex gap-4">
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-500 border-green-500/20"
                >
                  +{result.summary.added} in source only
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-red-500/10 text-red-500 border-red-500/20"
                >
                  -{result.summary.removed} in target only
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                >
                  ~{result.summary.modified} modified
                </Badge>
              </div>

              {/* Diff Content */}
              {!result.has_changes ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">
                      No differences found - configurations are identical
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 max-h-[40vh] overflow-auto">
                  {Object.keys(result.added).length > 0 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm text-green-500">
                          Present in Source Only (would be removed from target)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-green-500/5 p-3 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(result.added, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                  {Object.keys(result.removed).length > 0 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm text-red-500">
                          Present in Target Only (would be added to source)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-red-500/5 p-3 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(result.removed, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                  {Object.keys(result.modified).length > 0 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm text-yellow-500">
                          Modified Values
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-yellow-500/5 p-3 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(result.modified, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {!result && (
            <Button
              onClick={handleCompare}
              disabled={!targetInstanceId || comparing}
            >
              {comparing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
