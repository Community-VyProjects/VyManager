"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import {
  lbService, LBServiceRule, LBBackendRule, LBCapabilities,
} from "@/lib/api/load-balancing";

// ============================================================================
// Shared form type (covers both service and backend rules)
// ============================================================================

interface RuleForm {
  rule_id: string;
  domain_names: string[];
  wildcard_domains: string[];
  ssl: string;
  url_path_begin: string[];
  url_path_end: string[];
  url_path_exact: string[];
  set_action: "" | "backend" | "server" | "redirect";
  set_value: string;  // backend name, server name, or redirect URL
  new_domain: string;
  new_wildcard: string;
  new_url_begin: string;
  new_url_end: string;
  new_url_exact: string;
}

const emptyForm = (): RuleForm => ({
  rule_id: "", domain_names: [], wildcard_domains: [], ssl: "",
  url_path_begin: [], url_path_end: [], url_path_exact: [],
  set_action: "", set_value: "",
  new_domain: "", new_wildcard: "",
  new_url_begin: "", new_url_end: "", new_url_exact: "",
});

function serviceRuleToForm(r: LBServiceRule): RuleForm {
  return {
    rule_id: r.rule_id,
    domain_names: [...r.domain_name],
    wildcard_domains: [...r.wildcard_domain],
    ssl: r.ssl ?? "",
    url_path_begin: [...r.url_path.begin],
    url_path_end: [...r.url_path.end],
    url_path_exact: [...r.url_path.exact],
    set_action: r.set.backend ? "backend" : r.set.redirect_location ? "redirect" : "",
    set_value: r.set.backend ?? r.set.redirect_location ?? "",
    new_domain: "", new_wildcard: "",
    new_url_begin: "", new_url_end: "", new_url_exact: "",
  };
}

function backendRuleToForm(r: LBBackendRule): RuleForm {
  return {
    rule_id: r.rule_id,
    domain_names: [...r.domain_name],
    wildcard_domains: [...r.wildcard_domain],
    ssl: r.ssl ?? "",
    url_path_begin: [...r.url_path.begin],
    url_path_end: [...r.url_path.end],
    url_path_exact: [...r.url_path.exact],
    set_action: r.set.server ? "server" : r.set.redirect_location ? "redirect" : "",
    set_value: r.set.server ?? r.set.redirect_location ?? "",
    new_domain: "", new_wildcard: "",
    new_url_begin: "", new_url_end: "", new_url_exact: "",
  };
}

function formToServiceRule(f: RuleForm): LBServiceRule {
  return {
    rule_id: f.rule_id,
    domain_name: [...f.domain_names],
    wildcard_domain: [...f.wildcard_domains],
    ssl: f.ssl || null,
    url_path: { begin: [...f.url_path_begin], end: [...f.url_path_end], exact: [...f.url_path_exact] },
    set: {
      backend: f.set_action === "backend" ? f.set_value || null : null,
      redirect_location: f.set_action === "redirect" ? f.set_value || null : null,
    },
  };
}

function formToBackendRule(f: RuleForm): LBBackendRule {
  return {
    rule_id: f.rule_id,
    domain_name: [...f.domain_names],
    wildcard_domain: [...f.wildcard_domains],
    ssl: f.ssl || null,
    url_path: { begin: [...f.url_path_begin], end: [...f.url_path_end], exact: [...f.url_path_exact] },
    set: {
      server: f.set_action === "server" ? f.set_value || null : null,
      redirect_location: f.set_action === "redirect" ? f.set_value || null : null,
    },
  };
}

// ============================================================================
// Props
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** "service" for service rules (set backend), "backend" for backend rules (set server) */
  type: "service" | "backend";
  entityName: string;
  /** The rule being edited, or null/undefined for add mode */
  rule?: LBServiceRule | LBBackendRule | null;
  /** Available backend names (for service) or server names (for backend) to populate action dropdown */
  entityOptions: string[];
  capabilities: LBCapabilities | null;
  /** Auto-assigned rule ID for new rules (ignored in edit mode) */
  nextRuleId: number;
  onSuccess: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function HAProxyRuleModal({
  open, onOpenChange, type, entityName, rule, entityOptions, capabilities, nextRuleId, onSuccess,
}: Props) {
  const isEdit = !!rule;
  const isV15 = capabilities?.features.backend_rule_wildcard_domain.supported ?? false;

  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (rule) {
        setForm(type === "service"
          ? serviceRuleToForm(rule as LBServiceRule)
          : backendRuleToForm(rule as LBBackendRule)
        );
      } else {
        setForm({ ...emptyForm(), rule_id: String(nextRuleId) });
      }
      setError(null);
    }
  }, [open, rule, type, nextRuleId]);

  const set = <K extends keyof RuleForm>(key: K, val: RuleForm[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  // ---- Array field helpers ----
  const addItem = (
    field: "domain_names" | "wildcard_domains" | "url_path_begin" | "url_path_end" | "url_path_exact",
    tempKey: "new_domain" | "new_wildcard" | "new_url_begin" | "new_url_end" | "new_url_exact",
  ) => {
    const val = form[tempKey].trim();
    if (!val || (form[field] as string[]).includes(val)) return;
    setForm((f) => ({
      ...f,
      [field]: [...(f[field] as string[]), val],
      [tempKey]: "",
    }));
  };

  const removeItem = (
    field: "domain_names" | "wildcard_domains" | "url_path_begin" | "url_path_end" | "url_path_exact",
    val: string,
  ) =>
    setForm((f) => ({ ...f, [field]: (f[field] as string[]).filter((v) => v !== val) }));

  // ---- Submit ----
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (type === "service") {
        const newRule = formToServiceRule(form);
        if (isEdit) {
          await lbService.updateServiceRule(entityName, rule as LBServiceRule, newRule);
        } else {
          await lbService.addServiceRule(entityName, newRule);
        }
      } else {
        const newRule = formToBackendRule(form);
        if (isEdit) {
          await lbService.updateBackendRule(entityName, rule as LBBackendRule, newRule);
        } else {
          await lbService.addBackendRule(entityName, newRule);
        }
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const actionLabel = type === "service" ? "Route to backend" : "Route to server";
  const actionPlaceholder = type === "service" ? "backend name" : "server name";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Rule ${rule?.rule_id}` : "Add Routing Rule"}</DialogTitle>
          <DialogDescription>
            Define match conditions and the action to take when they are met.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Match Conditions */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Match Conditions</p>

            {/* Domain Names */}
            <div className="space-y-1.5">
              <Label className="text-sm">Domain Names</Label>
              <div className="flex gap-2">
                <Input
                  value={form.new_domain}
                  onChange={(e) => set("new_domain", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem("domain_names", "new_domain"))}
                  placeholder="example.com"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addItem("domain_names", "new_domain")}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {form.domain_names.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.domain_names.map((d) => (
                    <Badge key={d} variant="secondary" className="gap-1 pr-1">
                      {d}
                      <button onClick={() => removeItem("domain_names", d)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Wildcard Domains (v1.5+) */}
            {isV15 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Wildcard Domains</Label>
                  <Badge variant="outline" className="text-xs">VyOS 1.5+</Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={form.new_wildcard}
                    onChange={(e) => set("new_wildcard", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem("wildcard_domains", "new_wildcard"))}
                    placeholder="example.com  (matches *.example.com)"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem("wildcard_domains", "new_wildcard")}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {form.wildcard_domains.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.wildcard_domains.map((d) => (
                      <Badge key={d} variant="secondary" className="gap-1 pr-1">
                        *.{d}
                        <button onClick={() => removeItem("wildcard_domains", d)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SSL Match */}
            <div className="space-y-1.5">
              <Label className="text-sm">SSL Match</Label>
              <Select
                value={form.ssl || "_none"}
                onValueChange={(v) => set("ssl", v === "_none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  <SelectItem value="hello">hello — match on TLS SNI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL Path */}
            <div className="space-y-3">
              <Label className="text-sm">URL Path</Label>
              {(
                [
                  { kind: "begin", tempKey: "new_url_begin", field: "url_path_begin", label: "Begins with", placeholder: "/api" },
                  { kind: "end",   tempKey: "new_url_end",   field: "url_path_end",   label: "Ends with",   placeholder: ".php" },
                  { kind: "exact", tempKey: "new_url_exact", field: "url_path_exact", label: "Exact match", placeholder: "/login" },
                ] as const
              ).map(({ tempKey, field, label, placeholder }) => (
                <div key={field} className="space-y-1">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <div className="flex gap-2">
                    <Input
                      value={form[tempKey]}
                      onChange={(e) => set(tempKey, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem(field, tempKey))}
                      placeholder={placeholder}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem(field, tempKey)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {(form[field] as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(form[field] as string[]).map((p) => (
                        <Badge key={p} variant="secondary" className="gap-1 pr-1">
                          {p}
                          <button onClick={() => removeItem(field, p)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Action */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</p>
            <Select
              value={form.set_action || "_none"}
              onValueChange={(v) => setForm((f) => ({
                ...f,
                set_action: v === "_none" ? "" : v as RuleForm["set_action"],
                set_value: "",
              }))}
            >
              <SelectTrigger><SelectValue placeholder="No action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No action</SelectItem>
                <SelectItem value={type === "service" ? "backend" : "server"}>{actionLabel}</SelectItem>
                <SelectItem value="redirect">Redirect to URL</SelectItem>
              </SelectContent>
            </Select>

            {(form.set_action === "backend" || form.set_action === "server") && (
              entityOptions.length > 0 ? (
                <Select
                  value={form.set_value || "_none"}
                  onValueChange={(v) => set("set_value", v === "_none" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder={`Select ${actionPlaceholder}`} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select {actionPlaceholder}…</SelectItem>
                    {entityOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.set_value}
                  onChange={(e) => set("set_value", e.target.value)}
                  placeholder={actionPlaceholder}
                />
              )
            )}

            {form.set_action === "redirect" && (
              <Input
                value={form.set_value}
                onChange={(e) => set("set_value", e.target.value)}
                placeholder="https://new-location.example.com"
              />
            )}
          </div>
        </div>

        {error && (
          <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Rule" : "Add Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
