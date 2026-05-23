"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Plus, Pencil, Trash2, Loader2, Zap } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  eventHandlerService,
  EventHandlerConfig,
  EventHandlerEntry,
} from "@/lib/api/event-handler";
import { EventHandlerEventModal } from "./EventHandlerEventModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export function EventHandlerContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.EVENT_HANDLER);

  const [config, setConfig] = useState<EventHandlerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventHandlerEntry | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventHandlerService.getConfig(refresh);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event handler configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const withAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setError(null);
    try {
      await fn();
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>Retry</Button>
      </div>
    );
  }

  const events = config?.events ?? [];
  const isConfigured = events.length > 0;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">Event Handler</h1>
                  {!hasWritePermission && <Badge variant="secondary">Read Only</Badge>}
                  <Badge
                    variant={isConfigured ? "default" : "secondary"}
                    className={isConfigured ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}
                  >
                    {isConfigured ? "Configured" : "Unconfigured"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  systemd-journal event triggers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasWritePermission && (
                <Button
                  size="sm"
                  onClick={() => { setEditingEvent(null); setEventModalOpen(true); }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}
        </div>

        {/* Events table */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          {events.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-2">No event handlers configured</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Add an event to trigger scripts on matching log entries.
                </p>
                {hasWritePermission && (
                  <Button
                    size="sm"
                    onClick={() => { setEditingEvent(null); setEventModalOpen(true); }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Filter Pattern</TableHead>
                      <TableHead>Syslog ID</TableHead>
                      <TableHead>Script Path</TableHead>
                      <TableHead>Env Vars</TableHead>
                      {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((ev) => (
                      <TableRow key={ev.name}>
                        <TableCell className="font-mono font-medium">{ev.name}</TableCell>
                        <TableCell>
                          {ev.filter.pattern ? (
                            <Badge variant="secondary" className="font-mono text-xs">{ev.filter.pattern}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {ev.filter.syslog_identifier ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="font-mono max-w-[200px] truncate">
                          {ev.script.path ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {ev.script.environment.length > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              {ev.script.environment.length} var{ev.script.environment.length !== 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {hasWritePermission && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => { setEditingEvent(ev); setEventModalOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletingEvent(ev.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>

      {/* Event modal */}
      <EventHandlerEventModal
        open={eventModalOpen}
        onOpenChange={(open) => { setEventModalOpen(open); if (!open) setEditingEvent(null); }}
        event={editingEvent}
        onSubmit={async (name, fields) => {
          await eventHandlerService.saveEvent(name, fields);
          await loadData(true);
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingEvent} onOpenChange={(open) => { if (!open) setDeletingEvent(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event Handler</AlertDialogTitle>
            <AlertDialogDescription>
              Remove event handler <span className="font-mono">{deletingEvent}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                withAction(async () => {
                  await eventHandlerService.deleteEvent(deletingEvent!);
                  setDeletingEvent(null);
                })
              }
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
