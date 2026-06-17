"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Eye, EyeOff, Loader2, Plus, Trash2, X } from "lucide-react";
import { wirelessService, type WirelessInterface, type WirelessCapabilitiesResponse, type WpaRadiusServer } from "@/lib/api/wireless";

interface EditWirelessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: WirelessCapabilitiesResponse | null;
  interfaceData: WirelessInterface | null;
}

const WPA_CIPHERS = ["GCMP-256", "GCMP", "CCMP-256", "CCMP", "TKIP"];
const VHT_BEAMFORM_OPTIONS = [
  "multi-user-beamformee",
  "multi-user-beamformer",
  "single-user-beamformee",
  "single-user-beamformer",
];

function TagToggle({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => {
    onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selected.includes(o) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function BadgeArray({ values, onAdd, onRemove, placeholder }: { values: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => { const v = input.trim(); if (v && !values.includes(v)) { onAdd(v); setInput(""); } };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} className="h-8 text-sm" />
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-8 px-2"><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs gap-1 pr-1">
              <code>{v}</code>
              <button type="button" onClick={() => onRemove(v)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function RadiusServerRow({ server, onChange, onRemove }: { server: WpaRadiusServer; onChange: (s: WpaRadiusServer) => void; onRemove: () => void }) {
  const [showKey, setShowKey] = useState(false);
  return (
    <div className="border rounded-md p-3 space-y-2 bg-muted/30">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Server IP</Label>
          <Input value={server.server} onChange={(e) => onChange({ ...server, server: e.target.value })} placeholder="192.168.1.1" className="h-7 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Port</Label>
          <Input value={server.port ?? ""} onChange={(e) => onChange({ ...server, port: e.target.value || null })} placeholder="1812" className="h-7 text-xs" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Shared Secret</Label>
        <div className="flex gap-1">
          <Input type={showKey ? "text" : "password"} value={server.key ?? ""} onChange={(e) => onChange({ ...server, key: e.target.value || null })} placeholder="secret" className="h-7 text-xs" />
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowKey(!showKey)}>
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={server.accounting} onCheckedChange={(v) => onChange({ ...server, accounting: !!v })} className="h-3.5 w-3.5" />Accounting
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={server.disable} onCheckedChange={(v) => onChange({ ...server, disable: !!v })} className="h-3.5 w-3.5" />Disable
          </label>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function EditWirelessModal({ open, onOpenChange, onSuccess, capabilities, interfaceData }: EditWirelessModalProps) {
  const hasBssid = capabilities?.features?.bssid?.supported === true;
  const hasCountryCode = capabilities?.features?.country_code?.supported === true;

  // Basic
  const [wirelessType, setWirelessType] = useState("");
  const [radioMode, setRadioMode] = useState("");
  const [ssid, setSsid] = useState("");
  const [channel, setChannel] = useState("");
  const [physicalDevice, setPhysicalDevice] = useState("");
  const [hwId, setHwId] = useState("");
  const [mac, setMac] = useState("");
  const [description, setDescription] = useState("");
  const [disable, setDisable] = useState(false);
  const [bssid, setBssid] = useState("");
  const [countryCode, setCountryCode] = useState("");

  // AP Settings
  const [disableBroadcastSsid, setDisableBroadcastSsid] = useState(false);
  const [expungeFailingStations, setExpungeFailingStations] = useState(false);
  const [isolateStations, setIsolateStations] = useState(false);
  const [perClientThread, setPerClientThread] = useState(false);
  const [reduceTransmitPower, setReduceTransmitPower] = useState(false);
  const [stationaryAp, setStationaryAp] = useState(false);
  const [enableBfProtection, setEnableBfProtection] = useState(false);
  const [maxStations, setMaxStations] = useState("");
  const [mgmtFrameProtection, setMgmtFrameProtection] = useState("");

  // Security - WPA
  const [wpaMode, setWpaMode] = useState("");
  const [wpaPassphrase, setWpaPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [wpaCiphers, setWpaCiphers] = useState<string[]>([]);
  const [wpaGroupCipher, setWpaGroupCipher] = useState("");
  const [wpaGroupMgmtCipher, setWpaGroupMgmtCipher] = useState("");
  const [wpaRadiusSource, setWpaRadiusSource] = useState("");
  const [wpaRadiusServers, setWpaRadiusServers] = useState<WpaRadiusServer[]>([]);

  // Security - WEP
  const [wepKeys, setWepKeys] = useState<string[]>([]);

  // Security - Station address
  const [stationAddressMode, setStationAddressMode] = useState("");
  const [acceptMacs, setAcceptMacs] = useState<string[]>([]);
  const [denyMacs, setDenyMacs] = useState<string[]>([]);

  // Capabilities - HT
  const [htEnabled, setHtEnabled] = useState(false);
  const [htChannelSetWidth, setHtChannelSetWidth] = useState<string[]>([]);
  const [htShortGi, setHtShortGi] = useState<string[]>([]);
  const [htSmps, setHtSmps] = useState("");
  const [htMaxAmsdu, setHtMaxAmsdu] = useState("");
  const [htStbcRx, setHtStbcRx] = useState("");
  const [ht40MhzIncapable, setHt40MhzIncapable] = useState(false);
  const [htAutoPowersave, setHtAutoPowersave] = useState(false);
  const [htDelayedBlockAck, setHtDelayedBlockAck] = useState(false);
  const [htDssCck40, setHtDssCck40] = useState(false);
  const [htGreenfield, setHtGreenfield] = useState(false);
  const [htLdpc, setHtLdpc] = useState(false);
  const [htLsigProtection, setHtLsigProtection] = useState(false);
  const [htStbcTx, setHtStbcTx] = useState(false);
  const [requireHt, setRequireHt] = useState(false);

  // Capabilities - VHT
  const [vhtEnabled, setVhtEnabled] = useState(false);
  const [vhtChannelSetWidth, setVhtChannelSetWidth] = useState("");
  const [vhtShortGi, setVhtShortGi] = useState<string[]>([]);
  const [vhtBeamform, setVhtBeamform] = useState<string[]>([]);
  const [vhtCenterFreq1, setVhtCenterFreq1] = useState("");
  const [vhtCenterFreq2, setVhtCenterFreq2] = useState("");
  const [vhtAntennaCount, setVhtAntennaCount] = useState("");
  const [vhtMaxMpdu, setVhtMaxMpdu] = useState("");
  const [vhtMaxMpduExp, setVhtMaxMpduExp] = useState("");
  const [vhtLinkAdaptation, setVhtLinkAdaptation] = useState("");
  const [vhtAntennaPatternFixed, setVhtAntennaPatternFixed] = useState(false);
  const [vhtLdpc, setVhtLdpc] = useState(false);
  const [vhtStbcTx, setVhtStbcTx] = useState(false);
  const [vhtTxPowersave, setVhtTxPowersave] = useState(false);
  const [vhtCf, setVhtCf] = useState(false);
  const [vhtStbcRx, setVhtStbcRx] = useState("");
  const [requireVht, setRequireVht] = useState(false);

  // Capabilities - HE
  const [heEnabled, setHeEnabled] = useState(false);
  const [heChannelSetWidth, setHeChannelSetWidth] = useState("");
  const [heCodingScheme, setHeCodingScheme] = useState("");
  const [heBssColor, setHeBssColor] = useState("");
  const [heCenterFreq1, setHeCenterFreq1] = useState("");
  const [heCenterFreq2, setHeCenterFreq2] = useState("");
  const [heBeamformMultiUser, setHeBeamformMultiUser] = useState(false);
  const [heBeamformSuBeamformee, setHeBeamformSuBeamformee] = useState(false);
  const [heBeamformSuBeamformer, setHeBeamformSuBeamformer] = useState(false);
  const [heAntennaPatternFixed, setHeAntennaPatternFixed] = useState(false);
  const [requireHe, setRequireHe] = useState(false);

  // Addresses & Network
  const [addresses, setAddresses] = useState<string[]>([]);
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");

  // Advanced
  const [ipSourceValidation, setIpSourceValidation] = useState("");
  const [ipArpCacheTimeout, setIpArpCacheTimeout] = useState("");
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipEnableProxyArp, setIpEnableProxyArp] = useState(false);
  const [ipv6Eui64, setIpv6Eui64] = useState<string[]>([]);
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6NoDefaultLinkLocal, setIpv6NoDefaultLinkLocal] = useState(false);
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!interfaceData) return;
    const d = interfaceData;
    const sec = d.security;
    const wpa = sec?.wpa;
    const cap = d.capabilities;
    const ht = cap?.ht;
    const vht = cap?.vht;
    const he = cap?.he;

    setWirelessType(d.wireless_type ?? "");
    setRadioMode(d.mode ?? "");
    setSsid(d.ssid ?? "");
    setChannel(d.channel ?? "");
    setPhysicalDevice(d.physical_device ?? "");
    setHwId(d.hw_id ?? "");
    setMac(d.mac ?? "");
    setDescription(d.description ?? "");
    setDisable(d.disable ?? false);
    setBssid(d.bssid ?? "");
    setCountryCode(d.country_code ?? "");

    setDisableBroadcastSsid(d.disable_broadcast_ssid ?? false);
    setExpungeFailingStations(d.expunge_failing_stations ?? false);
    setIsolateStations(d.isolate_stations ?? false);
    setPerClientThread(d.per_client_thread ?? false);
    setReduceTransmitPower(d.reduce_transmit_power ?? false);
    setStationaryAp(d.stationary_ap ?? false);
    setEnableBfProtection(d.enable_bf_protection ?? false);
    setMaxStations(d.max_stations ?? "");
    setMgmtFrameProtection(d.mgmt_frame_protection ?? "");

    setWpaMode(wpa?.mode ?? "");
    setWpaPassphrase(wpa?.passphrase ?? "");
    setWpaCiphers(wpa?.cipher ?? []);
    setWpaGroupCipher(wpa?.group_cipher ?? "");
    setWpaGroupMgmtCipher(wpa?.group_mgmt_cipher ?? "");
    setWpaRadiusSource(wpa?.radius_source_address ?? "");
    setWpaRadiusServers(wpa?.radius_servers ?? []);
    setWepKeys(sec?.wep?.key ?? []);
    setStationAddressMode(sec?.station_address?.mode ?? "");
    setAcceptMacs(sec?.station_address?.accept_mac ?? []);
    setDenyMacs(sec?.station_address?.deny_mac ?? []);

    const hasHt = !!ht;
    setHtEnabled(hasHt);
    setHtChannelSetWidth(ht?.channel_set_width ?? []);
    setHtShortGi(ht?.short_gi ?? []);
    setHtSmps(ht?.smps ?? "");
    setHtMaxAmsdu(ht?.max_amsdu ?? "");
    setHtStbcRx(ht?.stbc_rx ?? "");
    setHt40MhzIncapable(ht?.mhz_incapable_40 ?? false);
    setHtAutoPowersave(ht?.auto_powersave ?? false);
    setHtDelayedBlockAck(ht?.delayed_block_ack ?? false);
    setHtDssCck40(ht?.dsss_cck_40 ?? false);
    setHtGreenfield(ht?.greenfield ?? false);
    setHtLdpc(ht?.ldpc ?? false);
    setHtLsigProtection(ht?.lsig_protection ?? false);
    setHtStbcTx(ht?.stbc_tx ?? false);
    setRequireHt(cap?.require_ht ?? false);

    const hasVht = !!vht;
    setVhtEnabled(hasVht);
    setVhtChannelSetWidth(vht?.channel_set_width ?? "");
    setVhtShortGi(vht?.short_gi ?? []);
    setVhtBeamform(vht?.beamform ?? []);
    setVhtCenterFreq1(vht?.center_channel_freq_1 ?? "");
    setVhtCenterFreq2(vht?.center_channel_freq_2 ?? "");
    setVhtAntennaCount(vht?.antenna_count ?? "");
    setVhtMaxMpdu(vht?.max_mpdu ?? "");
    setVhtMaxMpduExp(vht?.max_mpdu_exp ?? "");
    setVhtLinkAdaptation(vht?.link_adaptation ?? "");
    setVhtAntennaPatternFixed(vht?.antenna_pattern_fixed ?? false);
    setVhtLdpc(vht?.ldpc ?? false);
    setVhtStbcTx(vht?.stbc_tx ?? false);
    setVhtTxPowersave(vht?.tx_powersave ?? false);
    setVhtCf(vht?.vht_cf ?? false);
    setVhtStbcRx(vht?.stbc_rx ?? "");
    setRequireVht(cap?.require_vht ?? false);

    const hasHe = !!he;
    setHeEnabled(hasHe);
    setHeChannelSetWidth(he?.channel_set_width ?? "");
    setHeCodingScheme(he?.coding_scheme ?? "");
    setHeBssColor(he?.bss_color ?? "");
    setHeCenterFreq1(he?.center_channel_freq_1 ?? "");
    setHeCenterFreq2(he?.center_channel_freq_2 ?? "");
    setHeBeamformMultiUser(he?.beamform?.multi_user_beamformer ?? false);
    setHeBeamformSuBeamformee(he?.beamform?.single_user_beamformee ?? false);
    setHeBeamformSuBeamformer(he?.beamform?.single_user_beamformer ?? false);
    setHeAntennaPatternFixed(he?.antenna_pattern_fixed ?? false);
    setRequireHe(cap?.require_he ?? false);

    setAddresses(d.addresses ?? []);
    setMtu(d.mtu ?? "");
    setVrf(d.vrf ?? "");

    setIpSourceValidation(d.ip_source_validation ?? "");
    setIpArpCacheTimeout(d.ip_arp_cache_timeout ?? "");
    setIpDisableForwarding(d.ip_disable_forwarding ?? false);
    setIpEnableProxyArp(d.ip_enable_proxy_arp ?? false);
    setIpv6Eui64(d.ipv6_address_eui64 ?? []);
    setIpv6DisableForwarding(d.ipv6_disable_forwarding ?? false);
    setIpv6NoDefaultLinkLocal(d.ipv6_address_no_default_link_local ?? false);
    setMirrorIngress(d.mirror_ingress ?? "");
    setMirrorEgress(d.mirror_egress ?? "");
    setRedirect(d.redirect ?? "");
    setError(null);
  }, [interfaceData, open]);

  const handleSubmit = async () => {
    if (!interfaceData) return;
    setLoading(true);
    setError(null);
    try {
      const result = await wirelessService.updateInterface(interfaceData.name, interfaceData, {
        wireless_type: wirelessType || null,
        mode: radioMode || null,
        ssid: ssid || null,
        channel: channel || null,
        description: description || null,
        disable,
        mac: mac || null,
        hw_id: hwId || null,
        physical_device: physicalDevice || null,
        vrf: vrf || null,
        mtu: mtu || null,
        addresses,
        disable_broadcast_ssid: disableBroadcastSsid,
        expunge_failing_stations: expungeFailingStations,
        isolate_stations: isolateStations,
        per_client_thread: perClientThread,
        reduce_transmit_power: reduceTransmitPower,
        stationary_ap: stationaryAp,
        enable_bf_protection: enableBfProtection,
        max_stations: maxStations || null,
        mgmt_frame_protection: mgmtFrameProtection || null,
        wpa_mode: wpaMode || null,
        wpa_passphrase: wpaPassphrase || null,
        wpa_ciphers: wpaCiphers,
        wpa_group_cipher: wpaGroupCipher || null,
        wpa_group_mgmt_cipher: wpaGroupMgmtCipher || null,
        wpa_radius_source_address: wpaRadiusSource || null,
        wpa_radius_servers: wpaRadiusServers,
        wep_keys: wepKeys,
        station_address_mode: stationAddressMode || null,
        station_accept_macs: acceptMacs,
        station_deny_macs: denyMacs,
        ht_channel_set_width: htEnabled ? htChannelSetWidth : [],
        ht_short_gi: htEnabled ? htShortGi : [],
        ht_smps: htEnabled ? (htSmps || null) : null,
        ht_max_amsdu: htEnabled ? (htMaxAmsdu || null) : null,
        ht_stbc_rx: htEnabled ? (htStbcRx || null) : null,
        ht_mhz_incapable_40: htEnabled ? ht40MhzIncapable : false,
        ht_auto_powersave: htEnabled ? htAutoPowersave : false,
        ht_delayed_block_ack: htEnabled ? htDelayedBlockAck : false,
        ht_dsss_cck_40: htEnabled ? htDssCck40 : false,
        ht_greenfield: htEnabled ? htGreenfield : false,
        ht_ldpc: htEnabled ? htLdpc : false,
        ht_lsig_protection: htEnabled ? htLsigProtection : false,
        ht_stbc_tx: htEnabled ? htStbcTx : false,
        require_ht: htEnabled ? requireHt : false,
        vht_channel_set_width: vhtEnabled ? (vhtChannelSetWidth || null) : null,
        vht_short_gi: vhtEnabled ? vhtShortGi : [],
        vht_beamform: vhtEnabled ? vhtBeamform : [],
        vht_center_channel_freq_1: vhtEnabled ? (vhtCenterFreq1 || null) : null,
        vht_center_channel_freq_2: vhtEnabled ? (vhtCenterFreq2 || null) : null,
        vht_antenna_count: vhtEnabled ? (vhtAntennaCount || null) : null,
        vht_max_mpdu: vhtEnabled ? (vhtMaxMpdu || null) : null,
        vht_max_mpdu_exp: vhtEnabled ? (vhtMaxMpduExp || null) : null,
        vht_link_adaptation: vhtEnabled ? (vhtLinkAdaptation || null) : null,
        vht_antenna_pattern_fixed: vhtEnabled ? vhtAntennaPatternFixed : false,
        vht_ldpc: vhtEnabled ? vhtLdpc : false,
        vht_stbc_tx: vhtEnabled ? vhtStbcTx : false,
        vht_tx_powersave: vhtEnabled ? vhtTxPowersave : false,
        vht_cf: vhtEnabled ? vhtCf : false,
        vht_stbc_rx: vhtEnabled ? (vhtStbcRx || null) : null,
        require_vht: vhtEnabled ? requireVht : false,
        he_channel_set_width: heEnabled ? (heChannelSetWidth || null) : null,
        he_coding_scheme: heEnabled ? (heCodingScheme || null) : null,
        he_bss_color: heEnabled ? (heBssColor || null) : null,
        he_center_channel_freq_1: heEnabled ? (heCenterFreq1 || null) : null,
        he_center_channel_freq_2: heEnabled ? (heCenterFreq2 || null) : null,
        he_beamform_multi_user: heEnabled ? heBeamformMultiUser : false,
        he_beamform_su_beamformee: heEnabled ? heBeamformSuBeamformee : false,
        he_beamform_su_beamformer: heEnabled ? heBeamformSuBeamformer : false,
        he_antenna_pattern_fixed: heEnabled ? heAntennaPatternFixed : false,
        require_he: heEnabled ? requireHe : false,
        ip_source_validation: ipSourceValidation || null,
        ip_arp_cache_timeout: ipArpCacheTimeout || null,
        ip_disable_forwarding: ipDisableForwarding,
        ip_enable_proxy_arp: ipEnableProxyArp,
        ipv6_address_eui64: ipv6Eui64,
        ipv6_disable_forwarding: ipv6DisableForwarding,
        ipv6_address_no_default_link_local: ipv6NoDefaultLinkLocal,
        mirror_ingress: mirrorIngress || null,
        mirror_egress: mirrorEgress || null,
        redirect: redirect || null,
        country_code: countryCode || null,
        bssid: bssid || null,
      });
      if (!result.success) { setError(result.error ?? "Update failed"); return; }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) { setError(null); onOpenChange(o); } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Wireless Interface — <code className="font-mono">{interfaceData?.name}</code></DialogTitle>
          <DialogDescription>Modify the configuration of this wireless interface.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-6 mb-4">
              <TabsTrigger value="basic" className="text-xs px-1">Basic</TabsTrigger>
              <TabsTrigger value="ap" className="text-xs px-1">AP</TabsTrigger>
              <TabsTrigger value="security" className="text-xs px-1">Security</TabsTrigger>
              <TabsTrigger value="capabilities" className="text-xs px-1">Capabilities</TabsTrigger>
              <TabsTrigger value="addresses" className="text-xs px-1">Addresses</TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs px-1">Advanced</TabsTrigger>
            </TabsList>

            {/* ── Basic ── */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Wireless Type</Label>
                  <Select value={wirelessType} onValueChange={setWirelessType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="access-point">Access Point</SelectItem>
                      <SelectItem value="station">Station (Client)</SelectItem>
                      <SelectItem value="monitor">Monitor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Radio Mode</Label>
                  <Select value={radioMode} onValueChange={setRadioMode}>
                    <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">a (5 GHz, 802.11a)</SelectItem>
                      <SelectItem value="b">b (2.4 GHz, 802.11b)</SelectItem>
                      <SelectItem value="g">g (2.4 GHz, 802.11g)</SelectItem>
                      <SelectItem value="n">n (802.11n / HT)</SelectItem>
                      <SelectItem value="ac">ac (802.11ac / VHT)</SelectItem>
                      <SelectItem value="ax">ax (802.11ax / HE / WiFi 6)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>SSID</Label>
                  <Input value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="MyNetwork" />
                </div>
                <div className="space-y-1.5">
                  <Label>Channel</Label>
                  <Input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="0 = ACS (auto)" />
                </div>
                <div className="space-y-1.5">
                  <Label>Physical Device</Label>
                  <Input value={physicalDevice} onChange={(e) => setPhysicalDevice(e.target.value)} placeholder="phy0" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>Hardware ID (MAC)</Label>
                  <Input value={hwId} onChange={(e) => setHwId(e.target.value)} placeholder="aa:bb:cc:dd:ee:ff" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>MAC Override</Label>
                  <Input value={mac} onChange={(e) => setMac(e.target.value)} placeholder="aa:bb:cc:dd:ee:ff" className="font-mono" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
              {hasBssid && (
                <div className="space-y-1.5">
                  <Label>BSSID</Label>
                  <Input value={bssid} onChange={(e) => setBssid(e.target.value)} placeholder="aa:bb:cc:dd:ee:ff" className="font-mono" />
                </div>
              )}
              {hasCountryCode && (
                <div className="space-y-1.5">
                  <Label>Country Code</Label>
                  <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} placeholder="US" maxLength={2} className="w-24 font-mono uppercase" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox id="disable-edit" checked={disable} onCheckedChange={(v) => setDisable(!!v)} />
                <label htmlFor="disable-edit" className="text-sm cursor-pointer">Administratively disable this interface</label>
              </div>
            </TabsContent>

            {/* ── AP Settings ── */}
            <TabsContent value="ap" className="space-y-4">
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">Most of these settings apply to access-point mode only.</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { id: "dbs-e", label: "Disable Broadcast SSID", val: disableBroadcastSsid, set: setDisableBroadcastSsid },
                  { id: "efs-e", label: "Expunge Failing Stations", val: expungeFailingStations, set: setExpungeFailingStations },
                  { id: "iso-e", label: "Isolate Stations", val: isolateStations, set: setIsolateStations },
                  { id: "pct-e", label: "Per-Client Thread", val: perClientThread, set: setPerClientThread },
                  { id: "rtp-e", label: "Reduce Transmit Power", val: reduceTransmitPower, set: setReduceTransmitPower },
                  { id: "sap-e", label: "Stationary AP", val: stationaryAp, set: setStationaryAp },
                  { id: "ebp-e", label: "Enable Beacon Frame Protection", val: enableBfProtection, set: setEnableBfProtection },
                ].map(({ id, label, val, set }) => (
                  <label key={id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox id={id} checked={val} onCheckedChange={(v) => set(!!v)} />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Max Stations</Label>
                  <Input type="number" value={maxStations} onChange={(e) => setMaxStations(e.target.value)} placeholder="e.g. 50" min={0} max={2007} />
                </div>
                <div className="space-y-1.5">
                  <Label>Management Frame Protection</Label>
                  <Select value={mgmtFrameProtection} onValueChange={setMgmtFrameProtection}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                      <SelectItem value="required">Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* ── Security ── */}
            <TabsContent value="security" className="space-y-5">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">WPA / WPA2 / WPA3</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>WPA Mode</Label>
                    <Select value={wpaMode} onValueChange={setWpaMode}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wpa">WPA</SelectItem>
                        <SelectItem value="wpa2">WPA2</SelectItem>
                        <SelectItem value="wpa+wpa2">WPA + WPA2</SelectItem>
                        <SelectItem value="wpa3">WPA3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Passphrase</Label>
                    <div className="flex gap-1">
                      <Input type={showPassphrase ? "text" : "password"} value={wpaPassphrase} onChange={(e) => setWpaPassphrase(e.target.value)} placeholder="8-63 characters" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassphrase(!showPassphrase)}>
                        {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Ciphers</Label>
                  <TagToggle options={WPA_CIPHERS} selected={wpaCiphers} onChange={setWpaCiphers} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Group Cipher</Label>
                    <Select value={wpaGroupCipher} onValueChange={setWpaGroupCipher}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {WPA_CIPHERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Group Management Cipher</Label>
                    <Select value={wpaGroupMgmtCipher} onValueChange={setWpaGroupMgmtCipher}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AES-128-CMAC">AES-128-CMAC</SelectItem>
                        <SelectItem value="BIP-CMAC-256">BIP-CMAC-256</SelectItem>
                        <SelectItem value="BIP-GMAC-128">BIP-GMAC-128</SelectItem>
                        <SelectItem value="BIP-GMAC-256">BIP-GMAC-256</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>RADIUS Source Address</Label>
                  <Input value={wpaRadiusSource} onChange={(e) => setWpaRadiusSource(e.target.value)} placeholder="192.168.1.1" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>RADIUS Servers</Label>
                    <Button type="button" variant="outline" size="sm" className="h-7 gap-1" onClick={() => setWpaRadiusServers([...wpaRadiusServers, { server: "", key: null, port: null, accounting: false, disable: false }])}>
                      <Plus className="h-3.5 w-3.5" /> Add Server
                    </Button>
                  </div>
                  {wpaRadiusServers.map((srv, i) => (
                    <RadiusServerRow key={i} server={srv} onChange={(s) => { const arr = [...wpaRadiusServers]; arr[i] = s; setWpaRadiusServers(arr); }} onRemove={() => setWpaRadiusServers(wpaRadiusServers.filter((_, j) => j !== i))} />
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-amber-600">WEP (Legacy)</h4>
                <div className="space-y-1.5">
                  <Label>WEP Keys</Label>
                  <BadgeArray values={wepKeys} onAdd={(v) => setWepKeys([...wepKeys, v])} onRemove={(v) => setWepKeys(wepKeys.filter((k) => k !== v))} placeholder="Add WEP key…" />
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Station Address Filter</h4>
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select value={stationAddressMode} onValueChange={setStationAddressMode}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accept">Accept (allowlist)</SelectItem>
                      <SelectItem value="deny">Deny (blocklist)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Accept MAC Addresses</Label>
                  <BadgeArray values={acceptMacs} onAdd={(v) => setAcceptMacs([...acceptMacs, v])} onRemove={(v) => setAcceptMacs(acceptMacs.filter((m) => m !== v))} placeholder="aa:bb:cc:dd:ee:ff" />
                </div>
                <div className="space-y-1.5">
                  <Label>Deny MAC Addresses</Label>
                  <BadgeArray values={denyMacs} onAdd={(v) => setDenyMacs([...denyMacs, v])} onRemove={(v) => setDenyMacs(denyMacs.filter((m) => m !== v))} placeholder="aa:bb:cc:dd:ee:ff" />
                </div>
              </div>
            </TabsContent>

            {/* ── Capabilities ── */}
            <TabsContent value="capabilities" className="space-y-5">
              {/* HT */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={htEnabled} onCheckedChange={(v) => setHtEnabled(!!v)} />
                  <span className="text-sm font-semibold">HT (802.11n) Capabilities</span>
                </label>
                {htEnabled && (
                  <div className="pl-6 space-y-3 border-l-2 border-muted">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Channel Set Width</Label>
                      <TagToggle options={["ht20", "ht40+", "ht40-"]} selected={htChannelSetWidth} onChange={setHtChannelSetWidth} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Short GI</Label>
                      <TagToggle options={["20", "40"]} selected={htShortGi} onChange={setHtShortGi} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">SMPS</Label>
                        <Select value={htSmps} onValueChange={setHtSmps}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="static">Static</SelectItem>
                            <SelectItem value="dynamic">Dynamic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max A-MSDU</Label>
                        <Select value={htMaxAmsdu} onValueChange={setHtMaxAmsdu}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3839">3839 bytes</SelectItem>
                            <SelectItem value="7935">7935 bytes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">STBC RX Streams</Label>
                        <Input type="number" value={htStbcRx} onChange={(e) => setHtStbcRx(e.target.value)} className="h-8" min={1} max={3} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "ht-40inc-e", label: "40MHz Incapable", val: ht40MhzIncapable, set: setHt40MhzIncapable },
                        { id: "ht-aps-e", label: "Auto Powersave", val: htAutoPowersave, set: setHtAutoPowersave },
                        { id: "ht-dba-e", label: "Delayed Block ACK", val: htDelayedBlockAck, set: setHtDelayedBlockAck },
                        { id: "ht-dsscck-e", label: "DSSS/CCK-40", val: htDssCck40, set: setHtDssCck40 },
                        { id: "ht-gf-e", label: "Greenfield", val: htGreenfield, set: setHtGreenfield },
                        { id: "ht-ldpc-e", label: "LDPC", val: htLdpc, set: setHtLdpc },
                        { id: "ht-lsig-e", label: "L-SIG Protection", val: htLsigProtection, set: setHtLsigProtection },
                        { id: "ht-stbctx-e", label: "STBC TX", val: htStbcTx, set: setHtStbcTx },
                      ].map(({ id, label, val, set }) => (
                        <label key={id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox checked={val} onCheckedChange={(v) => set(!!v)} className="h-3.5 w-3.5" />{label}
                        </label>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer font-medium">
                      <Checkbox checked={requireHt} onCheckedChange={(v) => setRequireHt(!!v)} className="h-3.5 w-3.5" />Require HT (reject non-HT clients)
                    </label>
                  </div>
                )}
              </div>
              <Separator />
              {/* VHT */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={vhtEnabled} onCheckedChange={(v) => setVhtEnabled(!!v)} />
                  <span className="text-sm font-semibold">VHT (802.11ac) Capabilities</span>
                </label>
                {vhtEnabled && (
                  <div className="pl-6 space-y-3 border-l-2 border-muted">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Channel Set Width</Label>
                        <Select value={vhtChannelSetWidth} onValueChange={setVhtChannelSetWidth}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0 — 20/40 MHz</SelectItem>
                            <SelectItem value="1">1 — 80 MHz</SelectItem>
                            <SelectItem value="2">2 — 160 MHz</SelectItem>
                            <SelectItem value="3">3 — 80+80 MHz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Link Adaptation</Label>
                        <Select value={vhtLinkAdaptation} onValueChange={setVhtLinkAdaptation}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unsolicited">Unsolicited</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Short GI</Label>
                      <TagToggle options={["80", "160"]} selected={vhtShortGi} onChange={setVhtShortGi} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Beamform</Label>
                      <TagToggle options={VHT_BEAMFORM_OPTIONS} selected={vhtBeamform} onChange={setVhtBeamform} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Max MPDU</Label>
                        <Select value={vhtMaxMpdu} onValueChange={setVhtMaxMpdu}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7991">7991</SelectItem>
                            <SelectItem value="11454">11454</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max MPDU Exponent</Label>
                        <Input type="number" value={vhtMaxMpduExp} onChange={(e) => setVhtMaxMpduExp(e.target.value)} className="h-8" min={0} max={7} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Antenna Count</Label>
                        <Input type="number" value={vhtAntennaCount} onChange={(e) => setVhtAntennaCount(e.target.value)} className="h-8" min={1} max={8} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Center Freq 1</Label>
                        <Input type="number" value={vhtCenterFreq1} onChange={(e) => setVhtCenterFreq1(e.target.value)} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Center Freq 2</Label>
                        <Input type="number" value={vhtCenterFreq2} onChange={(e) => setVhtCenterFreq2(e.target.value)} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">STBC RX Streams</Label>
                        <Input type="number" value={vhtStbcRx} onChange={(e) => setVhtStbcRx(e.target.value)} className="h-8" min={1} max={4} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "vht-apf-e", label: "Antenna Pattern Fixed", val: vhtAntennaPatternFixed, set: setVhtAntennaPatternFixed },
                        { id: "vht-ldpc-e", label: "LDPC", val: vhtLdpc, set: setVhtLdpc },
                        { id: "vht-stbctx-e", label: "STBC TX", val: vhtStbcTx, set: setVhtStbcTx },
                        { id: "vht-txps-e", label: "TX Powersave", val: vhtTxPowersave, set: setVhtTxPowersave },
                        { id: "vht-cf-e", label: "VHT-CF", val: vhtCf, set: setVhtCf },
                      ].map(({ id, label, val, set }) => (
                        <label key={id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox checked={val} onCheckedChange={(v) => set(!!v)} className="h-3.5 w-3.5" />{label}
                        </label>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer font-medium">
                      <Checkbox checked={requireVht} onCheckedChange={(v) => setRequireVht(!!v)} className="h-3.5 w-3.5" />Require VHT (reject non-VHT clients)
                    </label>
                  </div>
                )}
              </div>
              <Separator />
              {/* HE */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={heEnabled} onCheckedChange={(v) => setHeEnabled(!!v)} />
                  <span className="text-sm font-semibold">HE (802.11ax / WiFi 6) Capabilities</span>
                </label>
                {heEnabled && (
                  <div className="pl-6 space-y-3 border-l-2 border-muted">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Channel Set Width</Label>
                        <Select value={heChannelSetWidth} onValueChange={setHeChannelSetWidth}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="81">81 — 20 MHz (2.4G)</SelectItem>
                            <SelectItem value="83">83 — 40 MHz lower (2.4G)</SelectItem>
                            <SelectItem value="84">84 — 40 MHz upper (2.4G)</SelectItem>
                            <SelectItem value="131">131 — 80 MHz (5G)</SelectItem>
                            <SelectItem value="132">132 — 80 MHz (5G)</SelectItem>
                            <SelectItem value="133">133 — 160 MHz (5G)</SelectItem>
                            <SelectItem value="134">134 — 160 MHz (5G)</SelectItem>
                            <SelectItem value="135">135 — 80+80 MHz (5G)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Coding Scheme</Label>
                        <Select value={heCodingScheme} onValueChange={setHeCodingScheme}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0 — HE-MCS 0-7</SelectItem>
                            <SelectItem value="1">1 — HE-MCS 0-9</SelectItem>
                            <SelectItem value="2">2 — HE-MCS 0-11</SelectItem>
                            <SelectItem value="3">3 — Not supported</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">BSS Color (1-63)</Label>
                        <Input type="number" value={heBssColor} onChange={(e) => setHeBssColor(e.target.value)} className="h-8" min={1} max={63} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Center Freq 1</Label>
                        <Input type="number" value={heCenterFreq1} onChange={(e) => setHeCenterFreq1(e.target.value)} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Center Freq 2</Label>
                        <Input type="number" value={heCenterFreq2} onChange={(e) => setHeCenterFreq2(e.target.value)} className="h-8" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Beamform</Label>
                      {[
                        { id: "he-mu-e", label: "Multi-User Beamformer", val: heBeamformMultiUser, set: setHeBeamformMultiUser },
                        { id: "he-subee-e", label: "Single-User Beamformee", val: heBeamformSuBeamformee, set: setHeBeamformSuBeamformee },
                        { id: "he-suber-e", label: "Single-User Beamformer", val: heBeamformSuBeamformer, set: setHeBeamformSuBeamformer },
                        { id: "he-apf-e", label: "Antenna Pattern Fixed", val: heAntennaPatternFixed, set: setHeAntennaPatternFixed },
                      ].map(({ id, label, val, set }) => (
                        <label key={id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox checked={val} onCheckedChange={(v) => set(!!v)} className="h-3.5 w-3.5" />{label}
                        </label>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer font-medium">
                      <Checkbox checked={requireHe} onCheckedChange={(v) => setRequireHe(!!v)} className="h-3.5 w-3.5" />Require HE (reject non-HE clients)
                    </label>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Addresses ── */}
            <TabsContent value="addresses" className="space-y-4">
              <div className="space-y-1.5">
                <Label>IP Addresses</Label>
                <BadgeArray values={addresses} onAdd={(v) => setAddresses([...addresses, v])} onRemove={(v) => setAddresses(addresses.filter((a) => a !== v))} placeholder="192.168.1.1/24 or dhcp" />
                <p className="text-xs text-muted-foreground">CIDR notation, or use &apos;dhcp&apos; / &apos;dhcpv6&apos;</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>MTU</Label>
                  <Input type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1500" min={68} max={9000} />
                </div>
                <div className="space-y-1.5">
                  <Label>VRF</Label>
                  <VrfSelect value={vrf} onValueChange={setVrf} className="font-mono" />
                </div>
              </div>
            </TabsContent>

            {/* ── Advanced ── */}
            <TabsContent value="advanced" className="space-y-5">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">IP Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Source Validation</Label>
                    <Select value={ipSourceValidation} onValueChange={setIpSourceValidation}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strict">Strict</SelectItem>
                        <SelectItem value="loose">Loose</SelectItem>
                        <SelectItem value="disable">Disable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>ARP Cache Timeout (ms)</Label>
                    <Input type="number" value={ipArpCacheTimeout} onChange={(e) => setIpArpCacheTimeout(e.target.value)} placeholder="30000" />
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={ipDisableForwarding} onCheckedChange={(v) => setIpDisableForwarding(!!v)} />Disable IPv4 Forwarding
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={ipEnableProxyArp} onCheckedChange={(v) => setIpEnableProxyArp(!!v)} />Enable Proxy ARP
                  </label>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">IPv6 Settings</h4>
                <div className="space-y-1.5">
                  <Label>EUI-64 Prefixes</Label>
                  <BadgeArray values={ipv6Eui64} onAdd={(v) => setIpv6Eui64([...ipv6Eui64, v])} onRemove={(v) => setIpv6Eui64(ipv6Eui64.filter((p) => p !== v))} placeholder="2001:db8::/64" />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={ipv6DisableForwarding} onCheckedChange={(v) => setIpv6DisableForwarding(!!v)} />Disable IPv6 Forwarding
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={ipv6NoDefaultLinkLocal} onCheckedChange={(v) => setIpv6NoDefaultLinkLocal(!!v)} />No Default Link-Local
                  </label>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Mirror / Redirect</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Mirror Ingress</Label>
                    <Input value={mirrorIngress} onChange={(e) => setMirrorIngress(e.target.value)} placeholder="eth0" className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mirror Egress</Label>
                    <Input value={mirrorEgress} onChange={(e) => setMirrorEgress(e.target.value)} placeholder="eth0" className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Redirect</Label>
                    <Input value={redirect} onChange={(e) => setRedirect(e.target.value)} placeholder="ifb0" className="font-mono" />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2 mx-1">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
