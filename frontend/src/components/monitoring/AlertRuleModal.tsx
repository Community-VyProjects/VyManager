"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bell, Send, CheckCircle2, XCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  monitoringService,
  type AlertRule,
  type AlertType,
  type AlertSeverity,
  type CreateAlertRuleRequest,
} from "@/lib/api/monitoring";
import { useToast } from "@/hooks/useToast";

interface AlertRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: AlertRule | null;
  onSuccess: () => void;
}

const ALERT_TYPES: { value: AlertType; label: string; description: string }[] = [
  {
    value: "INTERFACE_DOWN",
    label: "Interface Down",
    description: "Alert when a specific interface goes down",
  },
  {
    value: "HIGH_CPU",
    label: "High CPU Usage",
    description: "Alert when CPU usage exceeds threshold",
  },
  {
    value: "HIGH_MEMORY",
    label: "High Memory Usage",
    description: "Alert when memory usage exceeds threshold",
  },
  {
    value: "HIGH_DISK",
    label: "High Disk Usage",
    description: "Alert when disk usage exceeds threshold",
  },
  {
    value: "CONNECTION_THRESHOLD",
    label: "Connection Threshold",
    description: "Alert when conntrack connections exceed threshold",
  },
  {
    value: "INTERFACE_ERRORS",
    label: "Interface Errors",
    description: "Alert when interface errors exceed threshold",
  },
  {
    value: "BGP_NEIGHBOR_DOWN",
    label: "BGP Neighbor Down",
    description: "Alert when a BGP neighbor session goes down",
  },
  {
    value: "IPSEC_TUNNEL_DOWN",
    label: "IPsec Tunnel Down",
    description: "Alert when an IPsec tunnel connection goes down",
  },
  {
    value: "OPENVPN_TUNNEL_DOWN",
    label: "OpenVPN Tunnel Down",
    description: "Alert when an OpenVPN tunnel connection goes down",
  },
  {
    value: "WIREGUARD_PEER_DOWN",
    label: "WireGuard Peer Down",
    description: "Alert when a WireGuard peer becomes unreachable",
  },
  {
    value: "VRRP_STATE_CHANGE",
    label: "VRRP State Change",
    description: "Alert when VRRP group state changes (MASTER/BACKUP/FAULT)",
  },
  {
    value: "VRRP_FAILOVER",
    label: "VRRP Failover",
    description: "Alert when a VRRP failover event occurs",
  },
];

const SEVERITIES: AlertSeverity[] = ["INFO", "WARNING", "CRITICAL"];

export function AlertRuleModal({
  open,
  onOpenChange,
  rule,
  onSuccess,
}: AlertRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<AlertType>("HIGH_CPU");
  const [severity, setSeverity] = useState<AlertSeverity>("WARNING");
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState("300");
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  // Condition fields (dynamic based on type)
  const [threshold, setThreshold] = useState("90");
  const [interfaceName, setInterfaceName] = useState("");
  const [duration, setDuration] = useState("60");
  const [neighborAddress, setNeighborAddress] = useState("");
  // VPN condition fields
  const [ipsecPeer, setIpsecPeer] = useState("");
  const [ipsecTunnel, setIpsecTunnel] = useState("");
  const [openvpnInterface, setOpenvpnInterface] = useState("");
  const [wireguardInterface, setWireguardInterface] = useState("");
  const [wireguardPeer, setWireguardPeer] = useState("");
  // VRRP condition fields
  const [vrrpGroup, setVrrpGroup] = useState("");
  const [vrrpStateFilter, setVrrpStateFilter] = useState(""); // MASTER, BACKUP, FAULT, or empty for any

  const isEditing = rule !== null;

  useEffect(() => {
    if (open) {
      if (rule) {
        // Editing existing rule
        setName(rule.name);
        setDescription(rule.description ?? "");
        setType(rule.type);
        setSeverity(rule.severity);
        setNotifyInApp(rule.notifyInApp);
        setWebhookUrl(rule.webhookUrl ?? "");
        setTelegramChatId(rule.telegramChatId ?? "");
        setTelegramBotToken(""); // Never prefill token for security
        setCooldownSeconds(String(rule.cooldownSeconds ?? 300));

        // Parse conditions
        const conditions = rule.conditions as Record<string, unknown>;
        if (conditions.threshold) setThreshold(String(conditions.threshold));
        if (conditions.interface) setInterfaceName(String(conditions.interface));
        if (conditions.duration) setDuration(String(conditions.duration));
        if (conditions.neighbor) setNeighborAddress(String(conditions.neighbor));
        // VPN conditions
        if (conditions.peer) setIpsecPeer(String(conditions.peer));
        if (conditions.tunnel) setIpsecTunnel(String(conditions.tunnel));
        if (conditions.openvpn_interface) setOpenvpnInterface(String(conditions.openvpn_interface));
        if (conditions.wireguard_interface) setWireguardInterface(String(conditions.wireguard_interface));
        if (conditions.wireguard_peer) setWireguardPeer(String(conditions.wireguard_peer));
        // VRRP conditions
        if (conditions.vrrp_group) setVrrpGroup(String(conditions.vrrp_group));
        if (conditions.vrrp_state) setVrrpStateFilter(String(conditions.vrrp_state));
      } else {
        // Creating new rule
        setName("");
        setDescription("");
        setType("HIGH_CPU");
        setSeverity("WARNING");
        setNotifyInApp(true);
        setWebhookUrl("");
        setTelegramChatId("");
        setTelegramBotToken("");
        setCooldownSeconds("300");
        setThreshold("90");
        setInterfaceName("");
        setDuration("60");
        setNeighborAddress("");
        // Reset VPN conditions
        setIpsecPeer("");
        setIpsecTunnel("");
        setOpenvpnInterface("");
        setWireguardInterface("");
        setWireguardPeer("");
        // Reset VRRP conditions
        setVrrpGroup("");
        setVrrpStateFilter("");
      }
    }
  }, [open, rule]);

  const buildConditions = (): Record<string, unknown> => {
    const conditions: Record<string, unknown> = {};

    switch (type) {
      case "INTERFACE_DOWN":
        conditions.interface = interfaceName;
        break;
      case "HIGH_CPU":
      case "HIGH_MEMORY":
      case "HIGH_DISK":
        conditions.threshold = parseInt(threshold, 10);
        conditions.duration = parseInt(duration, 10);
        break;
      case "CONNECTION_THRESHOLD":
        conditions.threshold = parseInt(threshold, 10);
        break;
      case "INTERFACE_ERRORS":
        conditions.interface = interfaceName;
        conditions.threshold = parseInt(threshold, 10);
        break;
      case "BGP_NEIGHBOR_DOWN":
        conditions.neighbor = neighborAddress;
        break;
      case "IPSEC_TUNNEL_DOWN":
        if (ipsecPeer) conditions.peer = ipsecPeer;
        if (ipsecTunnel) conditions.tunnel = ipsecTunnel;
        break;
      case "OPENVPN_TUNNEL_DOWN":
        conditions.openvpn_interface = openvpnInterface;
        break;
      case "WIREGUARD_PEER_DOWN":
        conditions.wireguard_interface = wireguardInterface;
        if (wireguardPeer) conditions.wireguard_peer = wireguardPeer;
        break;
      case "VRRP_STATE_CHANGE":
      case "VRRP_FAILOVER":
        if (vrrpGroup) conditions.vrrp_group = vrrpGroup;
        if (vrrpStateFilter) conditions.vrrp_state = vrrpStateFilter;
        break;
    }

    return conditions;
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Error", "Please enter a webhook URL first");
      return;
    }
    setTestingWebhook(true);
    try {
      const result = await monitoringService.testNotification({
        webhook_url: webhookUrl.trim(),
      });
      if (result.success) {
        toast.success("Success", result.message);
      } else {
        toast.error("Failed", result.message);
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Test failed");
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramChatId.trim() || !telegramBotToken.trim()) {
      toast.error("Error", "Please enter both Chat ID and Bot Token first");
      return;
    }
    setTestingTelegram(true);
    try {
      const result = await monitoringService.testNotification({
        telegram_chat_id: telegramChatId.trim(),
        telegram_bot_token: telegramBotToken.trim(),
      });
      if (result.success) {
        toast.success("Success", result.message);
      } else {
        toast.error("Failed", result.message);
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Test failed");
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Validation Error", "Name is required");
      return;
    }

    setLoading(true);

    try {
      const data: CreateAlertRuleRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        severity,
        conditions: buildConditions(),
        notifyInApp,
        webhookUrl: webhookUrl.trim() || undefined,
        telegramChatId: telegramChatId.trim() || undefined,
        telegramBotToken: telegramBotToken.trim() || undefined,
      };

      if (isEditing && rule) {
        await monitoringService.updateAlertRule(rule.id, {
          ...data,
          cooldownSeconds: parseInt(cooldownSeconds, 10),
        });
        toast.success("Rule Updated", `Alert rule "${name}" has been updated`);
      } else {
        await monitoringService.createAlertRule(data);
        toast.success("Rule Created", `Alert rule "${name}" has been created`);
      }

      onSuccess();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setLoading(false);
    }
  };

  const renderConditionFields = () => {
    switch (type) {
      case "INTERFACE_DOWN":
        return (
          <div className="space-y-2">
            <Label>Interface Name</Label>
            <Input
              placeholder="e.g., eth0"
              value={interfaceName}
              onChange={(e) => setInterfaceName(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              The interface to monitor for up/down status
            </p>
          </div>
        );

      case "HIGH_CPU":
      case "HIGH_MEMORY":
      case "HIGH_DISK":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Threshold (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (seconds)</Label>
              <Input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                How long the threshold must be exceeded
              </p>
            </div>
          </div>
        );

      case "CONNECTION_THRESHOLD":
        return (
          <div className="space-y-2">
            <Label>Connection Threshold</Label>
            <Input
              type="number"
              min={1}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Alert when conntrack connections exceed this number
            </p>
          </div>
        );

      case "INTERFACE_ERRORS":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Interface Name</Label>
              <Input
                placeholder="e.g., eth0"
                value={interfaceName}
                onChange={(e) => setInterfaceName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>Error Threshold</Label>
              <Input
                type="number"
                min={1}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        );

      case "BGP_NEIGHBOR_DOWN":
        return (
          <div className="space-y-2">
            <Label>BGP Neighbor Address</Label>
            <Input
              placeholder="e.g., 10.0.0.2"
              value={neighborAddress}
              onChange={(e) => setNeighborAddress(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              The IP address of the BGP neighbor to monitor
            </p>
          </div>
        );

      case "IPSEC_TUNNEL_DOWN":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peer Address</Label>
              <Input
                placeholder="e.g., 203.0.113.1"
                value={ipsecPeer}
                onChange={(e) => setIpsecPeer(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Remote peer IP address
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tunnel Name (optional)</Label>
              <Input
                placeholder="e.g., tunnel1"
                value={ipsecTunnel}
                onChange={(e) => setIpsecTunnel(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Specific tunnel to monitor
              </p>
            </div>
          </div>
        );

      case "OPENVPN_TUNNEL_DOWN":
        return (
          <div className="space-y-2">
            <Label>OpenVPN Interface</Label>
            <Input
              placeholder="e.g., vtun0"
              value={openvpnInterface}
              onChange={(e) => setOpenvpnInterface(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              The OpenVPN interface name to monitor (e.g., vtun0, vtun1)
            </p>
          </div>
        );

      case "WIREGUARD_PEER_DOWN":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>WireGuard Interface</Label>
              <Input
                placeholder="e.g., wg0"
                value={wireguardInterface}
                onChange={(e) => setWireguardInterface(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                WireGuard interface name
              </p>
            </div>
            <div className="space-y-2">
              <Label>Peer Public Key (optional)</Label>
              <Input
                placeholder="e.g., abc123..."
                value={wireguardPeer}
                onChange={(e) => setWireguardPeer(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Specific peer to monitor
              </p>
            </div>
          </div>
        );

      case "VRRP_STATE_CHANGE":
      case "VRRP_FAILOVER":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>VRRP Group (optional)</Label>
              <Input
                placeholder="e.g., WAN, LAN"
                value={vrrpGroup}
                onChange={(e) => setVrrpGroup(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Specific VRRP group to monitor (empty for all)
              </p>
            </div>
            <div className="space-y-2">
              <Label>State Filter (optional)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={vrrpStateFilter}
                onChange={(e) => setVrrpStateFilter(e.target.value)}
                disabled={loading}
              >
                <option value="">Any state change</option>
                <option value="MASTER">To MASTER</option>
                <option value="BACKUP">To BACKUP</option>
                <option value="FAULT">To FAULT</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Alert only for specific state transitions
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {isEditing ? "Edit Alert Rule" : "Create Alert Rule"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the alert rule configuration"
              : "Configure a new alert rule to monitor your VyOS instance"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., High CPU Alert"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Describe what this alert monitors..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Alert Type</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as AlertType)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select alert type" />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <div>{t.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={severity}
                onValueChange={(value) => setSeverity(value as AlertSeverity)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <Label>Conditions</Label>
              <div className="border rounded-lg p-4 bg-muted/30">
                {renderConditionFields()}
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-4">
              <Label>Notifications</Label>

              <div className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <Label className="font-normal">In-App Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Show toast notifications when triggered
                  </p>
                </div>
                <Switch
                  checked={notifyInApp}
                  onCheckedChange={setNotifyInApp}
                  disabled={loading}
                />
              </div>

              <Tabs defaultValue="webhook" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="webhook" className="flex-1">Webhook</TabsTrigger>
                  <TabsTrigger value="telegram" className="flex-1">Telegram</TabsTrigger>
                </TabsList>

                <TabsContent value="webhook" className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label>Webhook URL (optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        disabled={loading}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestWebhook}
                        disabled={loading || testingWebhook || !webhookUrl.trim()}
                      >
                        {testingWebhook ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Send a POST request with alert data to this URL
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="telegram" className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label>Chat ID</Label>
                    <Input
                      placeholder="e.g., -1001234567890 or @channelname"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use @BotFather to create a bot, then get Chat ID from @userinfobot
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Bot Token {isEditing && rule?.hasTelegram && "(leave empty to keep current)"}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        disabled={loading}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestTelegram}
                        disabled={loading || testingTelegram || !telegramChatId.trim() || !telegramBotToken.trim()}
                      >
                        {testingTelegram ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get this from @BotFather when creating your bot
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Cooldown */}
            <div className="space-y-2">
              <Label>Cooldown (seconds)</Label>
              <Input
                type="number"
                min={60}
                value={cooldownSeconds}
                onChange={(e) => setCooldownSeconds(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Minimum time between repeated alerts
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
