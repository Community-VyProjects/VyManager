"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Network,
  Shield,
  ArrowRight,
  TableProperties,
  AlertCircle,
} from "lucide-react";
import {
  staticRoutesService,
  type RoutingTable,
  type StaticRoute,
} from "@/lib/api/static-routes";
import { cn } from "@/lib/utils";
import { CreateTableRouteModal } from "./CreateTableRouteModal";
import { EditTableRouteModal } from "./EditTableRouteModal";

interface RoutingTablesAccordionProps {
  tables: RoutingTable[];
  onRefresh: () => void;
}

export function RoutingTablesAccordion({
  tables,
  onRefresh,
}: RoutingTablesAccordionProps) {
  const [editingDescription, setEditingDescription] = useState<number | null>(null);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [deletingRoute, setDeletingRoute] = useState<{ tableId: number; route: StaticRoute } | null>(null);
  const [editingRoute, setEditingRoute] = useState<{ table: RoutingTable; route: StaticRoute } | null>(null);
  const [addingRouteToTable, setAddingRouteToTable] = useState<RoutingTable | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEditDescription = (table: RoutingTable) => {
    setEditingDescription(table.table_id);
    setDescriptionValue(table.description || "");
  };

  const handleSaveDescription = async (tableId: number) => {
    setLoading(`desc-${tableId}`);
    setError(null);
    try {
      await staticRoutesService.updateRoutingTableDescription(tableId, descriptionValue);
      setEditingDescription(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update description");
    } finally {
      setLoading(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingDescription(null);
    setDescriptionValue("");
  };

  const handleDeleteTable = async (tableId: number) => {
    if (!confirm(`Are you sure you want to delete table ${tableId}? This will remove all routes in the table.`)) {
      return;
    }
    setLoading(`delete-table-${tableId}`);
    setError(null);
    try {
      await staticRoutesService.deleteRoutingTable(tableId);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete table");
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteRoute = async (tableId: number, route: StaticRoute) => {
    setLoading(`delete-route-${tableId}-${route.destination}`);
    setError(null);
    try {
      await staticRoutesService.deleteTableRoute(tableId, route.destination, route.route_type);
      setDeletingRoute(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route");
    } finally {
      setLoading(null);
    }
  };

  if (tables.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TableProperties className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Routing Tables
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
            No custom routing tables configured. Create one to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2 mb-4">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => setError(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <Accordion type="multiple" className="space-y-2">
        {tables.map((table) => {
          const totalRoutes = table.ipv4_routes.length + table.ipv6_routes.length;
          const isEditingDesc = editingDescription === table.table_id;

          return (
            <AccordionItem
              key={table.table_id}
              value={`table-${table.table_id}`}
              className="border rounded-lg px-4 bg-card"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-4 flex-1 mr-4">
                  {/* Table ID */}
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <TableProperties className="h-5 w-5 text-primary" />
                    <span className="font-mono font-bold text-xl">{table.table_id}</span>
                  </div>

                  {/* Description */}
                  <div className="flex-1 text-left">
                    {isEditingDesc ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={descriptionValue}
                          onChange={(e) => setDescriptionValue(e.target.value)}
                          placeholder="Enter description..."
                          className="h-8 max-w-xs"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleSaveDescription(table.table_id)}
                          disabled={loading === `desc-${table.table_id}`}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm",
                          table.description ? "text-foreground" : "text-muted-foreground italic"
                        )}>
                          {table.description || "No description"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDescription(table);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Route counts */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      {table.ipv4_routes.length} IPv4
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                      {table.ipv6_routes.length} IPv6
                    </Badge>
                  </div>

                  {/* Delete table button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTable(table.table_id);
                    }}
                    disabled={loading === `delete-table-${table.table_id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  {/* Add Route Button */}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => setAddingRouteToTable(table)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Route
                    </Button>
                  </div>

                  {/* Routes Table */}
                  {totalRoutes === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                      <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No routes in this table</p>
                      <p className="text-xs mt-1">Click "Add Route" to create one</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-12">Type</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Next Hop / Interface</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-20 text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* IPv4 Routes */}
                          {table.ipv4_routes.map((route) => (
                            <RouteRow
                              key={`ipv4-${route.destination}`}
                              route={route}
                              tableId={table.table_id}
                              onEdit={() => setEditingRoute({ table, route })}
                              onDelete={() => handleDeleteRoute(table.table_id, route)}
                              isDeleting={loading === `delete-route-${table.table_id}-${route.destination}`}
                            />
                          ))}
                          {/* IPv6 Routes */}
                          {table.ipv6_routes.map((route) => (
                            <RouteRow
                              key={`ipv6-${route.destination}`}
                              route={route}
                              tableId={table.table_id}
                              onEdit={() => setEditingRoute({ table, route })}
                              onDelete={() => handleDeleteRoute(table.table_id, route)}
                              isDeleting={loading === `delete-route-${table.table_id}-${route.destination}`}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Add Route Modal */}
      <CreateTableRouteModal
        open={addingRouteToTable !== null}
        onOpenChange={(open) => !open && setAddingRouteToTable(null)}
        onSuccess={() => {
          setAddingRouteToTable(null);
          onRefresh();
        }}
        table={addingRouteToTable}
      />

      {/* Edit Route Modal */}
      <EditTableRouteModal
        open={editingRoute !== null}
        onOpenChange={(open) => !open && setEditingRoute(null)}
        onSuccess={() => {
          setEditingRoute(null);
          onRefresh();
        }}
        table={editingRoute?.table ?? null}
        route={editingRoute?.route ?? null}
      />
    </>
  );
}

interface RouteRowProps {
  route: StaticRoute;
  tableId: number;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function RouteRow({ route, tableId, onEdit, onDelete, isDeleting }: RouteRowProps) {
  const isIPv4 = route.route_type === "ipv4";

  return (
    <TableRow className="group">
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            isIPv4
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-purple-500/10 text-purple-600 border-purple-500/20"
          )}
        >
          {isIPv4 ? "v4" : "v6"}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-sm">
        {route.destination}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {route.blackhole && (
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
              <Shield className="h-3 w-3 mr-1" />
              Blackhole
            </Badge>
          )}
          {route.reject && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
              Reject
            </Badge>
          )}
          {route.next_hops.slice(0, 2).map((nh, idx) => (
            <Badge
              key={`nh-${idx}`}
              variant="secondary"
              className={cn(
                "text-xs font-mono",
                nh.disable && "opacity-50 line-through"
              )}
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              {nh.address}
            </Badge>
          ))}
          {route.interfaces.slice(0, 2).map((iface, idx) => (
            <Badge
              key={`iface-${idx}`}
              variant="outline"
              className={cn(
                "text-xs",
                iface.disable && "opacity-50 line-through"
              )}
            >
              {iface.interface}
            </Badge>
          ))}
          {(route.next_hops.length > 2 || route.interfaces.length > 2) && (
            <Badge variant="secondary" className="text-xs">
              +{Math.max(0, route.next_hops.length - 2) + Math.max(0, route.interfaces.length - 2)}
            </Badge>
          )}
          {!route.blackhole && !route.reject && route.next_hops.length === 0 && route.interfaces.length === 0 && (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {route.description || "—"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
