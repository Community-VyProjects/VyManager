"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Lock,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Server,
  Users,
  ArrowLeftRight,
  Pencil,
  Trash2,
  Eye,
  Wand2,
  Search,
} from "lucide-react";
import {
  openvpnService,
  type OpenvpnInterface,
  type OpenvpnCapabilities,
  type OpenvpnConfigResponse,
} from "@/lib/api/openvpn";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { OpenvpnDetailsDrawer } from "@/components/openvpn/OpenvpnDetailsDrawer";
import { OpenvpnWizard } from "@/components/openvpn/OpenvpnWizard";
import { CreateOpenvpnModal } from "@/components/openvpn/CreateOpenvpnModal";
import { EditOpenvpnModal } from "@/components/openvpn/EditOpenvpnModal";
import { DeleteOpenvpnModal } from "@/components/openvpn/DeleteOpenvpnModal";

type ModeFilter = "all" | "server" | "client" | "site-to-site";

function modeLabel(mode: string | null): string {
  if (!mode) return "—";
  if (mode === "site-to-site") return "Site-to-Site";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function modeBadgeVariant(mode: string | null): "default" | "secondary" | "outline" {
  if (mode === "server") return "default";
  if (mode === "client") return "secondary";
  return "outline";
}

export default function OpenvpnPage() {
  const { canRead, canWrite } = usePermissions();
  const hasRead = canRead(FeatureGroup.OPENVPN);
  const hasWrite = canWrite(FeatureGroup.OPENVPN);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<OpenvpnConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<OpenvpnCapabilities | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");

  const [viewingInterface, setViewingInterface] = useState<OpenvpnInterface | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showAdvancedCreate, setShowAdvancedCreate] = useState(false);
  const [editingInterface, setEditingInterface] = useState<OpenvpnInterface | null>(null);
  const [deletingInterface, setDeletingInterface] = useState<OpenvpnInterface | null>(null);

  const fetchConfig = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        openvpnService.getConfig(refresh),
        openvpnService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load OpenVPN configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRead) fetchConfig();
  }, [hasRead]);

  const interfaces = config?.interfaces ?? [];

  const filteredInterfaces = interfaces.filter((iface) => {
    if (modeFilter !== "all" && iface.mode !== modeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!iface.name.toLowerCase().includes(q) &&
          !(iface.description?.toLowerCase().includes(q)) &&
          !(iface.mode?.toLowerCase().includes(q))) {
        return false;
      }
    }
    return true;
  });

  const totalCount = interfaces.length;
  const serverCount = interfaces.filter((i) => i.mode === "server").length;
  const clientCount = interfaces.filter((i) => i.mode === "client").length;
  const s2sCount = interfaces.filter((i) => i.mode === "site-to-site").length;

  const existingNames = interfaces.map((i) => i.name);

  const handleSuccess = () => {
    fetchConfig(true);
  };

  if (!hasRead) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-lg font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground">
              You do not have permission to view OpenVPN configuration.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading OpenVPN configuration...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-destructive font-medium">Failed to load configuration</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchConfig(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Lock className="h-6 w-6 text-primary" />
              OpenVPN
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage OpenVPN tunnels &mdash; server, client and site-to-site modes.
            </p>
          </div>
          <div className="flex gap-2">
            {hasWrite && (
              <>
                <Button onClick={() => setShowWizard(true)}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Quick Setup
                </Button>
                <Button variant="outline" onClick={() => setShowAdvancedCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Advanced Create
                </Button>
              </>
            )}
            <Button variant="outline" size="icon" onClick={() => fetchConfig(true)} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{totalCount}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-500/10">
                <Server className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{serverCount}</div>
                <div className="text-xs text-muted-foreground">Server</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-500/10">
                <Users className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{clientCount}</div>
                <div className="text-xs text-muted-foreground">Client</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-500/10">
                <ArrowLeftRight className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{s2sCount}</div>
                <div className="text-xs text-muted-foreground">Site-to-Site</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, description or mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={modeFilter} onValueChange={(v) => setModeFilter(v as ModeFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="server">Server</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="site-to-site">Site-to-Site</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table / Empty state */}
        {filteredInterfaces.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-3">
              <Lock className="h-12 w-12 text-muted-foreground/50 mx-auto" />
              <div className="text-lg font-medium">
                {interfaces.length === 0 ? "No OpenVPN interfaces yet" : "No matching interfaces"}
              </div>
              <div className="text-sm text-muted-foreground">
                {interfaces.length === 0
                  ? "Create your first OpenVPN tunnel to get started."
                  : "Try adjusting your search or filter."}
              </div>
              {hasWrite && interfaces.length === 0 && (
                <Button onClick={() => setShowWizard(true)} className="mt-2">
                  <Wand2 className="h-4 w-4 mr-2" />
                  Quick Setup
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Remote</TableHead>
                  <TableHead>Encryption</TableHead>
                  <TableHead>VRF</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInterfaces.map((iface) => {
                  const local = iface.local_host
                    ? `${iface.local_host}${iface.local_port ? ":" + iface.local_port : ""}`
                    : (iface.local_port ? `:${iface.local_port}` : "—");
                  const remote = iface.remote_host.length > 0
                    ? `${iface.remote_host[0]}${iface.remote_port ? ":" + iface.remote_port : ""}${iface.remote_host.length > 1 ? ` +${iface.remote_host.length - 1}` : ""}`
                    : (iface.remote_address.length > 0 ? iface.remote_address[0] : "—");
                  const cipherText = iface.encryption?.cipher || "—";
                  const dataCount = iface.encryption?.data_ciphers.length ?? 0;
                  const encText = dataCount > 0 ? `${cipherText} +${dataCount}` : cipherText;
                  return (
                    <TableRow
                      key={iface.name}
                      className="cursor-pointer"
                      onClick={() => setViewingInterface(iface)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-primary" />
                          <span>{iface.name}</span>
                        </div>
                        {iface.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {iface.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={modeBadgeVariant(iface.mode)}>
                          {modeLabel(iface.mode)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {iface.disabled ? (
                          <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">
                            Disabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600/30">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{local}</TableCell>
                      <TableCell className="text-xs font-mono">{remote}</TableCell>
                      <TableCell className="text-xs">{encText}</TableCell>
                      <TableCell className="text-xs">{iface.vrf || "—"}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View details"
                            onClick={() => setViewingInterface(iface)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {hasWrite && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit"
                                onClick={() => setEditingInterface(iface)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                onClick={() => setDeletingInterface(iface)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Details drawer (read-only) */}
      <OpenvpnDetailsDrawer
        open={viewingInterface !== null}
        onOpenChange={(open) => !open && setViewingInterface(null)}
        interfaceData={viewingInterface}
      />

      {/* Quick Setup Wizard */}
      {hasWrite && (
        <OpenvpnWizard
          open={showWizard}
          onOpenChange={setShowWizard}
          onSuccess={handleSuccess}
          capabilities={capabilities}
          existingNames={existingNames}
        />
      )}

      {/* Advanced Create Modal */}
      {hasWrite && (
        <CreateOpenvpnModal
          open={showAdvancedCreate}
          onOpenChange={setShowAdvancedCreate}
          onSuccess={handleSuccess}
          capabilities={capabilities}
          existingNames={existingNames}
        />
      )}

      {/* Edit Modal */}
      {hasWrite && editingInterface && (
        <EditOpenvpnModal
          open={true}
          onOpenChange={(open) => !open && setEditingInterface(null)}
          onSuccess={handleSuccess}
          capabilities={capabilities}
          interfaceData={editingInterface}
        />
      )}

      {/* Delete Modal */}
      {hasWrite && deletingInterface && (
        <DeleteOpenvpnModal
          open={true}
          onOpenChange={(open) => !open && setDeletingInterface(null)}
          onSuccess={handleSuccess}
          interfaceData={deletingInterface}
        />
      )}
    </AppLayout>
  );
}
