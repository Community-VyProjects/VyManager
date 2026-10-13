"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Server,
  Building2,
  Eye,
} from "lucide-react";
import { sessionService, Site } from "@/lib/api/session";
import { ViewInstanceAccessModal } from "./ViewInstanceAccessModal";
import { ApiError } from "@/lib/types/api";

interface InstanceWithSite {
  id: string;
  name: string;
  description: string | null;
  host: string;
  port: number;
  vyosVersion: string;
  siteId: string;
  siteName: string;
  isActive: boolean;
}

export function InstancesTab() {
  const t = useTranslations("userManagement");
  const tc = useTranslations("common");
  const [sites, setSites] = useState<Site[]>([]);
  const [instances, setInstances] = useState<InstanceWithSite[]>([]);
  const [filteredInstances, setFilteredInstances] = useState<InstanceWithSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [viewAccessOpen, setViewAccessOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<InstanceWithSite | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount; a language switch re-renders via router.refresh()
  }, []);

  useEffect(() => {
    // Filter instances based on search query
    if (!searchQuery.trim()) {
      setFilteredInstances(instances);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredInstances(
        instances.filter(
          (inst) =>
            inst.name.toLowerCase().includes(query) ||
            inst.siteName.toLowerCase().includes(query) ||
            inst.description?.toLowerCase().includes(query) ||
            inst.host.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, instances]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const sitesData = await sessionService.listSites();
      setSites(sitesData);

      // Load instances for each site
      const allInstances: InstanceWithSite[] = [];
      for (const site of sitesData) {
        try {
          const siteInstances = await sessionService.listInstances(site.id);
          for (const instance of siteInstances) {
            allInstances.push({
              id: instance.id,
              name: instance.name,
              description: instance.description ?? null,
              host: instance.host,
              port: instance.port,
              vyosVersion: instance.vyos_version || t("instances.unknownVersion"),
              siteId: site.id,
              siteName: site.name,
              isActive: instance.is_active,
            });
          }
        } catch (err) {
          console.error(`Failed to load instances for site ${site.name}:`, err);
        }
      }
      setInstances(allInstances);
      setFilteredInstances(allInstances);
    } catch (err) {
      setError((err as ApiError).message || t("instances.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleViewAccess = (instance: InstanceWithSite) => {
    setSelectedInstance(instance);
    setViewAccessOpen(true);
  };

  // Group instances by site for display
  const groupedInstances = filteredInstances.reduce((acc, instance) => {
    if (!acc[instance.siteId]) {
      acc[instance.siteId] = {
        siteName: instance.siteName,
        instances: [],
      };
    }
    acc[instance.siteId].instances.push(instance);
    return acc;
  }, {} as Record<string, { siteName: string; instances: InstanceWithSite[] }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{t("instances.errorTitle")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {tc("retry")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t("instances.overviewTitle")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("instances.summary", { instances: instances.length, sites: sites.length })}
            </p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {tc("refresh")}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("instances.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Instances grouped by site */}
        {filteredInstances.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? t("instances.noMatches") : t("instances.empty")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedInstances).map(([siteId, { siteName, instances }]) => (
              <div key={siteId} className="space-y-2">
                {/* Site header */}
                <div className="flex items-center gap-2 px-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">{siteName}</h4>
                  <span className="text-xs text-muted-foreground">
                    ({t("instances.instanceCount", { count: instances.length })})
                  </span>
                </div>

                {/* Instances table */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("instances.colInstance")}</TableHead>
                        <TableHead>{t("instances.colHost")}</TableHead>
                        <TableHead>{t("instances.colVersion")}</TableHead>
                        <TableHead className="text-center">{tc("status")}</TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {instances.map((instance) => (
                        <TableRow key={instance.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Server className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium text-sm text-foreground">
                                  {instance.name}
                                </div>
                                {instance.description && (
                                  <div className="text-xs text-muted-foreground">
                                    {instance.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground font-mono">
                              {instance.host}:{instance.port}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-xs font-medium">
                              VyOS {instance.vyosVersion}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {instance.isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-600"></div>
                                {t("instances.active")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground"></div>
                                {t("instances.inactive")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewAccess(instance)}
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              {t("instances.viewAccess")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedInstance && (
        <ViewInstanceAccessModal
          open={viewAccessOpen}
          onOpenChange={setViewAccessOpen}
          instance={selectedInstance}
        />
      )}
    </>
  );
}
