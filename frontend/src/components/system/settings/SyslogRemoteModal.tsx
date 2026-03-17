"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, X, Server } from "lucide-react";
import {
  systemSettingsService,
  type SyslogFacility,
} from "@/lib/api/system-settings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilities: string[];
  levels: string[];
  onSuccess: () => void;
}

export function SyslogRemoteModal({ open, onOpenChange, facilities, levels, onSuccess }: Props) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [facList, setFacList] = useState<SyslogFacility[]>([]);
  const [facInput, setFacInput] = useState("all");
  const [levelInput, setLevelInput] = useState("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setHost("");
      setPort("");
      setFacList([]);
      setFacInput("all");
      setLevelInput("info");
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const addFacility = () => {
    const exists = facList.some((f) => f.facility === facInput);
    if (!exists) {
      setFacList((prev) => [...prev, { facility: facInput, level: levelInput }]);
    }
  };

  const removeFacility = (fac: string) => {
    setFacList((prev) => prev.filter((f) => f.facility !== fac));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!host.trim()) {
      setError("Host/IP is required.");
      return;
    }
    if (facList.length === 0) {
      setError("At least one facility is required.");
      return;
    }

    setLoading(true);
    try {
      const result = await systemSettingsService.createSyslogRemoteHost(
        host.trim(),
        facList,
        port ? parseInt(port, 10) : null,
      );

      if (!result.success) {
        setError(result.error ?? "Operation failed");
        return;
      }

      handleClose();
      onSuccess();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Add Remote Syslog Host
          </DialogTitle>
          <DialogDescription>
            Forward log messages to a remote syslog server.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono break-words">
                  {error}
                </pre>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="host">Host / IP</Label>
              <Input
                id="host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port (optional)</Label>
              <Input
                id="port"
                type="number"
                min="1"
                max="65535"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="514"
              />
            </div>
          </div>

          {/* Facilities */}
          <div className="space-y-2">
            <Label>Facilities</Label>
            <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 rounded-md border bg-muted/30">
              {facList.map((f) => (
                <Badge key={f.facility} variant="secondary" className="flex items-center gap-1">
                  {f.facility}/{f.level}
                  <button type="button" onClick={() => removeFacility(f.facility)}>
                    <X className="h-3 w-3 ml-1" />
                  </button>
                </Badge>
              ))}
              {facList.length === 0 && (
                <span className="text-xs text-muted-foreground">No facilities added</span>
              )}
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Facility</Label>
                <Select value={facInput} onValueChange={setFacInput}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Level</Label>
                <Select value={levelInput} onValueChange={setLevelInput}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addFacility}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding…" : "Add Host"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
