"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import { ntpService, NTPServer, NTPServerUpdate } from "@/lib/api/ntp";

interface NTPServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: NTPServer | null;
  existingNames: string[];
  onSuccess: () => void;
}

export function NTPServerModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  onSuccess,
}: NTPServerModalProps) {
  const isEdit = existing !== null;

  const [name, setName] = useState(existing?.name ?? "");
  const [pool, setPool] = useState(existing?.pool ?? false);
  const [prefer, setPrefer] = useState(existing?.prefer ?? false);
  const [nts, setNts] = useState(existing?.nts ?? false);
  const [noselect, setNoselect] = useState(existing?.noselect ?? false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return "Server hostname or IP address is required";
    if (!isEdit && existingNames.includes(trimmed)) {
      return `Server "${trimmed}" is already configured`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const update: NTPServerUpdate = {
      name: name.trim(),
      pool,
      prefer,
      nts,
      noselect,
    };

    setSubmitting(true);
    setError(null);
    try {
      await ntpService.setServer(existing, update);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit NTP Server" : "Add NTP Server"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update flags for this NTP server"
              : "Add an upstream NTP server to synchronise time from"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-1">
            {/* Server name */}
            <div className="space-y-1.5">
              <Label htmlFor="server-name">Server</Label>
              <Input
                id="server-name"
                placeholder="e.g. pool.ntp.org or 203.0.113.1"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isEdit}
                className={isEdit ? "font-mono bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Hostname, IPv4, or IPv6 address of the NTP server
              </p>
            </div>

            <Separator />

            {/* Flags */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Server Options</Label>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="flag-pool"
                    checked={pool}
                    onCheckedChange={(checked) => setPool(!!checked)}
                  />
                  <Label htmlFor="flag-pool" className="cursor-pointer leading-tight">
                    <span className="font-medium">Pool</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Treat as an NTP pool — resolves to multiple servers behind one hostname
                    </span>
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="flag-prefer"
                    checked={prefer}
                    onCheckedChange={(checked) => setPrefer(!!checked)}
                  />
                  <Label htmlFor="flag-prefer" className="cursor-pointer leading-tight">
                    <span className="font-medium">Prefer</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Mark as the preferred time source; used first when available
                    </span>
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="flag-nts"
                    checked={nts}
                    onCheckedChange={(checked) => setNts(!!checked)}
                  />
                  <Label htmlFor="flag-nts" className="cursor-pointer leading-tight">
                    <span className="font-medium">NTS</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Enable Network Time Security — authenticates time data cryptographically
                    </span>
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="flag-noselect"
                    checked={noselect}
                    onCheckedChange={(checked) => setNoselect(!!checked)}
                  />
                  <Label htmlFor="flag-noselect" className="cursor-pointer leading-tight">
                    <span className="font-medium">No Select</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Monitor only — server is queried but never used for synchronisation
                    </span>
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Save" : "Add Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
