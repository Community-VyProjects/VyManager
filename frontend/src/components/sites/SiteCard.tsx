"use client";

import { useState, useEffect } from "react";
import { Building2, ChevronDown, ChevronRight, Loader2, MoreVertical, Pencil, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Site, Instance, sessionService } from "@/lib/api/session";
import { InstanceCard } from "./InstanceCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CreateInstanceModal } from "./CreateInstanceModal";
import { EditInstanceModal } from "./EditInstanceModal";
import { MoveInstanceModal } from "./MoveInstanceModal";
import { DeleteInstanceModal } from "./DeleteInstanceModal";

interface SiteCardProps {
  site: Site;
  allSites: Site[];
  activeInstanceId: string | null;
  onConnect: (instanceId: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onEditSite: (site: Site) => void;
  onDeleteSite: (site: Site) => void;
  onRefresh: () => void;
}

export function SiteCard({
  site,
  allSites,
  activeInstanceId,
  onConnect,
  onDisconnect,
  onEditSite,
  onDeleteSite,
  onRefresh,
}: SiteCardProps) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  // Instance modal states
  const [createInstanceOpen, setCreateInstanceOpen] = useState(false);
  const [editInstanceOpen, setEditInstanceOpen] = useState(false);
  const [deleteInstanceOpen, setDeleteInstanceOpen] = useState(false);
  const [moveInstanceOpen, setMoveInstanceOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);

  useEffect(() => {
    loadInstances();
  }, [site.id]);

  const loadInstances = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionService.listInstances(site.id);
      setInstances(data);
    } catch (err: any) {
      setError(err.message || "Failed to load instances");
    } finally {
      setLoading(false);
    }
  };

  const handleInstanceSuccess = () => {
    loadInstances();
    onRefresh();
  };

  const handleEditInstance = (instance: Instance) => {
    setSelectedInstance(instance);
    setEditInstanceOpen(true);
  };

  const handleDeleteInstance = (instance: Instance) => {
    setSelectedInstance(instance);
    setDeleteInstanceOpen(true);
  };

  const handleMoveInstance = (instance: Instance) => {
    setSelectedInstance(instance);
    setMoveInstanceOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "OWNER":
        return "default";
      case "ADMIN":
        return "secondary";
      case "VIEWER":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Site Header */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <CollapsibleTrigger className="flex items-center gap-3 flex-1">
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-foreground">
                {site.name}
              </h2>
              {site.description && (
                <p className="text-sm text-muted-foreground">
                  {site.description}
                </p>
              )}
            </div>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2">
            <Badge variant={getRoleBadgeVariant(site.role)}>
              {site.role}
            </Badge>
            {instances.length > 0 && (
              <Badge variant="outline">
                {instances.length} {instances.length === 1 ? "instance" : "instances"}
              </Badge>
            )}

            {/* Site Management Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateInstanceOpen(true);
                  }}
                  disabled={site.role !== "OWNER" && site.role !== "ADMIN"}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Instance
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditSite(site);
                  }}
                  disabled={site.role !== "OWNER" && site.role !== "ADMIN"}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Site
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSite(site);
                  }}
                  disabled={site.role !== "OWNER"}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Site
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Instances List */}
        <CollapsibleContent>
          <div className="border-t border-border p-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {!loading && !error && instances.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No instances configured for this site.
                </p>
              </div>
            )}

            {!loading && !error && instances.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {instances.map((instance) => (
                  <InstanceCard
                    key={instance.id}
                    instance={instance}
                    isActive={activeInstanceId === instance.id}
                    userRole={site.role}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                    onEdit={handleEditInstance}
                    onMove={handleMoveInstance}
                    onDelete={handleDeleteInstance}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Instance Modals */}
      <CreateInstanceModal
        open={createInstanceOpen}
        onOpenChange={setCreateInstanceOpen}
        onSuccess={handleInstanceSuccess}
        site={site}
      />
      <EditInstanceModal
        open={editInstanceOpen}
        onOpenChange={setEditInstanceOpen}
        onSuccess={handleInstanceSuccess}
        instance={selectedInstance}
        sites={allSites}
      />
      <MoveInstanceModal
        open={moveInstanceOpen}
        onOpenChange={setMoveInstanceOpen}
        onSuccess={handleInstanceSuccess}
        instance={selectedInstance}
        currentSite={site}
        allSites={allSites}
      />
      <DeleteInstanceModal
        open={deleteInstanceOpen}
        onOpenChange={setDeleteInstanceOpen}
        onSuccess={handleInstanceSuccess}
        instance={selectedInstance}
        userRole={site.role}
      />
    </div>
  );
}
