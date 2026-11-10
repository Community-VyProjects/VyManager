"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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

const PURPOSE_KEYS = {
  "home-net": "purposeHomeNet",
  "external-net": "purposeExternalNet",
  "http-servers": "purposeHttpServers",
  "smtp-servers": "purposeSmtpServers",
  "sql-servers": "purposeSqlServers",
  "dns-servers": "purposeDnsServers",
  "telnet-servers": "purposeTelnetServers",
  "aim-servers": "purposeAimServers",
  "dc-servers": "purposeDcServers",
  "dnp3-server": "purposeDnp3Server",
  "dnp3-client": "purposeDnp3Client",
  "modbus-client": "purposeModbusClient",
  "modbus-server": "purposeModbusServer",
  "enip-client": "purposeEnipClient",
  "enip-server": "purposeEnipServer",
  "http-ports": "purposeHttpPorts",
  "shellcode-ports": "purposeShellcodePorts",
  "oracle-ports": "purposeOraclePorts",
  "ssh-ports": "purposeSshPorts",
  "dnp3-ports": "purposeDnp3Ports",
  "modbus-ports": "purposeModbusPorts",
  "file-data-ports": "purposeFileDataPorts",
  "ftp-ports": "purposeFtpPorts",
  "geneve-ports": "purposeGenevePorts",
  "vxlan-ports": "purposeVxlanPorts",
  "teredo-ports": "purposeTeredoPorts",
} as const;

const EVE_TITLE_KEYS = {
  Alerts: "eveAlerts",
  Connections: "eveConnections",
  Applications: "eveApplications",
} as const;

const EVE_LABEL_KEYS = {
  alert: "eveRuleMatches",
  drop: "eveDropped",
  anomaly: "eveAnomaly",
  files: "eveFiles",
  flow: "eveFlow",
  netflow: "eveNetflow",
} as const;

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
  const t = useTranslations("suricata");
  const tc = useTranslations("common");
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
      setActionError(t("groupStillUsed", { name, groups: usedBy.join(", ") }));
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
      setPrefixError(t("prefixMustBeNetwork"));
      return;
    }
    if (home.members.some((member) => member.value === value && !member.exclude)) {
      setPrefixError(t("entryAlreadyInNetwork"));
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
          {t("addMissingStandardGroups")}
        </Button>
      ) : null}

      <section id="interfaces" className="space-y-3">
        <h2 className="text-lg font-semibold">{t("interfaces")}</h2>
        <InterfacePicker
          available={interfaces}
          selected={draft.interfaces}
          disabled={disabled}
          onChange={(names) => onChange({ ...draft, interfaces: names })}
        />
      </section>

      <section id="network" className="space-y-3">
        <h2 className="text-lg font-semibold">{t("yourNetwork")}</h2>
        {home ? (
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">$HOME_NET</p>
                <p className="text-sm text-muted-foreground">{purposeOf("home-net", t)}</p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setDialog({ kind: "address", group: home })}>
                {t("advanced")}
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
                  {member.value} <span className="text-muted-foreground">{t("removeInline")}</span>
                </button>
              ))}
              {home.members.filter((member) => member.exclude).map((member) => (
                <span key={`x-${member.value}`} className="rounded-full border px-3 py-1 text-sm">{t("notPrefix")}{member.value}</span>
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
                aria-label={t("addToYourNetwork")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addHomePrefix();
                  }
                }}
              />
              <Button type="button" variant="outline" disabled={disabled || !prefix.trim()} onClick={addHomePrefix}>
                {tc("add")}
              </Button>
            </div>
            {prefixError ? <p className="text-sm text-destructive">{prefixError}</p> : null}
            <p className="text-sm text-muted-foreground">
              {externalIsDefault
                ? t("externalNetDefault")
                : external
                  ? t("externalNetCustom", { preview: groupPreview(external) })
                  : t("externalNetMissing")}
            </p>
          </div>
        ) : (
          <div className="rounded-md border p-4 text-sm">
            <p>{t("homeNetMissing")}</p>
            <Button
              type="button"
              className="mt-3"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(mergeMissingStandardGroups(draft))}
            >
              {t("addNetworkAndStandard")}
            </Button>
          </div>
        )}
      </section>

      <section id="variables" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("ruleVariables")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("variableSummary", {
                addressCount: draft.address_groups.length,
                portCount: draft.port_groups.length,
              })}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowVariables(!showVariables)}>
            {showVariables ? t("hide") : t("show")}
          </Button>
        </div>
        {showVariables ? (
          <div className="space-y-4">
            <GroupTable
              kind="address"
              groups={draft.address_groups}
              disabled={disabled}
              onEdit={(group) => setDialog({ kind: "address", group })}
              onDelete={(name) => setDeleteTarget({ kind: "address", name })}
              onAdd={() => setDialog({ kind: "address", group: null })}
            />
            <GroupTable
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
        <h2 className="text-lg font-semibold">{t("logging")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={draft.log.enabled}
            disabled={disabled}
            onCheckedChange={(checked) => onChange(setLoggingEnabled(draft, checked === true))}
          />
          {t("recordEvents")}
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
                {t("file")}
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
                <Label htmlFor="suricata-filename">{t("fileName")}</Label>
                <Input
                  id="suricata-filename"
                  value={draft.log.filename || ""}
                  disabled={disabled}
                  onChange={(event) => onChange({ ...draft, log: { ...draft.log, filename: event.target.value } })}
                  placeholder="eve.json"
                />
                <p className="text-xs text-muted-foreground">
                  {t("fileNameHint")}
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange({ ...draft, log: { ...draft.log, ...withLogTypes(draft.log, ["alert"]) } })}>
                {t("alertsOnly")}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange({ ...draft, log: { ...draft.log, ...withLogTypes(draft.log, ["alert", "drop", "anomaly"]) } })}>
                {t("alertsAndProblems")}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange({ ...draft, log: { ...draft.log, ...withLogTypes(draft.log, ["alert", "drop", "flow", "http", "dns", "tls"]) } })}>
                {t("alertsFlowsWeb")}
              </Button>
            </div>
            {EVE_TYPE_GROUPS.map((group) => {
              const titleKey = EVE_TITLE_KEYS[group.title as keyof typeof EVE_TITLE_KEYS];
              return (
                <div key={group.title}>
                  <p className="mb-2 text-sm font-medium">{titleKey ? t(titleKey) : group.title}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.types.map((eventType) => {
                      const labelKey = EVE_LABEL_KEYS[eventType.id as keyof typeof EVE_LABEL_KEYS];
                      return (
                        <label key={eventType.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={logTypes.includes(eventType.id)}
                            disabled={disabled}
                            onCheckedChange={(checked) => toggleLogType(eventType.id, checked === true)}
                          />
                          {labelKey ? t(labelKey) : eventType.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("loggingOff")}</p>
        )}
      </section>

      <section id="rules" className="space-y-2 rounded-md border p-4">
        <h2 className="text-lg font-semibold">{t("detectionRules")}</h2>
        <p className="text-sm text-muted-foreground">
          {t.rich("rulesBody", {
            mono: (chunks) => <span className="font-mono">{chunks}</span>,
            scheduler: (chunks) => (
              <Link className="underline" href="/system/settings?tab=scheduler">{chunks}</Link>
            ),
          })}
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
            <AlertDialogTitle>{t("deleteNamed", { name: deleteTarget?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteGroupDescription", { variable: `$${deleteTarget ? variableName(deleteTarget.name) : ""}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) removeGroup(deleteTarget.kind, deleteTarget.name);
              }}
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GroupTable({
  kind,
  groups,
  disabled,
  onEdit,
  onDelete,
  onAdd,
}: {
  kind: "address" | "port";
  groups: SuricataGroup[];
  disabled: boolean;
  onEdit: (group: SuricataGroup) => void;
  onDelete: (name: string) => void;
  onAdd: () => void;
}) {
  const t = useTranslations("suricata");
  const tc = useTranslations("common");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{kind === "address" ? t("addressGroups") : t("portGroups")}</h3>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onAdd}>
          {kind === "address" ? t("addAddressGroup") : t("addPortGroup")}
        </Button>
      </div>
      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">{t("variable")}</th>
              <th className="px-3 py-2 font-medium">{t("usedFor")}</th>
              <th className="px-3 py-2 font-medium">{t("contents")}</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.name} className="border-t">
                <td className="px-3 py-2 font-mono">${variableName(group.name)}</td>
                <td className="px-3 py-2 text-muted-foreground">{purposeOf(group.name, t)}</td>
                <td className="px-3 py-2 font-mono text-xs">{groupPreview(group)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onEdit(group)}>
                    {tc("edit")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onDelete(group.name)}>
                    {tc("delete")}
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

function purposeOf(name: string, t: ReturnType<typeof useTranslations<"suricata">>) {
  const key = PURPOSE_KEYS[name as keyof typeof PURPOSE_KEYS];
  return key ? t(key) : t("customGroup");
}
