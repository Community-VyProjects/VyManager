"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DhcpCatalogLeaf, DhcpCatalogValue, DhcpRoute } from "@/lib/api/dhcp";
import { editMultiRow } from "./dhcp-catalog";

const NONE = "__none__";

interface DhcpCatalogFieldsProps {
  leaves: DhcpCatalogLeaf[];
  values: Record<string, DhcpCatalogValue>;
  onChange: (token: string, value: DhcpCatalogValue) => void;
  idPrefix?: string;
}

function textValue(value: DhcpCatalogValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function listValue(value: DhcpCatalogValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function routeValue(value: DhcpCatalogValue | undefined): DhcpRoute[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DhcpRoute => typeof item === "object" && item !== null && "prefix" in item);
}

export function DhcpCatalogFields({
  leaves,
  values,
  onChange,
  idPrefix = "dhcp-opt",
}: DhcpCatalogFieldsProps) {
  if (leaves.length === 0) return null;
  return (
    <div className="space-y-4">
      {leaves.map((leaf, index) => {
        const showGroup = index === 0 || leaf.group !== leaves[index - 1].group;
        const id = `${idPrefix}-${leaf.token}`;
        return (
          <div key={leaf.token} className="space-y-2">
            {showGroup && (
              <p className="text-sm font-medium text-foreground pt-2">{leaf.group}</p>
            )}
            {leaf.kind === "flag" ? (
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={id}
                  checked={values[leaf.token] === true}
                  onCheckedChange={(checked) => onChange(leaf.token, checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor={id} className="cursor-pointer">{leaf.label}</Label>
                  <p className="text-xs text-muted-foreground">{leaf.help}</p>
                </div>
              </div>
            ) : leaf.kind === "multi" ? (
              <MultiField
                id={id}
                leaf={leaf}
                values={listValue(values[leaf.token])}
                onChange={(next) => onChange(leaf.token, next)}
              />
            ) : leaf.kind === "route" ? (
              <RouteField
                leaf={leaf}
                values={routeValue(values[leaf.token])}
                onChange={(next) => onChange(leaf.token, next)}
              />
            ) : leaf.choices.length > 0 ? (
              <div>
                <Label htmlFor={id}>{leaf.label}</Label>
                <Select
                  value={textValue(values[leaf.token]) || NONE}
                  onValueChange={(value) => onChange(leaf.token, value === NONE ? "" : value)}
                >
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not set</SelectItem>
                    {leaf.choices.map((choice) => (
                      <SelectItem key={choice} value={choice}>{choice}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{leaf.help}</p>
              </div>
            ) : (
              <div>
                <Label htmlFor={id}>{leaf.label}</Label>
                <Input
                  id={id}
                  value={textValue(values[leaf.token])}
                  onChange={(event) => onChange(leaf.token, event.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">{leaf.help}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MultiField({
  id,
  leaf,
  values,
  onChange,
}: {
  id: string;
  leaf: DhcpCatalogLeaf;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const rows = values.length === 0 ? [""] : values;
  return (
    <div>
      <Label htmlFor={id}>{leaf.label}</Label>
      <div className="space-y-2 mt-2">
        {rows.map((value, index) => (
          <div key={index} className="flex gap-2">
            <Input
              id={index === 0 ? id : undefined}
              value={value}
              onChange={(event) => {
                onChange(editMultiRow(values, index, event.target.value));
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onChange(rows.filter((_, item) => item !== index))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, ""])}>
          <Plus className="h-4 w-4 mr-2" />
          Add {leaf.label}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{leaf.help}</p>
    </div>
  );
}

function RouteField({
  leaf,
  values,
  onChange,
}: {
  leaf: DhcpCatalogLeaf;
  values: DhcpRoute[];
  onChange: (next: DhcpRoute[]) => void;
}) {
  const rows = values.length === 0 ? [{ prefix: "", next_hop: "" }] : values;
  const update = (index: number, patch: Partial<DhcpRoute>) => {
    const next = rows.map((row, item) => (item === index ? { ...row, ...patch } : row));
    onChange(next);
  };
  return (
    <div>
      <Label>{leaf.label}</Label>
      <div className="space-y-2 mt-2">
        {rows.map((row, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={row.prefix}
              placeholder="10.0.0.0/24"
              onChange={(event) => update(index, { prefix: event.target.value })}
            />
            <Input
              value={row.next_hop}
              placeholder="192.0.2.1"
              onChange={(event) => update(index, { next_hop: event.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onChange(rows.filter((_, item) => item !== index))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, { prefix: "", next_hop: "" }])}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add route
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{leaf.help}</p>
    </div>
  );
}
