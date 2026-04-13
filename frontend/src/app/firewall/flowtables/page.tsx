"use client";

import { AppLayout } from "@/components/layout/AppLayout";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  RefreshCw,
  Zap,
  MoreHorizontal,
  Pencil,
  Trash2,
  Network,
  Cpu,
  HardDrive,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  flowtablesService,
  type Flowtable,
  type FlowtablesConfigResponse,
  type FlowtablesCapabilities,
} from "@/lib/api/firewall-flowtables";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { CreateFlowtableModal } from "@/components/firewall/CreateFlowtableModal";
import { EditFlowtableModal } from "@/components/firewall/EditFlowtableModal";
import { DeleteFlowtableModal } from "@/components/firewall/DeleteFlowtableModal";

export default function FlowtablesPage() {
  // Data state
  const [config, setConfig] = useState<FlowtablesConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<FlowtablesCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingFlowtable, setEditingFlowtable] = useState<Flowtable | null>(null);
  const [deletingFlowtable, setDeletingFlowtable] = useState<Flowtable | null>(null);

  const fetchConfig = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await flowtablesService.getConfig(refresh);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flowtables configuration");
      console.error("Error fetching flowtables config:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCapabilities = async () => {
    try {
      const caps = await flowtablesService.getCapabilities();
      setCapabilities(caps);
    } catch (err) {
      console.error("Error fetching flowtables capabilities:", err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchCapabilities();
  }, []);

  const flowtables = config?.flowtables || [];

  // Filter flowtables based on search
  const filteredFlowtables = flowtables.filter((ft) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ft.name.toLowerCase().includes(query) ||
      ft.description?.toLowerCase().includes(query) ||
      ft.interfaces.some((iface) => iface.toLowerCase().includes(query)) ||
      ft.offload?.toLowerCase().includes(query)
    );
  });

  const getOffloadIcon = (offload: string | null | undefined) => {
    if (offload === "hardware") {
      return <Cpu className="h-4 w-4" />;
    }
    return <HardDrive className="h-4 w-4" />;
  };

  const getOffloadBadgeClass = (offload: string | null | undefined) => {
    if (offload === "hardware") {
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    }
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-card/50 px-6 py-4">
          <PageHeader
            title="Flowtables"
            subtitle="Manage fast-path packet offloading for established connections"
            icon={<Zap className="h-5 w-5 text-primary" />}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchConfig(true)}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Flowtable
                </Button>
              </div>
            }
          />

          {/* Search and Stats */}
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search flowtables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredFlowtables.length} flowtable{filteredFlowtables.length !== 1 ? "s" : ""}
            </div>
            {capabilities && (
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Network className="h-3 w-3" />
                  VyOS {capabilities.version}
                </Badge>
                {capabilities.features.hardware_offload.supported && (
                  <Badge variant="outline" className="gap-1 bg-purple-500/10 text-purple-500 border-purple-500/20">
                    <Cpu className="h-3 w-3" />
                    HW Offload
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <LoadingState message="Loading flowtables configuration..." />
          ) : error ? (
            <ErrorState
              title="Error Loading Configuration"
              message={error}
              onRetry={() => fetchConfig(true)}
            />
          ) : filteredFlowtables.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Card className="max-w-md">
                <CardContent className="flex flex-col items-center text-center py-12 px-8">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {searchQuery ? "No matching flowtables" : "No flowtables configured"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-6">
                    {searchQuery
                      ? "Try adjusting your search query"
                      : "Flowtables enable fast-path packet processing by offloading established connections to hardware or software acceleration."}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Flowtable
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead className="w-[300px]">Description</TableHead>
                    <TableHead>Interfaces</TableHead>
                    <TableHead className="w-[150px]">Offload Type</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFlowtables.map((ft) => (
                    <TableRow key={ft.name}>
                      <TableCell>
                        <span className="font-mono font-semibold text-foreground">{ft.name}</span>
                      </TableCell>
                      <TableCell>
                        {ft.description ? (
                          <span className="text-muted-foreground">{ft.description}</span>
                        ) : (
                          <span className="text-muted-foreground/50 italic">No description</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ft.interfaces.length > 0 ? (
                            ft.interfaces.map((iface) => (
                              <Badge key={iface} variant="secondary" className="font-mono">
                                {iface}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground/50 italic">No interfaces</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("gap-1 capitalize", getOffloadBadgeClass(ft.offload))}
                        >
                          {getOffloadIcon(ft.offload)}
                          {ft.offload || "software"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingFlowtable(ft)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingFlowtable(ft)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateFlowtableModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => fetchConfig(true)}
        existingFlowtables={flowtables}
      />

      <EditFlowtableModal
        open={!!editingFlowtable}
        onOpenChange={(open) => !open && setEditingFlowtable(null)}
        onSuccess={() => fetchConfig(true)}
        flowtable={editingFlowtable}
      />

      <DeleteFlowtableModal
        open={!!deletingFlowtable}
        onOpenChange={(open) => !open && setDeletingFlowtable(null)}
        onSuccess={() => fetchConfig(true)}
        flowtable={deletingFlowtable}
      />
    </AppLayout>
  );
}
