"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Server, Power, PowerOff, Loader2, MoreVertical, Pencil, Trash2, MoveRight } from "lucide-react";
import { Instance } from "@/lib/api/session";

interface InstanceCardProps {
  instance: Instance;
  isActive: boolean;
  userRole: string;
  onConnect: (instanceId: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onEdit: (instance: Instance) => void;
  onMove: (instance: Instance) => void;
  onDelete: (instance: Instance) => void;
}

export function InstanceCard({
  instance,
  isActive,
  userRole,
  onConnect,
  onDisconnect,
  onEdit,
  onMove,
  onDelete,
}: InstanceCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = userRole === "OWNER" || userRole === "ADMIN";

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConnect(instance.id);
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await onDisconnect();
    } catch (err: any) {
      setError(err.message || "Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isActive
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-lg p-2 ${
              isActive ? "bg-primary/10" : "bg-muted"
            }`}
          >
            <Server
              className={`h-5 w-5 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{instance.name}</h3>
            <p className="text-sm text-muted-foreground">
              {instance.host}:{instance.port}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          {isActive && (
            <Badge variant="default" className="bg-primary">
              Connected
            </Badge>
          )}
          {!instance.is_active && !isActive && (
            <Badge variant="secondary">Inactive</Badge>
          )}

          {/* Instance Management Dropdown */}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
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
      </div>

      {/* Description */}
      {instance.description && (
        <p className="text-sm text-muted-foreground mb-3">
          {instance.description}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-3 p-2 rounded bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isActive ? (
          <Button
            onClick={handleConnect}
            disabled={loading || !instance.is_active}
            size="sm"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Power className="h-4 w-4 mr-2" />
                Connect
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleDisconnect}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <PowerOff className="h-4 w-4 mr-2" />
                Disconnect
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
