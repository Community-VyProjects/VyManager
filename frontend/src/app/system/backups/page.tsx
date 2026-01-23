"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  RefreshCw,
  AlertCircle,
  Search,
  Download,
  Trash2,
  RotateCcw,
  Eye,
  Archive,
  Calendar,
  User,
  HardDrive,
  GitCompare,
} from "lucide-react";
import { useState, useEffect } from "react";
import { configService } from "@/lib/api/config";
import type { ConfigBackup, ConfigBackupDetail, ConfigDiff } from "@/lib/api/config";
import { formatDistanceToNow } from "date-fns";
import { ConfigCompareModal } from "@/components/config/ConfigCompareModal";
import { useSessionStore } from "@/store/session-store";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function BackupsPage() {
  const { activeSession } = useSessionStore();
  const [backups, setBackups] = useState<ConfigBackup[]>([]);
  const [totalBackups, setTotalBackups] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<ConfigBackup | null>(null);
  const [backupDetail, setBackupDetail] = useState<ConfigBackupDetail | null>(null);
  const [backupDiff, setBackupDiff] = useState<ConfigDiff | null>(null);

  // Form states
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadBackups = async () => {
    try {
      setError(null);
      const response = await configService.listBackups();
      setBackups(response.backups);
      setTotalBackups(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreate = async () => {
    if (!createName.trim()) return;

    setCreating(true);
    try {
      await configService.createBackup({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
      });
      setCreateModalOpen(false);
      setCreateName("");
      setCreateDescription("");
      loadBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create backup");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBackup) return;

    setDeleting(true);
    try {
      await configService.deleteBackup(selectedBackup.id);
      setDeleteModalOpen(false);
      setSelectedBackup(null);
      loadBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete backup");
    } finally {
      setDeleting(false);
    }
  };

  const handleView = async (backup: ConfigBackup) => {
    setSelectedBackup(backup);
    setViewModalOpen(true);
    try {
      const detail = await configService.getBackup(backup.id);
      setBackupDetail(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backup details");
    }
  };

  const handleDiff = async (backup: ConfigBackup) => {
    setSelectedBackup(backup);
    setDiffModalOpen(true);
    setBackupDiff(null);
    try {
      const diff = await configService.diffBackup(backup.id);
      setBackupDiff(diff);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compare backup");
    }
  };

  const handleDownload = (backup: ConfigBackup) => {
    window.open(configService.getBackupDownloadUrl(backup.id), "_blank");
  };

  // Filter backups
  const filteredBackups = backups.filter((backup) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      backup.name.toLowerCase().includes(query) ||
      backup.description?.toLowerCase().includes(query) ||
      backup.created_by_name.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configuration Backups</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage configuration snapshots for backup and restore
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadBackups}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setCompareModalOpen(true)}>
              <GitCompare className="h-4 w-4 mr-2" />
              Compare Instances
            </Button>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Backup
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-2 py-3">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Archive className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Backups</p>
                  <p className="text-2xl font-bold">{totalBackups}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <HardDrive className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Size</p>
                  <p className="text-2xl font-bold">
                    {formatBytes(backups.reduce((sum, b) => sum + b.config_size, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Latest Backup</p>
                  <p className="text-2xl font-bold">
                    {backups.length > 0
                      ? formatDistanceToNow(new Date(backups[0].created_at), { addSuffix: true })
                      : "Never"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search backups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Backups List */}
        {filteredBackups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No backups found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Create your first backup to get started"}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Backup
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBackups.map((backup) => (
              <Card key={backup.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Archive className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{backup.name}</h3>
                      {backup.description && (
                        <p className="text-sm text-muted-foreground">{backup.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(backup.created_at), { addSuffix: true })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {backup.created_by_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatBytes(backup.config_size)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(backup)}
                      title="View backup"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDiff(backup)}
                      title="Compare with current"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(backup)}
                      title="Download backup"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBackup(backup);
                        setDeleteModalOpen(true);
                      }}
                      title="Delete backup"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Backup Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Configuration Backup</DialogTitle>
            <DialogDescription>
              Create a snapshot of the current running configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Backup Name</Label>
              <Input
                id="name"
                placeholder="e.g., Before firewall changes"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this backup..."
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!createName.trim() || creating}>
              {creating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Backup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the backup &quot;{selectedBackup?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Backup Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Backup Details: {selectedBackup?.name}</DialogTitle>
            <DialogDescription>
              Created {selectedBackup && formatDistanceToNow(new Date(selectedBackup.created_at), { addSuffix: true })} by {selectedBackup?.created_by_name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {backupDetail ? (
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-[50vh]">
                {JSON.stringify(backupDetail.config, null, 2)}
              </pre>
            ) : (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
            {selectedBackup && (
              <Button onClick={() => handleDownload(selectedBackup)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diff Modal */}
      <Dialog open={diffModalOpen} onOpenChange={setDiffModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Compare: {selectedBackup?.name} vs Current</DialogTitle>
            <DialogDescription>
              Shows what would change if you restored this backup
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {backupDiff ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex gap-4">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    +{backupDiff.summary.added} additions
                  </Badge>
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                    -{backupDiff.summary.removed} removals
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    ~{backupDiff.summary.modified} modifications
                  </Badge>
                </div>

                {!backupDiff.has_changes ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">No differences found - backup matches current configuration</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {Object.keys(backupDiff.added).length > 0 && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm text-green-500">Additions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="bg-green-500/5 p-3 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(backupDiff.added, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                    {Object.keys(backupDiff.removed).length > 0 && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm text-red-500">Removals</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="bg-red-500/5 p-3 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(backupDiff.removed, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                    {Object.keys(backupDiff.modified).length > 0 && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm text-yellow-500">Modifications</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="bg-yellow-500/5 p-3 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(backupDiff.modified, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiffModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Instances Modal */}
      {activeSession && (
        <ConfigCompareModal
          open={compareModalOpen}
          onOpenChange={setCompareModalOpen}
          currentInstanceId={activeSession.instance_id}
          backups={backups}
        />
      )}
    </AppLayout>
  );
}
