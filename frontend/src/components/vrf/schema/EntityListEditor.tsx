"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Layers, Loader2 } from "lucide-react";
import { vrfService, VrfCapabilities } from "@/lib/api/vrf";
import { EntityGroupSpec } from "./types";
import { SchemaEditor } from "./SchemaEditor";
import { groupScope } from "./messageKeys";
import { useSchemaText } from "./useSchemaText";

type Raw = Record<string, unknown> | null | undefined;

interface EntityListEditorProps {
  vrfName: string;
  /** Accumulated path args from ancestor entities. */
  contextArgs?: string[];
  group: EntityGroupSpec;
  /** Raw config object whose [group.rawKey] holds the entity map. */
  rawParent: Raw;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

function entityMap(rawParent: Raw, key: string | string[]): Record<string, Raw> {
  const path = Array.isArray(key) ? key : [key];
  let node: unknown = rawParent;
  for (const k of path) {
    node = node && typeof node === "object" ? (node as Record<string, unknown>)[k] : undefined;
  }
  if (node && typeof node === "object") return node as Record<string, Raw>;
  return {};
}

export function EntityListEditor({
  vrfName,
  contextArgs = [],
  group,
  rawParent,
  capabilities,
  canWrite,
  onRefresh,
}: EntityListEditorProps) {
  const t = useTranslations("vrfProtocols");
  const tc = useTranslations("common");
  const st = useSchemaText();
  const groupLabel = st.group(group, "label", group.label);
  const entities = entityMap(rawParent, group.rawKey);
  const ids = Object.keys(entities).sort();

  const [editId, setEditId] = useState<string | null>(null);
  const [childCtx, setChildCtx] = useState<{ id: string; index: number } | null>(null);
  const [newId, setNewId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseCtx = [...contextArgs, ...(group.args ?? [])];
  const prefix = [vrfName, ...baseCtx];
  const pluralLabel = group.pluralLabel ?? `${group.label}s`;

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await vrfService.batchConfigure([
        { op: `delete_${group.createOp}`, value: [...prefix, id].join(",") },
      ]);
      if (!result.success) setError(result.error || t("entityList.deleteFailed"));
      else onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("entityList.deleteFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleAddFixed = async (id: string) => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const result = await vrfService.batchConfigure([
        { op: `set_${group.createOp}`, value: [...prefix, id].join(",") },
      ]);
      if (!result.success) {
        setError(result.error || t("entityList.createFailed"));
      } else {
        onRefresh();
        if (group.schema.length > 0) setEditId(id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("entityList.createFailed"));
    } finally {
      setBusy(false);
    }
  };

  const addFreeForm = () => {
    const id = newId.trim();
    if (!id) return;
    setNewId("");
    setEditId(id); // saving the editor's fields creates the entity
  };

  const unusedFixed = (group.fixedIds || []).filter((o) => !ids.includes(o.value));

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {st.group(group, "plural", pluralLabel)} {ids.length > 0 && <Badge variant="secondary" className="ml-1">{ids.length}</Badge>}
        </CardTitle>
        {canWrite && group.fixedIds && unusedFixed.length > 0 && (
          <div className="flex items-center gap-2">
            <Select onValueChange={handleAddFixed} disabled={busy}>
              <SelectTrigger className="h-8 w-[200px]">
                <SelectValue placeholder={st.group(group, "add", `Add ${group.label}…`)} />
              </SelectTrigger>
              <SelectContent>
                {unusedFixed.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{st.option(o)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {canWrite && !group.fixedIds && (
          <div className="flex items-center gap-2">
            <Input
              className="h-8 w-[180px]"
              placeholder={
                group.idPlaceholder
                  ? st.group(group, "idPlaceholder", group.idPlaceholder)
                  : st.group(group, "newItem", `New ${group.label.toLowerCase()}`)
              }
              value={newId}
              disabled={busy}
              onChange={(e) => setNewId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFreeForm()}
            />
            <Button size="sm" variant="outline" onClick={addFreeForm} disabled={busy || !newId.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {tc("add")}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <pre className="mb-3 whitespace-pre-wrap break-words rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </pre>
        )}
        {ids.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{st.group(group, "empty", `No ${pluralLabel.toLowerCase()} configured.`)}</p>
        ) : (
          <div className="space-y-1.5">
            {ids.map((id) => (
              <div key={id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="font-mono text-sm">{id}</span>
                <div className="flex items-center gap-1">
                  {group.schema.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setEditId(id)} disabled={busy}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    {tc("edit")}
                  </Button>
                  )}
                  {(group.children || []).map((cg, idx) => (
                    <Button key={cg.label + idx} size="sm" variant="ghost" onClick={() => setChildCtx({ id, index: idx })} disabled={busy}>
                      <Layers className="h-3.5 w-3.5 mr-1" />
                      {st.group(cg, "plural", cg.pluralLabel ?? `${cg.label}s`)}
                    </Button>
                  ))}
                  {canWrite && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(id)} disabled={busy}>
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Per-entity flat-field editor */}
      {editId && (
        <SchemaEditor
          open
          onOpenChange={(o) => !o && setEditId(null)}
          title={t("entityList.editTitle", { label: groupLabel, id: editId, vrf: vrfName })}
          vrfName={vrfName}
          sections={group.schema}
          scope={groupScope(group)}
          rawConfig={entities[editId]}
          contextArgs={[...baseCtx, editId]}
          capabilities={capabilities}
          canWrite={canWrite}
          onSaved={onRefresh}
        />
      )}

      {/* Nested child entity manager */}
      {childCtx !== null && group.children && group.children[childCtx.index] && (
        <Dialog open onOpenChange={(o) => !o && setChildCtx(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("entityList.childTitle", {
                  plural: st.group(
                    group.children[childCtx.index],
                    "plural",
                    group.children[childCtx.index].pluralLabel ?? `${group.children[childCtx.index].label}s`
                  ),
                  label: groupLabel,
                  id: childCtx.id,
                })}
              </DialogTitle>
            </DialogHeader>
            <EntityListEditor
              vrfName={vrfName}
              contextArgs={[...baseCtx, childCtx.id]}
              group={group.children[childCtx.index]}
              rawParent={entities[childCtx.id]}
              capabilities={capabilities}
              canWrite={canWrite}
              onRefresh={onRefresh}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
