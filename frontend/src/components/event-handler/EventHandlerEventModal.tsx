"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { EventHandlerEntry, EventEnvironmentVar, SaveEventFields } from "@/lib/api/event-handler";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventHandlerEntry | null;
  onSubmit: (name: string, fields: SaveEventFields) => Promise<void>;
}

export function EventHandlerEventModal({ open, onOpenChange, event, onSubmit }: Props) {
  const isEdit = !!event;

  const [name, setName] = useState("");
  const [filterPattern, setFilterPattern] = useState("");
  const [filterSyslogId, setFilterSyslogId] = useState("");
  const [scriptPath, setScriptPath] = useState("");
  const [scriptArguments, setScriptArguments] = useState("");
  const [envVars, setEnvVars] = useState<EventEnvironmentVar[]>([]);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (event) {
        setName(event.name);
        setFilterPattern(event.filter.pattern ?? "");
        setFilterSyslogId(event.filter.syslog_identifier ?? "");
        setScriptPath(event.script.path ?? "");
        setScriptArguments(event.script.arguments ?? "");
        setEnvVars([...event.script.environment]);
      } else {
        setName("");
        setFilterPattern("");
        setFilterSyslogId("");
        setScriptPath("");
        setScriptArguments("");
        setEnvVars([]);
      }
      setNewEnvName("");
      setNewEnvValue("");
      setError(null);
    }
  }, [open, event]);

  const addEnvVar = () => {
    const n = newEnvName.trim();
    const v = newEnvValue;
    if (!n) return;
    if (n.includes(" ")) {
      setError("Environment variable name cannot contain spaces.");
      return;
    }
    if (envVars.some((e) => e.name === n)) {
      setError(`Environment variable "${n}" already exists.`);
      return;
    }
    setEnvVars([...envVars, { name: n, value: v }]);
    setNewEnvName("");
    setNewEnvValue("");
    setError(null);
  };

  const removeEnvVar = (envName: string) => {
    setEnvVars(envVars.filter((e) => e.name !== envName));
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!isEdit && !trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!isEdit && trimmedName.includes(" ")) {
      setError("Name cannot contain spaces.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(isEdit ? event!.name : trimmedName, {
        filter: {
          pattern: filterPattern.trim() || null,
          syslog_identifier: filterSyslogId.trim() || null,
        },
        script: {
          path: scriptPath.trim() || null,
          arguments: scriptArguments.trim() || null,
          environment: envVars,
        },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Event" : "Add Event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="event-name">Name</Label>
          <Input
            id="event-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ssh-login-alert"
            disabled={isEdit}
            className={isEdit ? "bg-muted font-mono" : "font-mono"}
          />
          {isEdit && (
            <p className="text-xs text-muted-foreground">Name cannot be changed after creation.</p>
          )}
        </div>

        <Tabs defaultValue="filter">
          <TabsList className="w-full">
            <TabsTrigger value="filter" className="flex-1">Filter</TabsTrigger>
            <TabsTrigger value="script" className="flex-1">Script</TabsTrigger>
            <TabsTrigger value="environment" className="flex-1">Environment</TabsTrigger>
          </TabsList>

          <TabsContent value="filter">
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="filter-pattern">Pattern</Label>
                  <Input
                    id="filter-pattern"
                    value={filterPattern}
                    onChange={(e) => setFilterPattern(e.target.value)}
                    placeholder="e.g. error.*"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Regex pattern to match log lines</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-syslog-id">Syslog Identifier</Label>
                  <Input
                    id="filter-syslog-id"
                    value={filterSyslogId}
                    onChange={(e) => setFilterSyslogId(e.target.value)}
                    placeholder="e.g. sshd"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Syslog process name to filter by</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="script">
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="script-path">Path</Label>
                  <Input
                    id="script-path"
                    value={scriptPath}
                    onChange={(e) => setScriptPath(e.target.value)}
                    placeholder="/config/scripts/handler.sh"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="script-args">Arguments</Label>
                  <Input
                    id="script-args"
                    value={scriptArguments}
                    onChange={(e) => setScriptArguments(e.target.value)}
                    placeholder="optional arguments passed to script"
                    className="font-mono"
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="environment">
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-4 py-2">
                {envVars.length > 0 && (
                  <div className="space-y-2">
                    {envVars.map((ev) => (
                      <div key={ev.name} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <span className="font-mono font-medium flex-shrink-0">{ev.name}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-mono flex-1 truncate">{ev.value}</span>
                        <button
                          onClick={() => removeEnvVar(ev.name)}
                          className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Add Variable</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newEnvName}
                      onChange={(e) => setNewEnvName(e.target.value)}
                      placeholder="NAME"
                      className="font-mono flex-1"
                      onKeyDown={(e) => e.key === "Enter" && addEnvVar()}
                    />
                    <Input
                      value={newEnvValue}
                      onChange={(e) => setNewEnvValue(e.target.value)}
                      placeholder="value"
                      className="font-mono flex-1"
                      onKeyDown={(e) => e.key === "Enter" && addEnvVar()}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={addEnvVar}
                      disabled={!newEnvName.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving..." : "Adding..."}
              </>
            ) : isEdit ? "Save Changes" : "Add Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
