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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MapPin, Plus, X } from "lucide-react";
import { systemSettingsService } from "@/lib/api/system-settings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function HostMappingModal({ open, onOpenChange, onSuccess }: Props) {
  const [hostname, setHostname] = useState("");
  const [inetList, setInetList] = useState<string[]>([]);
  const [inetInput, setInetInput] = useState("");
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setHostname("");
      setInetList([]);
      setInetInput("");
      setAliases([]);
      setAliasInput("");
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const addInet = () => {
    const ip = inetInput.trim();
    if (ip && !inetList.includes(ip)) {
      setInetList((prev) => [...prev, ip]);
    }
    setInetInput("");
  };

  const removeInet = (ip: string) => {
    setInetList((prev) => prev.filter((i) => i !== ip));
  };

  const addAlias = () => {
    const a = aliasInput.trim();
    if (a && !aliases.includes(a)) {
      setAliases((prev) => [...prev, a]);
    }
    setAliasInput("");
  };

  const removeAlias = (alias: string) => {
    setAliases((prev) => prev.filter((a) => a !== alias));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hostname.trim()) {
      setError("Hostname is required.");
      return;
    }
    if (inetList.length === 0) {
      setError("At least one IP address is required.");
      return;
    }

    setLoading(true);
    try {
      const result = await systemSettingsService.createStaticHost(
        hostname.trim(),
        inetList,
        aliases,
      );

      if (!result.success) {
        setError(result.error ?? "Failed to create host mapping");
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Add Static Host Mapping
          </DialogTitle>
          <DialogDescription>
            Map a hostname to a static IP address.
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

          <div className="space-y-2">
            <Label htmlFor="hostname">Hostname</Label>
            <Input
              id="hostname"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="myserver.local"
            />
          </div>

          <div className="space-y-2">
            <Label>IP Address(es)</Label>
            <div className="flex gap-2">
              <Input
                value={inetInput}
                onChange={(e) => setInetInput(e.target.value)}
                placeholder="192.168.1.100"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInet();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addInet}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {inetList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {inetList.map((ip) => (
                  <Badge key={ip} variant="secondary" className="flex items-center gap-1 font-mono">
                    {ip}
                    <button type="button" onClick={() => removeInet(ip)}>
                      <X className="h-3 w-3 ml-1" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Aliases */}
          <div className="space-y-2">
            <Label>Aliases (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="myserver"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAlias();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addAlias}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {aliases.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {aliases.map((a) => (
                  <Badge key={a} variant="secondary" className="flex items-center gap-1">
                    {a}
                    <button type="button" onClick={() => removeAlias(a)}>
                      <X className="h-3 w-3 ml-1" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding…" : "Add Mapping"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
