"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { lbService, WANInterfaceHealth, WANHealthTest } from "@/lib/api/load-balancing";

// ============================================================================
// Form types
// ============================================================================

interface TestForm {
  test_id: string;
  type: string;
  target: string;
}

interface FormState {
  interface: string;
  nexthop: string;
  failure_count: string;
  success_count: string;
  tests: TestForm[];
}

const emptyTest = (id: number): TestForm => ({
  test_id: String(id), type: "ping", target: "",
});

const emptyForm = (): FormState => ({
  interface: "", nexthop: "", failure_count: "", success_count: "",
  tests: [emptyTest(1)],
});

function ifaceToForm(i: WANInterfaceHealth): FormState {
  return {
    interface: i.interface,
    nexthop: i.nexthop ?? "",
    failure_count: i.failure_count ?? "",
    success_count: i.success_count ?? "",
    tests: i.tests.length > 0
      ? i.tests.map((t) => ({ test_id: t.test_id, type: t.type ?? "ping", target: t.target ?? "" }))
      : [emptyTest(1)],
  };
}

function formToIface(f: FormState): WANInterfaceHealth {
  return {
    interface: f.interface.trim(),
    nexthop: f.nexthop || null,
    failure_count: f.failure_count || null,
    success_count: f.success_count || null,
    tests: f.tests
      .filter((t) => t.test_id.trim())
      .map((t): WANHealthTest => ({
        test_id: t.test_id,
        type: t.type || null,
        target: t.target || null,
        resp_time: null, ttl_limit: null, test_script: null,
      })),
  };
}

// ============================================================================
// Props
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  iface?: WANInterfaceHealth | null;
  onSuccess: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function WANInterfaceModal({ open, onOpenChange, iface, onSuccess }: Props) {
  const isEdit = !!iface;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(iface ? ifaceToForm(iface) : emptyForm());
      setError(null);
    }
  }, [open, iface]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setTest = <K extends keyof TestForm>(idx: number, key: K, val: TestForm[K]) =>
    setForm((f) => {
      const tests = [...f.tests];
      tests[idx] = { ...tests[idx], [key]: val };
      return { ...f, tests };
    });

  const addTest = () => {
    const nextId = Math.max(0, ...form.tests.map((t) => parseInt(t.test_id) || 0)) + 1;
    setForm((f) => ({ ...f, tests: [...f.tests, emptyTest(nextId)] }));
  };

  const removeTest = (idx: number) =>
    setForm((f) => ({ ...f, tests: f.tests.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    if (!form.interface.trim()) { setError("Interface name is required"); return; }
    if (!form.nexthop.trim()) { setError("Nexthop address is required"); return; }

    setLoading(true);
    setError(null);
    try {
      const data = formToIface(form);
      if (isEdit && iface) {
        await lbService.updateInterfaceHealth(iface, data);
      } else {
        await lbService.createInterfaceHealth(data);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Interface Health" : "Add Interface Health"}</DialogTitle>
          <DialogDescription>
            Configure health monitoring for a WAN interface and its gateway.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Interface <span className="text-destructive">*</span></Label>
              <Input
                value={form.interface}
                onChange={(e) => set("interface", e.target.value)}
                placeholder="eth0"
                disabled={isEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nexthop (Gateway) <span className="text-destructive">*</span></Label>
              <Input
                value={form.nexthop}
                onChange={(e) => set("nexthop", e.target.value)}
                placeholder="203.0.113.1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Failure Count</Label>
              <Input
                value={form.failure_count}
                onChange={(e) => set("failure_count", e.target.value)}
                placeholder="5"
                type="number"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Success Count</Label>
              <Input
                value={form.success_count}
                onChange={(e) => set("success_count", e.target.value)}
                placeholder="5"
                type="number"
              />
            </div>
          </div>

          <Separator />

          {/* Tests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Health Tests</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTest}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Test
              </Button>
            </div>

            {form.tests.map((test, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Test {test.test_id}</span>
                  {form.tests.length > 1 && (
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeTest(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={test.type}
                      onValueChange={(v) => setTest(idx, "type", v)}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ping">Ping</SelectItem>
                        <SelectItem value="ttl">TTL</SelectItem>
                        <SelectItem value="user-defined">User Defined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {test.type === "user-defined" ? "Script" : "Target"}
                    </Label>
                    <Input
                      className="h-8 text-sm"
                      value={test.target}
                      onChange={(e) => setTest(idx, "target", e.target.value)}
                      placeholder={test.type === "user-defined" ? "/etc/check.sh" : "8.8.8.8"}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
