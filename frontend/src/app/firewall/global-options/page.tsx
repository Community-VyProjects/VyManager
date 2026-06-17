"use client";

export const dynamic = 'force-dynamic';

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  AlertCircle,
  Save,
  Info,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  firewallGlobalOptionsService,
  type FirewallGlobalOptionsConfig,
  type FirewallGlobalOptionsCapabilities,
} from "@/lib/api/firewall-global-options";
import { cn } from "@/lib/utils";

function FirewallGlobalOptionsPageInner() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<FirewallGlobalOptionsConfig | null>(null);
  const [capabilities, setCapabilities] = useState<FirewallGlobalOptionsCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state - Basic Options
  const [allPing, setAllPing] = useState<string>("not_set");
  const [broadcastPing, setBroadcastPing] = useState<string>("not_set");

  // Form state - Source Routing
  const [ipSrcRoute, setIpSrcRoute] = useState<string>("not_set");
  const [ipv6SrcRoute, setIpv6SrcRoute] = useState<string>("not_set");

  // Form state - ICMP Redirects
  const [receiveRedirects, setReceiveRedirects] = useState<string>("not_set");
  const [ipv6ReceiveRedirects, setIpv6ReceiveRedirects] = useState<string>("not_set");
  const [sendRedirects, setSendRedirects] = useState<string>("not_set");

  // Form state - Security Options
  const [logMartians, setLogMartians] = useState<string>("not_set");
  const [sourceValidation, setSourceValidation] = useState<string>("not_set");
  const [synCookies, setSynCookies] = useState<string>("not_set");
  const [twaHazardsProtection, setTwaHazardsProtection] = useState<string>("not_set");

  // Form state - State Policies
  const [establishedAction, setEstablishedAction] = useState<string>("not_set");
  const [establishedLog, setEstablishedLog] = useState(false);
  const [establishedLogLevel, setEstablishedLogLevel] = useState<string>("not_set");

  const [invalidAction, setInvalidAction] = useState<string>("not_set");
  const [invalidLog, setInvalidLog] = useState(false);
  const [invalidLogLevel, setInvalidLogLevel] = useState<string>("not_set");

  const [relatedAction, setRelatedAction] = useState<string>("not_set");
  const [relatedLog, setRelatedLog] = useState(false);
  const [relatedLogLevel, setRelatedLogLevel] = useState<string>("not_set");

  // Form state - Bridged Traffic (VyOS 1.5+)
  const [bridgedIpv4, setBridgedIpv4] = useState(false);
  const [bridgedIpv6, setBridgedIpv6] = useState(false);

  // Form state - Timeouts (VyOS 1.5+)
  const [timeoutIcmp, setTimeoutIcmp] = useState<string>("");
  const [timeoutOther, setTimeoutOther] = useState<string>("");
  const [timeoutTcpClose, setTimeoutTcpClose] = useState<string>("");
  const [timeoutTcpCloseWait, setTimeoutTcpCloseWait] = useState<string>("");
  const [timeoutTcpEstablished, setTimeoutTcpEstablished] = useState<string>("");
  const [timeoutTcpFinWait, setTimeoutTcpFinWait] = useState<string>("");
  const [timeoutTcpLastAck, setTimeoutTcpLastAck] = useState<string>("");
  const [timeoutTcpSynRecv, setTimeoutTcpSynRecv] = useState<string>("");
  const [timeoutTcpSynSent, setTimeoutTcpSynSent] = useState<string>("");
  const [timeoutTcpTimeWait, setTimeoutTcpTimeWait] = useState<string>("");
  const [timeoutUdpOther, setTimeoutUdpOther] = useState<string>("");
  const [timeoutUdpStream, setTimeoutUdpStream] = useState<string>("");

  // Initial form values for change detection
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});

  const loadData = async (forceRefresh: boolean = true) => {
    try {
      setError(null);
      setLoading(true);
      const [configResponse, capabilitiesData] = await Promise.all([
        firewallGlobalOptionsService.getConfig(forceRefresh),
        firewallGlobalOptionsService.getCapabilities(),
      ]);
      setConfig(configResponse.config);
      setCapabilities(capabilitiesData);
      populateFormFromConfig(configResponse.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load global options");
    } finally {
      setLoading(false);
    }
  };

  const populateFormFromConfig = (cfg: FirewallGlobalOptionsConfig) => {
    setAllPing(cfg.all_ping || "not_set");
    setBroadcastPing(cfg.broadcast_ping || "not_set");
    setIpSrcRoute(cfg.ip_src_route || "not_set");
    setIpv6SrcRoute(cfg.ipv6_src_route || "not_set");
    setReceiveRedirects(cfg.receive_redirects || "not_set");
    setIpv6ReceiveRedirects(cfg.ipv6_receive_redirects || "not_set");
    setSendRedirects(cfg.send_redirects || "not_set");
    setLogMartians(cfg.log_martians || "not_set");
    setSourceValidation(cfg.source_validation || "not_set");
    setSynCookies(cfg.syn_cookies || "not_set");
    setTwaHazardsProtection(cfg.twa_hazards_protection || "not_set");

    if (cfg.state_policy_established) {
      setEstablishedAction(cfg.state_policy_established.action || "not_set");
      setEstablishedLog(cfg.state_policy_established.log || false);
      setEstablishedLogLevel(cfg.state_policy_established.log_level || "not_set");
    } else {
      setEstablishedAction("not_set");
      setEstablishedLog(false);
      setEstablishedLogLevel("not_set");
    }

    if (cfg.state_policy_invalid) {
      setInvalidAction(cfg.state_policy_invalid.action || "not_set");
      setInvalidLog(cfg.state_policy_invalid.log || false);
      setInvalidLogLevel(cfg.state_policy_invalid.log_level || "not_set");
    } else {
      setInvalidAction("not_set");
      setInvalidLog(false);
      setInvalidLogLevel("not_set");
    }

    if (cfg.state_policy_related) {
      setRelatedAction(cfg.state_policy_related.action || "not_set");
      setRelatedLog(cfg.state_policy_related.log || false);
      setRelatedLogLevel(cfg.state_policy_related.log_level || "not_set");
    } else {
      setRelatedAction("not_set");
      setRelatedLog(false);
      setRelatedLogLevel("not_set");
    }

    if (cfg.bridged_traffic) {
      setBridgedIpv4(cfg.bridged_traffic.ipv4 || false);
      setBridgedIpv6(cfg.bridged_traffic.ipv6 || false);
    } else {
      setBridgedIpv4(false);
      setBridgedIpv6(false);
    }

    if (cfg.timeouts) {
      setTimeoutIcmp(cfg.timeouts.icmp?.toString() || "");
      setTimeoutOther(cfg.timeouts.other?.toString() || "");
      setTimeoutTcpClose(cfg.timeouts.tcp_close?.toString() || "");
      setTimeoutTcpCloseWait(cfg.timeouts.tcp_close_wait?.toString() || "");
      setTimeoutTcpEstablished(cfg.timeouts.tcp_established?.toString() || "");
      setTimeoutTcpFinWait(cfg.timeouts.tcp_fin_wait?.toString() || "");
      setTimeoutTcpLastAck(cfg.timeouts.tcp_last_ack?.toString() || "");
      setTimeoutTcpSynRecv(cfg.timeouts.tcp_syn_recv?.toString() || "");
      setTimeoutTcpSynSent(cfg.timeouts.tcp_syn_sent?.toString() || "");
      setTimeoutTcpTimeWait(cfg.timeouts.tcp_time_wait?.toString() || "");
      setTimeoutUdpOther(cfg.timeouts.udp_other?.toString() || "");
      setTimeoutUdpStream(cfg.timeouts.udp_stream?.toString() || "");
    } else {
      setTimeoutIcmp("");
      setTimeoutOther("");
      setTimeoutTcpClose("");
      setTimeoutTcpCloseWait("");
      setTimeoutTcpEstablished("");
      setTimeoutTcpFinWait("");
      setTimeoutTcpLastAck("");
      setTimeoutTcpSynRecv("");
      setTimeoutTcpSynSent("");
      setTimeoutTcpTimeWait("");
      setTimeoutUdpOther("");
      setTimeoutUdpStream("");
    }

    setInitialValues({
      allPing: cfg.all_ping || "not_set",
      broadcastPing: cfg.broadcast_ping || "not_set",
      ipSrcRoute: cfg.ip_src_route || "not_set",
      ipv6SrcRoute: cfg.ipv6_src_route || "not_set",
      receiveRedirects: cfg.receive_redirects || "not_set",
      ipv6ReceiveRedirects: cfg.ipv6_receive_redirects || "not_set",
      sendRedirects: cfg.send_redirects || "not_set",
      logMartians: cfg.log_martians || "not_set",
      sourceValidation: cfg.source_validation || "not_set",
      synCookies: cfg.syn_cookies || "not_set",
      twaHazardsProtection: cfg.twa_hazards_protection || "not_set",
      establishedAction: cfg.state_policy_established?.action || "not_set",
      establishedLog: cfg.state_policy_established?.log || false,
      establishedLogLevel: cfg.state_policy_established?.log_level || "not_set",
      invalidAction: cfg.state_policy_invalid?.action || "not_set",
      invalidLog: cfg.state_policy_invalid?.log || false,
      invalidLogLevel: cfg.state_policy_invalid?.log_level || "not_set",
      relatedAction: cfg.state_policy_related?.action || "not_set",
      relatedLog: cfg.state_policy_related?.log || false,
      relatedLogLevel: cfg.state_policy_related?.log_level || "not_set",
      bridgedIpv4: cfg.bridged_traffic?.ipv4 || false,
      bridgedIpv6: cfg.bridged_traffic?.ipv6 || false,
      timeoutIcmp: cfg.timeouts?.icmp?.toString() || "",
      timeoutOther: cfg.timeouts?.other?.toString() || "",
      timeoutTcpClose: cfg.timeouts?.tcp_close?.toString() || "",
      timeoutTcpCloseWait: cfg.timeouts?.tcp_close_wait?.toString() || "",
      timeoutTcpEstablished: cfg.timeouts?.tcp_established?.toString() || "",
      timeoutTcpFinWait: cfg.timeouts?.tcp_fin_wait?.toString() || "",
      timeoutTcpLastAck: cfg.timeouts?.tcp_last_ack?.toString() || "",
      timeoutTcpSynRecv: cfg.timeouts?.tcp_syn_recv?.toString() || "",
      timeoutTcpSynSent: cfg.timeouts?.tcp_syn_sent?.toString() || "",
      timeoutTcpTimeWait: cfg.timeouts?.tcp_time_wait?.toString() || "",
      timeoutUdpOther: cfg.timeouts?.udp_other?.toString() || "",
      timeoutUdpStream: cfg.timeouts?.udp_stream?.toString() || "",
    });
    setHasChanges(false);
  };

  useEffect(() => {
    const currentValues = {
      allPing, broadcastPing, ipSrcRoute, ipv6SrcRoute, receiveRedirects,
      ipv6ReceiveRedirects, sendRedirects, logMartians, sourceValidation,
      synCookies, twaHazardsProtection, establishedAction, establishedLog,
      establishedLogLevel, invalidAction, invalidLog, invalidLogLevel,
      relatedAction, relatedLog, relatedLogLevel, bridgedIpv4, bridgedIpv6,
      timeoutIcmp, timeoutOther, timeoutTcpClose, timeoutTcpCloseWait,
      timeoutTcpEstablished, timeoutTcpFinWait, timeoutTcpLastAck,
      timeoutTcpSynRecv, timeoutTcpSynSent, timeoutTcpTimeWait,
      timeoutUdpOther, timeoutUdpStream,
    };
    const changed = Object.keys(currentValues).some(
      (key) => currentValues[key as keyof typeof currentValues] !== initialValues[key]
    );
    setHasChanges(changed);
  }, [
    allPing, broadcastPing, ipSrcRoute, ipv6SrcRoute, receiveRedirects,
    ipv6ReceiveRedirects, sendRedirects, logMartians, sourceValidation,
    synCookies, twaHazardsProtection, establishedAction, establishedLog,
    establishedLogLevel, invalidAction, invalidLog, invalidLogLevel,
    relatedAction, relatedLog, relatedLogLevel, bridgedIpv4, bridgedIpv6,
    timeoutIcmp, timeoutOther, timeoutTcpClose, timeoutTcpCloseWait,
    timeoutTcpEstablished, timeoutTcpFinWait, timeoutTcpLastAck,
    timeoutTcpSynRecv, timeoutTcpSynSent, timeoutTcpTimeWait,
    timeoutUdpOther, timeoutUdpStream, initialValues,
  ]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const field = searchParams.get("field");
    const section = searchParams.get("section");
    const targetId = field || section;
    if (targetId) {
      requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [searchParams]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Use empty string "" for "not_set" values to trigger deletion in backend
      // Backend checks: if value is truthy -> set, if value is falsy but not None -> delete
      const updateConfig: Partial<FirewallGlobalOptionsConfig> = {
        all_ping: allPing !== "not_set" ? allPing : "",
        broadcast_ping: broadcastPing !== "not_set" ? broadcastPing : "",
        ip_src_route: ipSrcRoute !== "not_set" ? ipSrcRoute : "",
        ipv6_src_route: ipv6SrcRoute !== "not_set" ? ipv6SrcRoute : "",
        receive_redirects: receiveRedirects !== "not_set" ? receiveRedirects : "",
        ipv6_receive_redirects: ipv6ReceiveRedirects !== "not_set" ? ipv6ReceiveRedirects : "",
        send_redirects: sendRedirects !== "not_set" ? sendRedirects : "",
        log_martians: logMartians !== "not_set" ? logMartians : "",
        source_validation: sourceValidation !== "not_set" ? sourceValidation : "",
        syn_cookies: synCookies !== "not_set" ? synCookies : "",
        twa_hazards_protection: twaHazardsProtection !== "not_set" ? twaHazardsProtection : "",
      };

      // Always send state policy config so backend can delete if needed
      updateConfig.state_policy_established = {
        action: establishedAction !== "not_set" ? establishedAction : "",
        log: establishedLog,
        log_level: establishedLogLevel !== "not_set" ? establishedLogLevel : "",
      };

      updateConfig.state_policy_invalid = {
        action: invalidAction !== "not_set" ? invalidAction : "",
        log: invalidLog,
        log_level: invalidLogLevel !== "not_set" ? invalidLogLevel : "",
      };

      updateConfig.state_policy_related = {
        action: relatedAction !== "not_set" ? relatedAction : "",
        log: relatedLog,
        log_level: relatedLogLevel !== "not_set" ? relatedLogLevel : "",
      };

      if (capabilities?.version_notes.bridged_traffic_available) {
        updateConfig.bridged_traffic = { ipv4: bridgedIpv4, ipv6: bridgedIpv6 };
      }

      if (capabilities?.version_notes.timeouts_available) {
        updateConfig.timeouts = {
          icmp: timeoutIcmp ? parseInt(timeoutIcmp) : null,
          other: timeoutOther ? parseInt(timeoutOther) : null,
          tcp_close: timeoutTcpClose ? parseInt(timeoutTcpClose) : null,
          tcp_close_wait: timeoutTcpCloseWait ? parseInt(timeoutTcpCloseWait) : null,
          tcp_established: timeoutTcpEstablished ? parseInt(timeoutTcpEstablished) : null,
          tcp_fin_wait: timeoutTcpFinWait ? parseInt(timeoutTcpFinWait) : null,
          tcp_last_ack: timeoutTcpLastAck ? parseInt(timeoutTcpLastAck) : null,
          tcp_syn_recv: timeoutTcpSynRecv ? parseInt(timeoutTcpSynRecv) : null,
          tcp_syn_sent: timeoutTcpSynSent ? parseInt(timeoutTcpSynSent) : null,
          tcp_time_wait: timeoutTcpTimeWait ? parseInt(timeoutTcpTimeWait) : null,
          udp_other: timeoutUdpOther ? parseInt(timeoutUdpOther) : null,
          udp_stream: timeoutUdpStream ? parseInt(timeoutUdpStream) : null,
        };
      }

      const response = await firewallGlobalOptionsService.updateConfig(updateConfig);

      if (response.success) {
        setSuccessMessage("Configuration saved successfully");
        await loadData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.error || "Failed to save configuration");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      populateFormFromConfig(config);
    }
  };

  const isV15 = capabilities?.version_notes.is_v15_or_later || false;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Compact select component for settings
  const SettingSelect = ({
    label,
    value,
    onChange,
    options,
    description,
    fieldId,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    description?: string;
    fieldId?: string;
  }) => (
    <div
      id={fieldId}
      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 scroll-mt-24"
    >
      <div className="flex-1 min-w-0 pr-4">
        <span className="text-sm font-medium">{label}</span>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const enableDisableOptions = [
    { value: "not_set", label: "Not Set (Default)" },
    { value: "enable", label: "Enable" },
    { value: "disable", label: "Disable" },
  ];

  const actionOptions = [
    { value: "not_set", label: "Not Set" },
    { value: "accept", label: "Accept" },
    { value: "drop", label: "Drop" },
    { value: "reject", label: "Reject" },
  ];

  const logLevelOptions = [
    { value: "not_set", label: "Not Set" },
    { value: "emerg", label: "Emergency" },
    { value: "alert", label: "Alert" },
    { value: "crit", label: "Critical" },
    { value: "err", label: "Error" },
    { value: "warn", label: "Warning" },
    { value: "notice", label: "Notice" },
    { value: "info", label: "Info" },
    { value: "debug", label: "Debug" },
  ];

  const sourceValidationOptions = [
    { value: "not_set", label: "Not Set (Default)" },
    { value: "strict", label: "Strict" },
    { value: "loose", label: "Loose" },
    { value: "disable", label: "Disable" },
  ];

  return (
    <AppLayout>
      <div className="space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Global Options</h1>
              <p className="text-sm text-muted-foreground">
                Configure global firewall settings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadData()} disabled={saving}>
              <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
                Reset
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {hasChanges && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-500" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              You have unsaved changes
            </p>
          </div>
        )}

        {/* Main Content - 2 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* ICMP Settings */}
            <Card id="icmp-settings">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">ICMP Settings</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <SettingSelect
                  fieldId="all-ping"
                  label="All Ping"
                  value={allPing}
                  onChange={setAllPing}
                  options={enableDisableOptions}
                  description="Accept/reject all IPv4 ICMP echo requests"
                />
                <SettingSelect
                  fieldId="broadcast-ping"
                  label="Broadcast Ping"
                  value={broadcastPing}
                  onChange={setBroadcastPing}
                  options={enableDisableOptions}
                  description="Accept/reject broadcast ping"
                />
              </CardContent>
            </Card>

            {/* Source Routing */}
            <Card id="source-routing">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">Source Routing</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <SettingSelect
                  fieldId="ipv4-source-routing"
                  label="IPv4 Source Routing"
                  value={ipSrcRoute}
                  onChange={setIpSrcRoute}
                  options={enableDisableOptions}
                />
                <SettingSelect
                  fieldId="ipv6-source-routing"
                  label="IPv6 Source Routing"
                  value={ipv6SrcRoute}
                  onChange={setIpv6SrcRoute}
                  options={enableDisableOptions}
                />
              </CardContent>
            </Card>

            {/* ICMP Redirects */}
            <Card id="icmp-redirects">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">ICMP Redirects</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <SettingSelect
                  fieldId="receive-redirects-ipv4"
                  label="Receive Redirects (IPv4)"
                  value={receiveRedirects}
                  onChange={setReceiveRedirects}
                  options={enableDisableOptions}
                />
                <SettingSelect
                  fieldId="receive-redirects-ipv6"
                  label="Receive Redirects (IPv6)"
                  value={ipv6ReceiveRedirects}
                  onChange={setIpv6ReceiveRedirects}
                  options={enableDisableOptions}
                />
                <SettingSelect
                  fieldId="send-redirects"
                  label="Send Redirects"
                  value={sendRedirects}
                  onChange={setSendRedirects}
                  options={enableDisableOptions}
                />
              </CardContent>
            </Card>

            {/* Security Options */}
            <Card id="security-options">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">Security Options</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <SettingSelect
                  fieldId="log-martians"
                  label="Log Martians"
                  value={logMartians}
                  onChange={setLogMartians}
                  options={enableDisableOptions}
                  description="Log packets with impossible addresses"
                />
                <SettingSelect
                  fieldId="source-validation"
                  label="Source Validation"
                  value={sourceValidation}
                  onChange={setSourceValidation}
                  options={sourceValidationOptions}
                  description="Reverse path filtering mode"
                />
                <SettingSelect
                  fieldId="syn-cookies"
                  label="SYN Cookies"
                  value={synCookies}
                  onChange={setSynCookies}
                  options={enableDisableOptions}
                  description="SYN flood protection"
                />
                <SettingSelect
                  fieldId="twa-hazards"
                  label="TWA Hazards Protection"
                  value={twaHazardsProtection}
                  onChange={setTwaHazardsProtection}
                  options={enableDisableOptions}
                  description="RFC1337 TIME-WAIT protection"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* State Policies */}
            <Card id="state-policies">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">State Policies</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0 space-y-4">
                {/* Established */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-medium">Established</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div id="established-action" className="scroll-mt-24">
                      <Label className="text-xs text-muted-foreground">Action</Label>
                      <Select value={establishedAction} onValueChange={setEstablishedAction}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {actionOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div id="established-log-level" className="scroll-mt-24">
                      <Label className="text-xs text-muted-foreground">Log Level</Label>
                      <Select value={establishedLogLevel} onValueChange={setEstablishedLogLevel}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {logLevelOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div id="established-log" className="flex items-end pb-1 scroll-mt-24">
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id="est-log"
                          checked={establishedLog}
                          onCheckedChange={(c) => setEstablishedLog(c === true)}
                        />
                        <Label htmlFor="est-log" className="text-xs">Log</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invalid */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-medium">Invalid</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Action</Label>
                      <Select value={invalidAction} onValueChange={setInvalidAction}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {actionOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Log Level</Label>
                      <Select value={invalidLogLevel} onValueChange={setInvalidLogLevel}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {logLevelOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end pb-1">
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id="inv-log"
                          checked={invalidLog}
                          onCheckedChange={(c) => setInvalidLog(c === true)}
                        />
                        <Label htmlFor="inv-log" className="text-xs">Log</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Related */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-medium">Related</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Action</Label>
                      <Select value={relatedAction} onValueChange={setRelatedAction}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {actionOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Log Level</Label>
                      <Select value={relatedLogLevel} onValueChange={setRelatedLogLevel}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {logLevelOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end pb-1">
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id="rel-log"
                          checked={relatedLog}
                          onCheckedChange={(c) => setRelatedLog(c === true)}
                        />
                        <Label htmlFor="rel-log" className="text-xs">Log</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bridged Traffic - Only show if VyOS 1.5+ */}
            {isV15 && (
              <Card id="bridged-traffic">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Bridged Traffic</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm">Apply to IPv4 Bridged Traffic</span>
                    <Checkbox
                      checked={bridgedIpv4}
                      onCheckedChange={(c) => setBridgedIpv4(c === true)}
                    />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Apply to IPv6 Bridged Traffic</span>
                    <Checkbox
                      checked={bridgedIpv6}
                      onCheckedChange={(c) => setBridgedIpv6(c === true)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Connection Timeouts - Only show if VyOS 1.5+ */}
            {isV15 && (
              <Card id="connection-timeouts">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">Connection Timeouts</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-3">
                  {/* General */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">ICMP (sec)</Label>
                      <Input
                        type="number"
                        placeholder="30"
                        value={timeoutIcmp}
                        onChange={(e) => setTimeoutIcmp(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Other (sec)</Label>
                      <Input
                        type="number"
                        placeholder="600"
                        value={timeoutOther}
                        onChange={(e) => setTimeoutOther(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>

                  {/* TCP */}
                  <div className="pt-2 border-t border-border/50">
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">TCP</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Established</Label>
                        <Input type="number" placeholder="432000" value={timeoutTcpEstablished} onChange={(e) => setTimeoutTcpEstablished(e.target.value)} className="h-7 text-xs mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Close</Label>
                        <Input type="number" placeholder="10" value={timeoutTcpClose} onChange={(e) => setTimeoutTcpClose(e.target.value)} className="h-7 text-xs mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Close Wait</Label>
                        <Input type="number" placeholder="60" value={timeoutTcpCloseWait} onChange={(e) => setTimeoutTcpCloseWait(e.target.value)} className="h-7 text-xs mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">FIN Wait</Label>
                        <Input type="number" placeholder="120" value={timeoutTcpFinWait} onChange={(e) => setTimeoutTcpFinWait(e.target.value)} className="h-7 text-xs mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Last ACK</Label>
                        <Input type="number" placeholder="30" value={timeoutTcpLastAck} onChange={(e) => setTimeoutTcpLastAck(e.target.value)} className="h-7 text-xs mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">SYN Recv</Label>
                        <Input type="number" placeholder="60" value={timeoutTcpSynRecv} onChange={(e) => setTimeoutTcpSynRecv(e.target.value)} className="h-7 text-xs mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">SYN Sent</Label>
                        <Input type="number" placeholder="120" value={timeoutTcpSynSent} onChange={(e) => setTimeoutTcpSynSent(e.target.value)} className="h-7 text-xs mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">TIME Wait</Label>
                        <Input type="number" placeholder="120" value={timeoutTcpTimeWait} onChange={(e) => setTimeoutTcpTimeWait(e.target.value)} className="h-7 text-xs mt-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* UDP */}
                  <div className="pt-2 border-t border-border/50">
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">UDP</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Stream</Label>
                        <Input type="number" placeholder="180" value={timeoutUdpStream} onChange={(e) => setTimeoutUdpStream(e.target.value)} className="h-7 text-xs mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Other</Label>
                        <Input type="number" placeholder="30" value={timeoutUdpOther} onChange={(e) => setTimeoutUdpOther(e.target.value)} className="h-7 text-xs mt-0.5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function FirewallGlobalOptionsPage() {
  return (
    <Suspense>
      <FirewallGlobalOptionsPageInner />
    </Suspense>
  );
}
