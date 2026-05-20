"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Network, Shield, ArrowRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type RoutingTable, type StaticRoute } from "@/lib/api/static-routes";
import { cn } from "@/lib/utils";
import { CreateTableRouteModal } from "./CreateTableRouteModal";
import { DeleteTableRouteModal } from "./DeleteTableRouteModal";

interface ViewRoutingTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  table: RoutingTable | null;
}

export function ViewRoutingTableModal({
  open,
  onOpenChange,
  onSuccess,
  table,
}: ViewRoutingTableModalProps) {
  const [selectedTab, setSelectedTab] = useState<"ipv4" | "ipv6">("ipv4");
  const [createRouteModalOpen, setCreateRouteModalOpen] = useState(false);
  const [deletingRoute, setDeletingRoute] = useState<StaticRoute | null>(null);

  if (!table) return null;

  const currentRoutes = selectedTab === "ipv4" ? table.ipv4_routes : table.ipv6_routes;

  const handleRouteCreated = () => {
    setCreateRouteModalOpen(false);
    onSuccess();
  };

  const handleRouteDeleted = () => {
    setDeletingRoute(null);
    onSuccess();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Routing Table {table.table_id}
              {table.description && (
                <span className="text-muted-foreground font-normal text-base">
                  — {table.description}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              View and manage routes in this routing table
            </DialogDescription>
          </DialogHeader>

          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "ipv4" | "ipv6")}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="ipv4">
                  IPv4 Routes
                  {table.ipv4_routes.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{table.ipv4_routes.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="ipv6">
                  IPv6 Routes
                  {table.ipv6_routes.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{table.ipv6_routes.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <Button size="sm" onClick={() => setCreateRouteModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Route
              </Button>
            </div>

            <TabsContent value="ipv4" className="mt-0">
              <RouteTable
                routes={table.ipv4_routes}
                onDelete={setDeletingRoute}
              />
            </TabsContent>

            <TabsContent value="ipv6" className="mt-0">
              <RouteTable
                routes={table.ipv6_routes}
                onDelete={setDeletingRoute}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CreateTableRouteModal
        open={createRouteModalOpen}
        onOpenChange={setCreateRouteModalOpen}
        onSuccess={handleRouteCreated}
        table={table}
      />

      <DeleteTableRouteModal
        open={deletingRoute !== null}
        onOpenChange={(open) => !open && setDeletingRoute(null)}
        onSuccess={handleRouteDeleted}
        tableId={table.table_id}
        route={deletingRoute}
      />
    </>
  );
}

interface RouteTableProps {
  routes: StaticRoute[];
  onDelete: (route: StaticRoute) => void;
}

function RouteTable({ routes, onDelete }: RouteTableProps) {
  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
        <Network className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Routes</h3>
        <p className="text-sm text-muted-foreground">
          No routes configured in this table
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Destination</TableHead>
            <TableHead>Next Hops / Interfaces</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.map((route) => {
            const hasNextHops = route.next_hops.length > 0;
            const hasInterfaces = route.interfaces.length > 0;
            const isBlackhole = route.blackhole;
            const isReject = route.reject;

            return (
              <TableRow key={route.destination} className="group">
                <TableCell className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-muted-foreground" />
                    {route.destination}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {isBlackhole && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                        <Shield className="h-3 w-3 mr-1" />
                        Blackhole
                      </Badge>
                    )}
                    {isReject && (
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                        Reject
                      </Badge>
                    )}
                    {hasNextHops && route.next_hops.slice(0, 5).map((nh, idx) => (
                      <Badge
                        key={`nh-${idx}`}
                        variant="secondary"
                        className={cn(
                          "text-xs font-mono",
                          nh.disable && "bg-orange-500/10 text-orange-500"
                        )}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        {nh.address}
                      </Badge>
                    ))}
                    {hasInterfaces && route.interfaces.slice(0, 5).map((iface, idx) => (
                      <Badge
                        key={`iface-${idx}`}
                        variant="outline"
                        className={cn(
                          "text-xs",
                          iface.disable && "bg-orange-500/10 text-orange-500"
                        )}
                      >
                        {iface.interface}
                      </Badge>
                    ))}
                    {(route.next_hops.length > 5 || route.interfaces.length > 5) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-xs cursor-default">
                              +{Math.max(0, route.next_hops.length - 5) + Math.max(0, route.interfaces.length - 5)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="flex flex-col gap-1 text-xs">
                              {route.next_hops.slice(5).map((nh, idx) => (
                                <span key={`nh-${idx}`} className={cn("font-mono", nh.disable && "opacity-50 line-through")}>
                                  → {nh.address}
                                </span>
                              ))}
                              {route.interfaces.slice(5).map((iface, idx) => (
                                <span key={`iface-${idx}`} className={cn(iface.disable && "opacity-50 line-through")}>
                                  {iface.interface}
                                </span>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {!isBlackhole && !isReject && !hasNextHops && !hasInterfaces && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {route.description || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(route)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
