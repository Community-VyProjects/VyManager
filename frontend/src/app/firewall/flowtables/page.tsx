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
  AlertCircle,
  Zap,
  MoreHorizontal,
  Pencil,
  Trash2,
  Cpu,
  HardDrive,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  flowtablesService,
  type Flowtable,
  type FlowtablesConfigResponse,
  type FlowtablesCapabilities,
} from "@/lib/api/firewall-flowtables";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FlowtableModal } from "@/components/firewall/FlowtableModal";
import { DeleteFlowtableModal } from "@/components/firewall/DeleteFlowtableModal";

export default function FlowtablesPage() {
  const t = useTranslations("firewallFlowtables");
  const tc = useTranslations("common");
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
      setError(err instanceof Error ? err.message : t("page.loadFailed"));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount; a language switch re-renders via router.refresh()
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("page.title")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("page.subtitle")}
                </p>
              </div>
            </div>
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
                {t("createFlowtable")}
              </Button>
            </div>
          </div>

          {/* Search and Stats */}
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("page.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {t("page.count", {
                count: filteredFlowtables.length,
                n: String(filteredFlowtables.length),
              })}
            </div>
            {capabilities && (
              <div className="ml-auto flex items-center gap-2">
                {capabilities.features.hardware_offload.supported && (
                  <Badge variant="outline" className="gap-1 bg-purple-500/10 text-purple-500 border-purple-500/20">
                    <Cpu className="h-3 w-3" />
                    {t("page.hwOffload")}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <LoadingSpinner message={t("page.loading")} />
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <Card className="border-destructive max-w-md">
                <CardContent className="flex items-center gap-4 py-8">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive">{t("page.errorTitle")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                  <Button onClick={() => fetchConfig(true)} variant="outline">
                    {t("page.tryAgain")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : filteredFlowtables.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Card className="max-w-md">
                <CardContent className="flex flex-col items-center text-center py-12 px-8">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {searchQuery ? t("page.noMatching") : t("page.noConfigured")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-6">
                    {searchQuery
                      ? t("page.adjustSearch")
                      : t("page.emptyDescription")}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("page.createFirst")}
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
                    <TableHead className="w-[200px]">{tc("name")}</TableHead>
                    <TableHead className="w-[300px]">{tc("description")}</TableHead>
                    <TableHead>{t("interfaces")}</TableHead>
                    <TableHead className="w-[150px]">{t("offloadType")}</TableHead>
                    <TableHead className="w-[100px] text-right">{tc("actions")}</TableHead>
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
                          <span className="text-muted-foreground/50 italic">{t("page.noDescription")}</span>
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
                            <span className="text-muted-foreground/50 italic">{t("page.noInterfaces")}</span>
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
                              {tc("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingFlowtable(ft)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {tc("delete")}
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
      <FlowtableModal
        open={createModalOpen || !!editingFlowtable}
        onOpenChange={(open) => {
          if (!open) {
            setCreateModalOpen(false);
            setEditingFlowtable(null);
          }
        }}
        onSuccess={() => fetchConfig(true)}
        existingFlowtables={flowtables}
        existing={editingFlowtable}
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
