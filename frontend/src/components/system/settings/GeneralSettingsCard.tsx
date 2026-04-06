"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Edit2, Plus, X } from "lucide-react";
import {
  systemSettingsService,
  type SystemConfig,
  type SystemCapabilities,
} from "@/lib/api/system-settings";
import { useToast } from "@/hooks/useToast";

// Common timezones for the select
const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "America/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Stockholm",
  "Europe/Warsaw",
  "Europe/Zurich",
  "Europe/Helsinki",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Casablanca",
  "Africa/Algiers",
  "Africa/Tunis",
  "Africa/Khartoum",
  "Africa/Addis_Ababa",
  "Africa/Dar_es_Salaam",
  "Africa/Lusaka",
  "Africa/Harare",
  "Africa/Maputo",
  "Africa/Windhoek",
  "Africa/Gaborone",
  "Africa/Kinshasa",
  "Africa/Douala",
  "Africa/Accra",
  "Africa/Dakar",
  "Africa/Luanda",
  "Africa/Mogadishu",
  "Africa/Djibouti",
  "Africa/Maseru",
  "Africa/Mbabane",
  "Africa/Blantyre",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Pacific/Auckland",
];

interface Props {
  config: SystemConfig;
  capabilities: SystemCapabilities;
  isReadOnly: boolean;
  onRefresh: () => void;
}

export function GeneralSettingsCard({ config, capabilities, isReadOnly, onRefresh }: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state mirrors config
  const [hostname, setHostname] = useState(config.hostname ?? "");
  const [domainName, setDomainName] = useState(config.domain_name ?? "");
  const [timeZone, setTimeZone] = useState(config.time_zone ?? "");
  const [performance, setPerformance] = useState(config.performance ?? "");
  const [nameServers, setNameServers] = useState<string[]>(config.name_servers);
  const [nsInput, setNsInput] = useState("");

  const startEditing = () => {
    setHostname(config.hostname ?? "");
    setDomainName(config.domain_name ?? "");
    setTimeZone(config.time_zone ?? "");
    setPerformance(config.performance ?? "");
    setNameServers(config.name_servers);
    setNsInput("");
    setError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const addNameServer = () => {
    const ns = nsInput.trim();
    if (ns && !nameServers.includes(ns)) {
      setNameServers((prev) => [...prev, ns]);
    }
    setNsInput("");
  };

  const removeNameServer = (ns: string) => {
    setNameServers((prev) => prev.filter((s) => s !== ns));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const hostnameChanged = hostname !== (config.hostname ?? "");
      const domainChanged = domainName !== (config.domain_name ?? "");
      const tzChanged = timeZone !== (config.time_zone ?? "");
      const perfChanged = performance !== (config.performance ?? "");
      const nsChanged =
        JSON.stringify(nameServers.slice().sort()) !==
        JSON.stringify(config.name_servers.slice().sort());

      if (!hostnameChanged && !domainChanged && !tzChanged && !perfChanged && !nsChanged) {
        setEditing(false);
        return;
      }

      const nsRemove = config.name_servers.filter((ns) => !nameServers.includes(ns));
      const nsAdd = nameServers.filter((ns) => !config.name_servers.includes(ns));

      const result = await systemSettingsService.updateGeneralSettings({
        hostname: hostnameChanged && hostname ? hostname : undefined,
        clearHostname: hostnameChanged && !hostname,
        domainName: domainChanged && domainName ? domainName : undefined,
        clearDomainName: domainChanged && !domainName,
        timeZone: tzChanged && timeZone ? timeZone : undefined,
        clearTimeZone: tzChanged && !timeZone,
        performance: perfChanged && performance ? performance : undefined,
        clearPerformance: perfChanged && !performance,
        nameServersAdd: nsAdd,
        nameServersRemove: nsRemove,
      });

      if (!result.success) {
        setError(result.error ?? "Operation failed");
        return;
      }

      toast.success("General settings saved");
      setEditing(false);
      onRefresh();
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Hostname, domain, name servers, timezone, and performance profile.
            </CardDescription>
          </div>
          {!isReadOnly && !editing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
            </div>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Hostname */}
          <div className="space-y-2">
            <Label htmlFor="hostname">Hostname</Label>
            {editing ? (
              <Input
                id="hostname"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="vyos"
              />
            ) : (
              <p className="text-sm text-foreground font-medium">
                {config.hostname || <span className="text-muted-foreground">Not set</span>}
              </p>
            )}
          </div>

          {/* Domain Name */}
          <div className="space-y-2">
            <Label htmlFor="domain">Domain Name</Label>
            {editing ? (
              <Input
                id="domain"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="example.com"
              />
            ) : (
              <p className="text-sm text-foreground font-medium">
                {config.domain_name || <span className="text-muted-foreground">Not set</span>}
              </p>
            )}
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            {editing ? (
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-foreground font-medium">
                {config.time_zone || <span className="text-muted-foreground">Not set</span>}
              </p>
            )}
          </div>

          {/* Performance Profile */}
          <div className="space-y-2">
            <Label htmlFor="performance">Performance Profile</Label>
            {editing ? (
              <Select
                value={performance || "__none__"}
                onValueChange={(v) => setPerformance(v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="performance">
                  <SelectValue placeholder="Default (not set)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Default (not set)</SelectItem>
                  {capabilities.performance_options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} title={opt.description}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-foreground font-medium">
                {capabilities.performance_options.find((o) => o.value === config.performance)
                  ?.label || <span className="text-muted-foreground">Default (not set)</span>}
              </p>
            )}
          </div>
        </div>

        {/* Name Servers */}
        <div className="space-y-2">
          <Label>Name Servers</Label>
          <div className="flex flex-wrap gap-2">
            {(editing ? nameServers : config.name_servers).map((ns) => (
              <Badge key={ns} variant="secondary" className="flex items-center gap-1">
                {ns}
                {editing && (
                  <button
                    type="button"
                    onClick={() => removeNameServer(ns)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {!editing && config.name_servers.length === 0 && (
              <span className="text-sm text-muted-foreground">None configured</span>
            )}
          </div>
          {editing && (
            <div className="flex gap-2 mt-2">
              <Input
                value={nsInput}
                onChange={(e) => setNsInput(e.target.value)}
                placeholder="8.8.8.8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNameServer();
                  }
                }}
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={addNameServer}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
