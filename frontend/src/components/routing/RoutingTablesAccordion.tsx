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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Network, Shield, ArrowRight, TableProperties } from "lucide-react";
import type { RoutingTable, StaticRoute } from "@/lib/api/static-routes";
import type { RouteFamily, StaticRouteFeatures } from "@/lib/api/static-routes-save-ops";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { StaticRouteModal } from "./StaticRouteModal";
import { DeleteStaticRouteModal } from "./DeleteStaticRouteModal";
import { RoutingTableModal } from "./RoutingTableModal";
import { DeleteRoutingTableModal } from "./DeleteRoutingTableModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RoutingTablesAccordionProps {
  tables: RoutingTable[];
  features: StaticRouteFeatures;
  onRefresh: () => void;
}

type RouteEdit = { tableId: number; family: RouteFamily; route: StaticRoute | null };

export function RoutingTablesAccordion({ tables, features, onRefresh }: RoutingTablesAccordionProps) {
  const t = useTranslations("routingExtras");
  const tc = useTranslations("common");
  const [routeEdit, setRouteEdit] = useState<RouteEdit | null>(null);
  const [routeDelete, setRouteDelete] = useState<{ tableId: number; route: StaticRoute } | null>(null);
  const [tableEdit, setTableEdit] = useState<RoutingTable | null>(null);
  const [tableDelete, setTableDelete] = useState<RoutingTable | null>(null);

  if (tables.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TableProperties className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t("accordion.emptyTitle")}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
            {t("accordion.emptyDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const editTable = tables.find((table) => table.table_id === routeEdit?.tableId);
  const configured = editTable
    ? (routeEdit?.family === "ipv6" ? editTable.ipv6_routes : editTable.ipv4_routes).map((r) => r.destination)
    : [];

  return (
    <>
      <Accordion type="multiple" className="space-y-2">
        {tables.map((table) => {
          const totalRoutes = table.ipv4_routes.length + table.ipv6_routes.length;
          const routes = [...table.ipv4_routes, ...table.ipv6_routes];

          return (
            <AccordionItem
              key={table.table_id}
              value={`table-${table.table_id}`}
              className="border rounded-lg px-4 bg-card"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-4 flex-1 mr-4">
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <TableProperties className="h-5 w-5 text-primary" />
                    <span className="font-mono font-bold text-xl">{table.table_id}</span>
                  </div>

                  <div className="flex-1 text-left">
                    <span className={cn(
                      "text-sm",
                      table.description ? "text-foreground" : "text-muted-foreground italic"
                    )}>
                      {table.description || t("accordion.noDescription")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      {t("accordion.ipv4Count", { count: table.ipv4_routes.length })}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                      {t("accordion.ipv6Count", { count: table.ipv6_routes.length })}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={tc("edit")}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTableEdit(table);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            setTableEdit(table);
                          }
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={tc("delete")}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTableDelete(table);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            setTableDelete(table);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </span>
                    </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-4">
                <div className="space-y-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRouteEdit({ tableId: table.table_id, family: "ipv4", route: null })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("accordion.addIpv4Route")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRouteEdit({ tableId: table.table_id, family: "ipv6", route: null })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("accordion.addIpv6Route")}
                      </Button>
                    </div>

                  {totalRoutes === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                      <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t("accordion.noRoutes")}</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-12">{t("accordion.type")}</TableHead>
                            <TableHead>{t("accordion.destination")}</TableHead>
                            <TableHead>{t("accordion.nextHopInterface")}</TableHead>
                            <TableHead>{tc("description")}</TableHead>
                            <TableHead className="w-20 text-right">{t("accordion.action")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {routes.map((route) => (
                            <RouteRow
                              key={`${route.route_type}-${route.destination}`}
                              route={route}
                              onEdit={() =>
                                setRouteEdit({ tableId: table.table_id, family: route.route_type, route })
                              }
                              onDelete={() => setRouteDelete({ tableId: table.table_id, route })}
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

      <StaticRouteModal
        open={routeEdit !== null}
        onOpenChange={(open) => {
          if (!open) setRouteEdit(null);
        }}
        onSuccess={onRefresh}
        scope={{ kind: "table", tableId: routeEdit?.tableId ?? 0 }}
        family={routeEdit?.family ?? "ipv4"}
        existing={routeEdit?.route ?? null}
        features={features}
        configured={configured}
      />

      <DeleteStaticRouteModal
        open={routeDelete !== null}
        onOpenChange={(open) => {
          if (!open) setRouteDelete(null);
        }}
        onSuccess={onRefresh}
        scope={{ kind: "table", tableId: routeDelete?.tableId ?? 0 }}
        route={routeDelete?.route ?? null}
      />

      <RoutingTableModal
        open={tableEdit !== null}
        onOpenChange={(open) => {
          if (!open) setTableEdit(null);
        }}
        onSuccess={onRefresh}
        existing={tableEdit}
        configured={tables.map((table) => table.table_id)}
      />

      <DeleteRoutingTableModal
        open={tableDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTableDelete(null);
        }}
        onSuccess={onRefresh}
        table={tableDelete}
      />
    </>
  );
}

interface RouteRowProps {
  route: StaticRoute;
  onEdit: () => void;
  onDelete: () => void;
}

function RouteRow({ route, onEdit, onDelete }: RouteRowProps) {
  const t = useTranslations("routingExtras");
  const tc = useTranslations("common");
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
          {isIPv4 ? t("accordion.v4") : t("accordion.v6")}
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
              {t("shared.blackhole")}
            </Badge>
          )}
          {route.reject && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
              {t("shared.reject")}
            </Badge>
          )}
          {route.next_hops.slice(0, 5).map((nh) => (
            <Badge
              key={`nh-${nh.address}`}
              variant="secondary"
              className={cn("text-xs font-mono", nh.disable && "opacity-50 line-through")}
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              {nh.address}
            </Badge>
          ))}
          {route.interfaces.slice(0, 5).map((iface) => (
            <Badge
              key={`iface-${iface.interface}`}
              variant="outline"
              className={cn("text-xs", iface.disable && "opacity-50 line-through")}
            >
              {iface.interface}
            </Badge>
          ))}
          {route.dhcp_interfaces.map((iface) => (
            <Badge key={`dhcp-${iface}`} variant="outline" className="text-xs">
              {t("accordion.dhcpInterface", { name: iface })}
            </Badge>
          ))}
          {(route.next_hops.length > 5 || route.interfaces.length > 5) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs cursor-default">
                    {t("accordion.more", {
                      count: Math.max(0, route.next_hops.length - 5) + Math.max(0, route.interfaces.length - 5),
                    })}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col gap-1 text-xs">
                    {route.next_hops.slice(5).map((nh) => (
                      <span key={`nh-${nh.address}`} className={cn("font-mono", nh.disable && "opacity-50 line-through")}>
                        {nh.address}
                      </span>
                    ))}
                    {route.interfaces.slice(5).map((iface) => (
                      <span key={`iface-${iface.interface}`} className={cn(iface.disable && "opacity-50 line-through")}>
                        {iface.interface}
                      </span>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {route.description || "—"}
      </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={tc("edit")} onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={tc("delete")} onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
    </TableRow>
  );
}
