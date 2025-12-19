"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Power, PowerOff, Pencil, Trash2, MoveRight } from "lucide-react";

interface Instance {
  id: string;
  name: string;
  description?: string | null;
  host: string;
  port: number;
  is_active: boolean;
  vyos_version?: string | null;
}

interface InstanceTableViewProps {
  instances: Instance[];
  isActiveInstance: (instanceId: string) => boolean;
  userRole: string;
  onConnect: (instanceId: string) => void;
  onDisconnect: () => void;
  onEdit: (instance: Instance) => void;
  onMove: (instance: Instance) => void;
  onDelete: (instance: Instance) => void;
}

export function InstanceTableView({
  instances,
  isActiveInstance,
  userRole,
  onConnect,
  onDisconnect,
  onEdit,
  onMove,
  onDelete,
}: InstanceTableViewProps) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Port</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No instances found
              </TableCell>
            </TableRow>
          ) : (
            instances.map((instance) => {
              const isConnected = isActiveInstance(instance.id);
              return (
                <TableRow key={instance.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{instance.name}</p>
                      {instance.description && (
                        <p className="text-xs text-muted-foreground">
                          {instance.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{instance.host}</TableCell>
                  <TableCell>{instance.port}</TableCell>
                  <TableCell>
                    {instance.vyos_version && (
                      <Badge variant="outline">{instance.vyos_version}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <>
                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            Connected
                          </span>
                        </>
                      ) : instance.is_active ? (
                        <>
                          <div className="h-2 w-2 rounded-full bg-gray-400" />
                          <span className="text-xs text-muted-foreground">Ready</span>
                        </>
                      ) : (
                        <>
                          <div className="h-2 w-2 rounded-full bg-destructive" />
                          <span className="text-xs text-destructive">Inactive</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Connect/Disconnect Button */}
                      {isConnected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onDisconnect}
                          className="gap-2"
                        >
                          <PowerOff className="h-3 w-3" />
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onConnect(instance.id)}
                          disabled={!instance.is_active}
                          className="gap-2"
                        >
                          <Power className="h-3 w-3" />
                          Connect
                        </Button>
                      )}

                      {/* Actions Dropdown */}
                      {(userRole === "OWNER" || userRole === "ADMIN") && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(instance)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onMove(instance)}>
                              <MoveRight className="h-4 w-4 mr-2" />
                              Move to Site
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(instance)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
