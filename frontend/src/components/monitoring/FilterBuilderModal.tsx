"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Ban, Globe, Plus, Search, SlidersHorizontal, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type AttributeKey =
  | "protocol"
  | "src_host"
  | "dst_host"
  | "host"
  | "src_port"
  | "dst_port"
  | "port";

type Connector = "AND" | "OR";

interface Condition {
  id: number;
  connector: Connector;
  attribute: AttributeKey;
  operator: string;
  value: string;
}

interface AttributeDef {
  type: "select" | "ip" | "port";
  operators: string[];
  placeholder?: string;
  /** For IP attributes: [host example, network example], shown as "<host> or <network>". */
  examples?: [string, string];
}

// Operator values are used by buildBPF; only their labels are translated.
const OPERATOR_KEYS: Record<string, "is" | "isNot" | "inNetwork" | "equals" | "doesNotEqual"> = {
  "is": "is",
  "is not": "isNot",
  "in network": "inNetwork",
  "equals": "equals",
  "does not equal": "doesNotEqual",
};

// ── Attribute definitions ──────────────────────────────────────────────────────

const ATTRIBUTES: Record<AttributeKey, AttributeDef> = {
  protocol: {
    type: "select",
    operators: ["is", "is not"],
  },
  src_host: {
    type: "ip",
    operators: ["is", "is not", "in network"],
    examples: ["10.0.0.1", "10.0.0.0/24"],
  },
  dst_host: {
    type: "ip",
    operators: ["is", "is not", "in network"],
    examples: ["8.8.8.8", "0.0.0.0/0"],
  },
  host: {
    type: "ip",
    operators: ["is", "is not", "in network"],
    examples: ["10.0.0.1", "10.0.0.0/24"],
  },
  src_port: {
    type: "port",
    operators: ["equals", "does not equal"],
    placeholder: "443",
  },
  dst_port: {
    type: "port",
    operators: ["equals", "does not equal"],
    placeholder: "80",
  },
  port: {
    type: "port",
    operators: ["equals", "does not equal"],
    placeholder: "53",
  },
};

const PROTOCOLS = ["tcp", "udp", "icmp", "icmp6", "arp"];

// ── BPF builder ────────────────────────────────────────────────────────────────

function buildBPF(conditions: Condition[]): string {
  const valid = conditions.filter((c) => c.value.trim() !== "");
  if (valid.length === 0) return "";

  return valid
    .map((cond, i) => {
      const v = cond.value.trim();
      let expr = "";

      switch (cond.attribute) {
        case "protocol":
          expr = cond.operator === "is not" ? `not ${v}` : v;
          break;
        case "src_host":
          if (cond.operator === "in network") expr = `src net ${v}`;
          else if (cond.operator === "is not") expr = `not src host ${v}`;
          else expr = `src host ${v}`;
          break;
        case "dst_host":
          if (cond.operator === "in network") expr = `dst net ${v}`;
          else if (cond.operator === "is not") expr = `not dst host ${v}`;
          else expr = `dst host ${v}`;
          break;
        case "host":
          if (cond.operator === "in network") expr = `net ${v}`;
          else if (cond.operator === "is not") expr = `not host ${v}`;
          else expr = `host ${v}`;
          break;
        case "src_port":
          expr =
            cond.operator === "does not equal"
              ? `not src port ${v}`
              : `src port ${v}`;
          break;
        case "dst_port":
          expr =
            cond.operator === "does not equal"
              ? `not dst port ${v}`
              : `dst port ${v}`;
          break;
        case "port":
          expr =
            cond.operator === "does not equal"
              ? `not port ${v}`
              : `port ${v}`;
          break;
      }

      return i === 0 ? expr : `${cond.connector.toLowerCase()} ${expr}`;
    })
    .join(" ");
}

// ── Quick templates ────────────────────────────────────────────────────────────

const QUICK_TEMPLATES: Array<{
  id: "web" | "dns" | "icmp" | "excludeArp";
  icon: React.ElementType;
  conditions: Omit<Condition, "id">[];
}> = [
  {
    id: "web",
    icon: Globe,
    conditions: [
      { connector: "AND", attribute: "protocol", operator: "is", value: "tcp" },
      { connector: "AND", attribute: "port", operator: "equals", value: "80" },
      { connector: "OR", attribute: "port", operator: "equals", value: "443" },
    ],
  },
  {
    id: "dns",
    icon: Search,
    conditions: [
      { connector: "AND", attribute: "protocol", operator: "is", value: "udp" },
      { connector: "AND", attribute: "port", operator: "equals", value: "53" },
    ],
  },
  {
    id: "icmp",
    icon: Activity,
    conditions: [
      {
        connector: "AND",
        attribute: "protocol",
        operator: "is",
        value: "icmp",
      },
      { connector: "OR", attribute: "protocol", operator: "is", value: "icmp6" },
    ],
  },
  {
    id: "excludeArp",
    icon: Ban,
    conditions: [
      {
        connector: "AND",
        attribute: "protocol",
        operator: "is not",
        value: "arp",
      },
    ],
  },
];

// ── Condition factory ──────────────────────────────────────────────────────────

let _nextId = 1;
function makeCondition(overrides: Partial<Omit<Condition, "id">> = {}): Condition {
  return {
    id: _nextId++,
    connector: "AND",
    attribute: "protocol",
    operator: "is",
    value: "",
    ...overrides,
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

interface FilterBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (bpf: string) => void;
}

export function FilterBuilderModal({
  open,
  onOpenChange,
  onApply,
}: FilterBuilderModalProps) {
  const t = useTranslations("monitoring");
  const tc = useTranslations("common");
  const [conditions, setConditions] = useState<Condition[]>([makeCondition()]);

  const bpf = useMemo(() => buildBPF(conditions), [conditions]);

  const updateCondition = (id: number, updates: Partial<Condition>) => {
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...updates };
        // Reset operator + value when attribute type changes
        if (updates.attribute && updates.attribute !== c.attribute) {
          updated.operator = ATTRIBUTES[updates.attribute].operators[0];
          updated.value = "";
        }
        return updated;
      })
    );
  };

  const removeCondition = (id: number) => {
    setConditions((prev) => {
      const next = prev.filter((c) => c.id !== id);
      return next.length === 0 ? [makeCondition()] : next;
    });
  };

  const addCondition = () => {
    setConditions((prev) => [...prev, makeCondition({ connector: "AND" })]);
  };

  const applyTemplate = (template: (typeof QUICK_TEMPLATES)[0]) => {
    setConditions(template.conditions.map((c) => ({ ...c, id: _nextId++ })));
  };

  const handleApply = () => {
    onApply(bpf);
    onOpenChange(false);
  };

  const handleClose = () => {
    setConditions([makeCondition()]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>{t("filter.title")}</DialogTitle>
              <DialogDescription>
                {t("filter.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Quick Templates */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {t("filter.quickTemplates")}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUICK_TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/40 hover:border-primary/30 group"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-tight truncate">
                        {t(`filter.templates.${tpl.id}.label`)}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">
                        {t(`filter.templates.${tpl.id}.description`)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Condition Rows */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {t("filter.conditions")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={addCondition}
              >
                <Plus className="h-3 w-3" />
                {t("filter.addCondition")}
              </Button>
            </div>

            <div className="space-y-2">
              {conditions.map((cond, i) => {
                const attrDef = ATTRIBUTES[cond.attribute];
                return (
                  <div key={cond.id} className="flex items-center gap-2">
                    {/* Connector / WHERE label */}
                    {i === 0 ? (
                      <div className="w-[76px] flex-shrink-0 flex justify-end pr-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("filter.where")}
                        </span>
                      </div>
                    ) : (
                      <Select
                        value={cond.connector}
                        onValueChange={(v) =>
                          updateCondition(cond.id, {
                            connector: v as Connector,
                          })
                        }
                      >
                        <SelectTrigger className="w-[76px] flex-shrink-0 h-8 text-xs font-medium px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Attribute */}
                    <Select
                      value={cond.attribute}
                      onValueChange={(v) =>
                        updateCondition(cond.id, {
                          attribute: v as AttributeKey,
                        })
                      }
                    >
                      <SelectTrigger className="w-[155px] flex-shrink-0 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ATTRIBUTES) as AttributeKey[]).map(
                          (k) => (
                            <SelectItem key={k} value={k}>
                              {t(`filter.attributes.${k}`)}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>

                    {/* Operator */}
                    <Select
                      value={cond.operator}
                      onValueChange={(v) =>
                        updateCondition(cond.id, { operator: v })
                      }
                    >
                      <SelectTrigger className="w-[130px] flex-shrink-0 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {attrDef.operators.map((op) => (
                          <SelectItem key={op} value={op}>
                            {OPERATOR_KEYS[op] ? t(`filter.operators.${OPERATOR_KEYS[op]}`) : op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Value */}
                    <div className="flex-1 min-w-0">
                      {attrDef.type === "select" ? (
                        <Select
                          value={cond.value}
                          onValueChange={(v) =>
                            updateCondition(cond.id, { value: v })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={t("filter.selectProtocol")} />
                          </SelectTrigger>
                          <SelectContent>
                            {PROTOCOLS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p.toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={cond.value}
                          onChange={(e) =>
                            updateCondition(cond.id, { value: e.target.value })
                          }
                          placeholder={
                            attrDef.examples
                              ? t("filter.ipPlaceholder", { host: attrDef.examples[0], network: attrDef.examples[1] })
                              : attrDef.placeholder
                          }
                          type={attrDef.type === "port" ? "number" : "text"}
                          className="h-8 text-xs font-mono"
                        />
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => removeCondition(cond.id)}
                      className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title={t("filter.removeCondition")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BPF Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {t("filter.filterExpression")}
              </p>
              {bpf && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-normal text-muted-foreground"
                >
                  {t("filter.bpfSyntax")}
                </Badge>
              )}
            </div>
            <div
              className={cn(
                "rounded-lg border bg-muted/50 px-3 py-2.5 font-mono text-xs min-h-[44px] flex items-center break-all",
                !bpf && "text-muted-foreground italic"
              )}
            >
              {bpf || t("filter.noConditions")}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleApply}>
            <Zap className="h-4 w-4 mr-2" />
            {t("filter.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
