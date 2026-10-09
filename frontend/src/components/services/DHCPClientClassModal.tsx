"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dhcpService,
  type DHCPClientClass,
} from "@/lib/api/dhcp";
import { clientClassOperations, type ClientClassDraft } from "./dhcp-client-class";
import { failedSaveMessage } from "./dhcp-save";

interface DHCPClientClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  classes: DHCPClientClass[];
}

type Draft = ClientClassDraft;

const emptyDraft = (): Draft => ({
  name: "",
  disable: false,
  circuitId: "",
  remoteId: "",
  originalName: null,
});

export function DHCPClientClassModal({
  open,
  onOpenChange,
  onSuccess,
  classes,
}: DHCPClientClassModalProps) {
  const [rows, setRows] = useState<DHCPClientClass[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows(classes);
    setDraft(emptyDraft());
    setError(null);
  }, [open, classes]);

  const saveDraft = async () => {
    const name = draft.name.trim();
    if (!/^[-_a-zA-Z0-9][\w\-.+]*$/.test(name)) {
      setError("Class name may only contain letters, numbers, and . _ - +");
      return;
    }
    setLoading(true);
    setError(null);
    const stored = rows.find((item) => item.name === (draft.originalName ?? name));
    const operations = clientClassOperations(draft, stored);
    try {
      const result = await dhcpService.batchConfigure({
        network_name: "_global",
        operations,
      });
      const saveError = failedSaveMessage(result, "Failed to save client class");
      if (saveError) {
        setError(saveError);
        return;
      }
      onSuccess();
      setDraft(emptyDraft());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save client class");
    } finally {
      setLoading(false);
    }
  };

  const removeClass = async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await dhcpService.batchConfigure({
        network_name: "_global",
        operations: [{ op: "delete_client_class", value: name }],
      });
      const saveError = failedSaveMessage(result, "Failed to delete client class");
      if (saveError) {
        setError(saveError);
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete client class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Client classes</DialogTitle>
          <DialogDescription>
            Match relay-agent information before a subnet or range assigns an address
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No client classes</p>
          )}
          {rows.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-2 rounded border px-3 py-2">
              <button
                type="button"
                className="text-left"
                onClick={() =>
                  setDraft({
                    name: item.name,
                    disable: item.disable,
                    circuitId: item.circuit_id ?? "",
                    remoteId: item.remote_id ?? "",
                    originalName: item.name,
                  })
                }
              >
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.circuit_id && `circuit ${item.circuit_id}`, item.remote_id && `remote ${item.remote_id}`]
                    .filter(Boolean)
                    .join(" · ") || "No relay match"}
                </p>
              </button>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeClass(item.name)} disabled={loading}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="space-y-3 border-t pt-3">
            <div>
              <Label htmlFor="class-name">Class name</Label>
              <Input
                id="class-name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="class-disable"
                checked={draft.disable}
                onCheckedChange={(value) => setDraft({ ...draft, disable: value === true })}
              />
              <Label htmlFor="class-disable">Disable</Label>
            </div>
            <div>
              <Label htmlFor="class-circuit">Relay circuit-id</Label>
              <Input
                id="class-circuit"
                value={draft.circuitId}
                onChange={(event) => setDraft({ ...draft, circuitId: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="class-remote">Relay remote-id</Label>
              <Input
                id="class-remote"
                value={draft.remoteId}
                onChange={(event) => setDraft({ ...draft, remoteId: event.target.value })}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDraft(emptyDraft())} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
          <Button onClick={saveDraft} disabled={loading || !draft.name.trim()}>
            {loading ? "Saving..." : "Save class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
