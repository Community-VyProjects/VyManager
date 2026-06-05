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
import { AlertCircle, Loader2 } from "lucide-react";
import {
  tftpServerService,
  TFTPServerConfig,
  TFTPServerCapabilities,
  TFTPServerGeneralUpdate,
} from "@/lib/api/tftp-server";

interface TFTPServerGeneralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TFTPServerConfig;
  capabilities: TFTPServerCapabilities;
  onSuccess: () => void;
}

export function TFTPServerGeneralModal({
  open,
  onOpenChange,
  config,
  capabilities,
  onSuccess,
}: TFTPServerGeneralModalProps) {
  const [directory, setDirectory] = useState(config.directory ?? "");
  const [allowUpload, setAllowUpload] = useState(config.allow_upload);
  const [port, setPort] = useState(config.port ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!directory.trim()) {
      setError("A directory is required for the TFTP server to start");
      return;
    }
    setSubmitting(true);
    setError(null);
    const update: TFTPServerGeneralUpdate = {
      original: config,
      directory,
      allowUpload,
      port,
    };
    try {
      await tftpServerService.updateGeneral(update);
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
          <DialogTitle>TFTP Server Settings</DialogTitle>
          <DialogDescription>
            Configure the served directory, listening port, and upload behaviour
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="tftp-directory">Directory</Label>
            <p className="text-xs text-muted-foreground">
              Folder containing files served by TFTP. Required for the service to run.
            </p>
            <Input
              id="tftp-directory"
              placeholder="e.g. /config/tftpboot"
              value={directory}
              onChange={(e) => {
                setDirectory(e.target.value);
                setError(null);
              }}
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tftp-port">Port</Label>
            <p className="text-xs text-muted-foreground">
              UDP port to listen on. Leave empty for the default ({capabilities.features.port.default}).
            </p>
            <Input
              id="tftp-port"
              type="number"
              min={1}
              max={65535}
              placeholder={`Default (${capabilities.features.port.default})`}
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <Checkbox
              id="tftp-allow-upload"
              checked={allowUpload}
              onCheckedChange={(c) => setAllowUpload(!!c)}
            />
            <Label htmlFor="tftp-allow-upload" className="cursor-pointer leading-tight">
              <span className="font-medium">Allow uploads</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Permit clients to write files to the server (otherwise read-only)
              </span>
            </Label>
          </div>
        </div>

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
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
