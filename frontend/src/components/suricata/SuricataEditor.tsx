"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { InterfaceName } from "@/lib/api/show";
import {
  displayedLogTypes,
  EVE_TYPE_GROUPS,
  GROUP_PURPOSE,
  groupPreview,
  isAddress,
  mergeMissingStandardGroups,
  referrers,
  reviewConfig,
  setLoggingEnabled,
  variableName,
  withLogTypes,
  type SuricataConfig,
  type SuricataGroup,
} from "@/lib/suricata-model";
import { GroupDialog } from "./GroupDialog";
import { InterfacePicker, IssueList } from "./SuricataFields";

export function SuricataEditor({
  draft,
  onChange,
  interfaces,
  hasWrite,
  saving,
}: {
  draft: SuricataConfig;
  onChange: (config: SuricataConfig) => void;
  interfaces: InterfaceName[];
  hasWrite: boolean;
  saving: boolean;
}) {
  const [dialog, setDialog] = useState<{ kind: "address" | "port"; group: SuricataGroup | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "address" | "port"; name: string } | null>(null);
  const [prefix, setPrefix] = useState("");
  const [prefixError, setPrefixError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState(false);

  const issues = useMemo(() => reviewConfig(draft), [draft]);
  const blocks = issues.filter((issue) => issue.level === "block").map((issue) => issue.message);
  const warnings = issues.filter((issue) => issue.level === "warn").map((issue) => issue.message);
  const home = draft.address_groups.find((group) => group.name === "home-net");
  const external = draft.address_groups.find((group) => group.name === "external-net");
  const externalIsDefault = external?.members.length === 0
    && external.groups.length === 1
    && external.groups[0].value === "home-net"
    && external.groups[0].exclude;
  const disabled = !hasWrite || saving;
  const logTypes = displayedLogTypes(draft.log);

  function updateGroup(kind: "address" | "port", next: SuricataGroup) {
    const key = kind === "address" ? "address_groups" : "port_groups";
    const groups = draft[key];
    const exists = groups.some((group) => group.name === next.name);
    onChange({
      ...draft,
      [key]: exists ? groups.map((group) => (group.name === next.name ? next : group)) : [...groups, next],
    });
  }

  function removeGroup(kind: "address" | "port", name: string) {
    const key = kind === "address" ? "address_groups" : "port_groups";
    const usedBy = referrers(draft[key], name);
    if (usedBy.length > 0) {
      setDeleteTarget(null);
      setActionError(`${name} is still used by ${usedBy.join(", ")}. Edit those groups first.`);
      return;
    }
    setActionError(null);
    onChange({ ...draft, [key]: draft[key].filter((group) => group.name !== name) });
    setDeleteTarget(null);
  }

  function addHomePrefix() {
    const value = prefix.trim();
    if (!home) return;
    if (!isAddress(value)) {
      setPrefixError("Use an address or a network prefix. A prefix must be the network address.");
      return;
    }
    if (home.members.some((member) => member.value === value && !member.exclude)) {
      setPrefixError("That entry is already in your network.");
      return;
    }
    updateGroup("address", {
      ...home,
      members: [...home.members, { value, exclude: false }],
    });
    setPrefix("");
    setPrefixError(null);
  }

  function toggleLogType(id: string, checked: boolean) {
    const current = new Set(logTypes);
    if (checked) current.add(id);
    else current.delete(id);
    onChange({ ...draft, log: { ...draft.log, ...withLogTypes(draft.log, [...current]) } });
  }

  return (
    <div className="space-y-6">
      <IssueList items={blocks} tone="block" />
      {actionError ? <IssueList items={[actionError]} tone="block" /> : null}
      <IssueList items={warnings} tone="warn" />
      {warnings.some((item) => item.includes("fail to start") || item.includes("$HOME_NET") || item.includes("$EXTERNAL_NET")) ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange(mergeMissingStandardGroups(draft))}
        >
          Add the missing standard groups
        </Button>
      ) : null}

      <section id="interfaces" className="space-y-3">
        <h2 className="text-lg font-semibold">Interfaces</h2>
        <InterfacePicker
          available={interfaces}
          selected={draft.interfaces}
          disabled={disabled}
          onChange={(names) => onChange({ ...draft, interfaces: names })}
        />
      </section>

      <section id="network" className="space-y-3">
        <h2 className="text-lg font-semibold">Your network</h2>
        {home ? (
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">$HOME_NET</p>
                <p className="text-sm text-muted-foreground">{GROUP_PURPOSE["home-net"]}</p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setDialog({ kind: "address", group: home })}>
                Advanced
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {home.members.filter((member) => !member.exclude).map((member) => (
                <button
                  key={member.value}
                  type="button"
                  className="rounded-full border px-3 py-1 text-sm"
                  disabled={disabled}
                  onClick={() => updateGroup("address", {
                    ...home,
                    members: home.members.filter((item) => item.value !== member.value || item.exclude),
                  })}
                >
                  {member.value} <span className="text-muted-foreground">remove</span>
                </button>
              ))}
              {home.members.filter((member) => member.exclude).map((member) => (
                <span key={`x-${member.value}`} className="rounded-full border px-3 py-1 text-sm">not {member.value}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={prefix}
                onChange={(event) => {
                  setPrefix(event.target.value);
                  setPrefixError(null);
                }}
                placeholder="10.1.0.0/16"
                disabled={disabled}
                aria-label="Add to your network"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addHomePrefix();
                  }
                }}
              />
              <Button type="button" variant="outline" disabled={disabled || !prefix.trim()} onClick={addHomePrefix}>
                Add
              </Button>
            </div>
            {prefixError ? <p className="text-sm text-destructive">{prefixError}</p> : null}
            <p className="text-sm text-muted-foreground">
              {externalIsDefault
                ? "$EXTERNAL_NET is everything that is not your network."
                : external
                  ? `$EXTERNAL_NET is customized: ${groupPreview(external)}`
                  : "$EXTERNAL_NET is not defined. Rules for outside addresses will not match."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border p-4 text-sm">
            <p>Your network is not defined. Rules look for $HOME_NET.</p>
            <Button
              type="button"
              className="mt-3"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(mergeMissingStandardGroups(draft))}
            >
              Add your network and the standard groups
            </Button>
          </div>
        )}
      </section>

      <section id="variables" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Rule variables</h2>
            <p className="text-sm text-muted-foreground">
              {draft.address_groups.length} address groups and {draft.port_groups.length} port groups. Downloaded rules match these names. Renaming a standard group stops those rules from matching.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowVariables(!showVariables)}>
            {showVariables ? "Hide" : "Show"}
          </Button>
        </div>
        {showVariables ? (
          <div className="space-y-4">
            <GroupTable
              title="Address groups"
              kind="address"
              groups={draft.address_groups}
              disabled={disabled}
              onEdit={(group) => setDialog({ kind: "address", group })}
              onDelete={(name) => setDeleteTarget({ kind: "address", name })}
              onAdd={() => setDialog({ kind: "address", group: null })}
            />
            <GroupTable
              title="Port groups"
              kind="port"
              groups={draft.port_groups}
              disabled={disabled}
              onEdit={(group) => setDialog({ kind: "port", group })}
              onDelete={(name) => setDeleteTarget({ kind: "port", name })}
              onAdd={() => setDialog({ kind: "port", group: null })}
            />
          </div>
        ) : null}
      </section>

      <section id="logging" className="space-y-3">
        <h2 className="text-lg font-semibold">Logging</h2>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={draft.log.enabled}
            disabled={disabled}
            onCheckedChange={(checked) => onChange(setLoggingEnabled(draft, checked === true))}
          />
          Record events
        </label>
        {draft.log.enabled ? (
          <div className="space-y-4 rounded-md border p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="suricata-filetype"
                  checked={(draft.log.filetype || "regular") === "regular"}
                  disabled={disabled}
                  onChange={() => {
                    if ((draft.log.filetype || "regular") === "regular") return;
                    onChange({ ...draft, log: { ...draft.log, filetype: "regular" } });
                  }}
                />
                File
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="suricata-filetype"
                  checked={draft.log.filetype === "syslog"}
                  disabled={disabled}
                  onChange={() => onChange({ ...draft, log: { ...draft.log, filetype: "syslog" } })}
                />
                Syslog
              </label>
            </div>
            {(draft.log.filetype || "regular") === "regular" ? (
              <div className="space-y-1">
                <Label htmlFor="suricata-filename">File name</Label>
                <Input
                  id="suricata-filename"
                  value={draft.log.filename || ""}
                  disabled={disabled}
                  onChange={(event) => onChange({ ...draft, log: { ...draft.log, filename: event.target.value } })}
                  placeholder="eve.json"
                />
                <p className="text-xs text-muted-foreground">
                  Leave this blank to use eve.json. A bare name is written under /var/log/suricata/. An absolute path is used as-is.
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange({ ...draft, log: { ...draft.log, ...withLogTypes(draft.log, ["alert"]) } })}>
                Alerts only
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange({ ...draft, log: { ...draft.log, ...withLogTypes(draft.log, ["alert", "drop", "anomaly"]) } })}>
                Alerts and problems
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange({ ...draft, log: { ...draft.log, ...withLogTypes(draft.log, ["alert", "drop", "flow", "http", "dns", "tls"]) } })}>
                Alerts, flows, and web
              </Button>
            </div>
            {EVE_TYPE_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-2 text-sm font-medium">{group.title}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.types.map((eventType) => (
                    <label key={eventType.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={logTypes.includes(eventType.id)}
                        disabled={disabled}
                        onCheckedChange={(checked) => toggleLogType(eventType.id, checked === true)}
                      />
                      {eventType.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Logging is off. Suricata can still inspect traffic, but matches will not be recorded here.</p>
        )}
      </section>

      <section id="rules" className="space-y-2 rounded-md border p-4">
        <h2 className="text-lg font-semibold">Detection rules</h2>
        <p className="text-sm text-muted-foreground">
          Rules are not edited on this page. After this configuration is saved, the router downloads them with <span className="font-mono">update suricata</span>. That command is not available through the device API, so run it from the router CLI, or schedule <span className="font-mono">/usr/libexec/vyos/op_mode/update_suricata.sh</span> under{" "}
          <Link className="underline" href="/system/settings?tab=scheduler">System Settings, Task Scheduler</Link>.
          The download also restarts Suricata. It does nothing until this service is saved.
        </p>
      </section>

      {dialog ? (
        <GroupDialog
          key={`${dialog.kind}-${dialog.group?.name ?? "new"}`}
          open
          kind={dialog.kind}
          initial={dialog.group}
          others={(dialog.kind === "address" ? draft.address_groups : draft.port_groups).map((group) => group.name)}
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          onSave={(group) => updateGroup(dialog.kind, group)}
        />
      ) : null}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Rules that use ${deleteTarget ? variableName(deleteTarget.name) : ""} will stop matching. This is not saved until you save the page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) removeGroup(deleteTarget.kind, deleteTarget.name);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GroupTable({
  title,
  kind,
  groups,
  disabled,
  onEdit,
  onDelete,
  onAdd,
}: {
  title: string;
  kind: "address" | "port";
  groups: SuricataGroup[];
  disabled: boolean;
  onEdit: (group: SuricataGroup) => void;
  onDelete: (name: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onAdd}>
          Add {kind} group
        </Button>
      </div>
      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Variable</th>
              <th className="px-3 py-2 font-medium">Used for</th>
              <th className="px-3 py-2 font-medium">Contents</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.name} className="border-t">
                <td className="px-3 py-2 font-mono">${variableName(group.name)}</td>
                <td className="px-3 py-2 text-muted-foreground">{GROUP_PURPOSE[group.name] ?? "Custom group."}</td>
                <td className="px-3 py-2 font-mono text-xs">{groupPreview(group)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onEdit(group)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onDelete(group.name)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
