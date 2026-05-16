"use client";

import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Shield,
  ChevronRight,
  ChevronDown,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  firewallIPv4Service,
  type FirewallConfigResponse,
  type FirewallRule,
  type FirewallCapabilitiesResponse,
  type CustomChain,
} from "@/lib/api/firewall-ipv4";
import { firewallIPv6Service } from "@/lib/api/firewall-ipv6";
import { firewallGroupsService, type FirewallGroup } from "@/lib/api/firewall-groups";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateFirewallRuleModal } from "@/components/firewall/CreateFirewallRuleModal";
import { EditFirewallRuleModal } from "@/components/firewall/EditFirewallRuleModal";
import { DeleteFirewallRuleModal } from "@/components/firewall/DeleteFirewallRuleModal";
import { CreateCustomChainModal } from "@/components/firewall/CreateCustomChainModal";
import { DeleteCustomChainModal } from "@/components/firewall/DeleteCustomChainModal";
import { FirewallRuleRow } from "@/components/firewall/FirewallRuleRow";
import { FirewallReorderBanner } from "@/components/firewall/FirewallReorderBanner";
import { ColumnToggleButton } from "@/components/firewall/ColumnToggleButton";
import { useColumnVisibility, type ColumnDef } from "@/hooks/useColumnVisibility";

type ChainType = "forward" | "input" | "output" | "prerouting_raw";

const POLICIES_COLUMNS: ColumnDef[] = [
  { id: "protocol",      label: "Protocol" },
  { id: "source",        label: "Source" },
  { id: "srcPort",       label: "Src Port" },
  { id: "destination",   label: "Destination" },
  { id: "dstPort",       label: "Dst Port" },
  { id: "state",         label: "State" },
  { id: "description",   label: "Description" },
  { id: "status",        label: "Status" },
  // Extra columns — hidden by default
  { id: "log",           label: "Log",          defaultVisible: false },
  { id: "interface",     label: "Interface",    defaultVisible: false },
  { id: "limit",         label: "Limit",        defaultVisible: false },
  { id: "time",          label: "Time",         defaultVisible: false },
  { id: "icmpType",      label: "ICMP Type",    defaultVisible: false },
  { id: "tcpFlags",      label: "TCP Flags",    defaultVisible: false },
  { id: "connectionStatus", label: "Conn Status", defaultVisible: false },
  { id: "mark",          label: "Mark",         defaultVisible: false },
  { id: "packetLength",  label: "Pkt Length",   defaultVisible: false },
  { id: "recent",        label: "Recent",       defaultVisible: false },
];

export default function FirewallPoliciesPage() {
  const searchParams = useSearchParams();
  // Protocol selection state
  const [selectedProtocol, setSelectedProtocol] = useState<"ipv4" | "ipv6">("ipv4");

  // IPv4 state
  const [config, setConfig] = useState<FirewallConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<FirewallCapabilitiesResponse | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainType | string>("forward");
  const [isCustomChain, setIsCustomChain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState<FirewallGroup[]>([]);

  // IPv6 state (parallel to IPv4)
  const [configIPv6, setConfigIPv6] = useState<FirewallConfigResponse | null>(null);
  const [capabilitiesIPv6, setCapabilitiesIPv6] = useState<FirewallCapabilitiesResponse | null>(null);
  const [selectedChainIPv6, setSelectedChainIPv6] = useState<ChainType | string>("forward");
  const [isCustomChainIPv6, setIsCustomChainIPv6] = useState(false);
  const [loadingIPv6, setLoadingIPv6] = useState(true);
  const [errorIPv6, setErrorIPv6] = useState<string | null>(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [cloningRule, setCloningRule] = useState<FirewallRule | null>(null);
  const [editingRule, setEditingRule] = useState<FirewallRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<FirewallRule | null>(null);
  const [createChainModalOpen, setCreateChainModalOpen] = useState(false);
  const [deletingChain, setDeletingChain] = useState<CustomChain | null>(null);

  // Default action change state
  const [savingDefaultAction, setSavingDefaultAction] = useState(false);

  // Chain settings state
  const [chainDescription, setChainDescription] = useState("");
  const [chainDefaultLog, setChainDefaultLog] = useState(false);
  const [chainDefaultJumpTarget, setChainDefaultJumpTarget] = useState("");
  const [savingChainSettings, setSavingChainSettings] = useState(false);
  const [chainSettingsOpen, setChainSettingsOpen] = useState(false);

  // IPv4 Drag and drop states
  const [reorderedRules, setReorderedRules] = useState<FirewallRule[]>([]);
  const [originalRules, setOriginalRules] = useState<FirewallRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [savingReorder, setSavingReorder] = useState(false);

  // IPv6 Drag and drop states
  const [reorderedRulesIPv6, setReorderedRulesIPv6] = useState<FirewallRule[]>([]);
  const [originalRulesIPv6, setOriginalRulesIPv6] = useState<FirewallRule[]>([]);
  const [hasChangesIPv6, setHasChangesIPv6] = useState(false);
  const [activeIdIPv6, setActiveIdIPv6] = useState<number | null>(null);
  const [savingReorderIPv6, setSavingReorderIPv6] = useState(false);

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Column visibility & order
  const { visibleColumns, toggleColumn, visibleColumnCount, orderedColumns, visibleOrderedColumns, reorderColumns, resetToDefault } =
    useColumnVisibility("firewall-policies-columns", POLICIES_COLUMNS);

  // Drag and drop sensors - require 8px movement before drag starts
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // IPv4 fetch functions
  const fetchConfig = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await firewallIPv4Service.getConfig(refresh);
      setConfig(data);
      // Reset reorder state when new config is loaded
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load firewall configuration");
      console.error("Error fetching firewall config:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCapabilities = async () => {
    try {
      const caps = await firewallIPv4Service.getCapabilities();
      setCapabilities(caps);
    } catch (err) {
      console.error("Error fetching capabilities:", err);
    }
  };

  // IPv6 fetch functions
  const fetchConfigIPv6 = async (refresh: boolean = false) => {
    try {
      setLoadingIPv6(true);
      setErrorIPv6(null);
      const data = await firewallIPv6Service.getConfig(refresh);
      setConfigIPv6(data);
      // Reset reorder state when new config is loaded
      setHasChangesIPv6(false);
      setReorderedRulesIPv6([]);
      setOriginalRulesIPv6([]);
    } catch (err) {
      setErrorIPv6(err instanceof Error ? err.message : "Failed to load IPv6 firewall configuration");
      console.error("Error fetching IPv6 firewall config:", err);
    } finally {
      setLoadingIPv6(false);
    }
  };

  const fetchCapabilitiesIPv6 = async () => {
    try {
      const caps = await firewallIPv6Service.getCapabilities();
      setCapabilitiesIPv6(caps);
    } catch (err) {
      console.error("Error fetching IPv6 capabilities:", err);
    }
  };

  const fetchGroups = async () => {
    try {
      const groupsConfig = await firewallGroupsService.getConfig();
      const allGroups = [
        ...groupsConfig.address_groups,
        ...groupsConfig.network_groups,
        ...groupsConfig.port_groups,
        ...groupsConfig.interface_groups,
        ...groupsConfig.mac_groups,
        ...groupsConfig.domain_groups,
      ];
      setGroups(allGroups);
    } catch (err) {
      console.error("Error fetching firewall groups:", err);
    }
  };

  // Handler for changing default action on base chains
  const handleDefaultActionChange = async (
    chain: string,
    action: string,
    isCustom: boolean,
    protocol: "ipv4" | "ipv6"
  ) => {
    setSavingDefaultAction(true);
    try {
      if (protocol === "ipv4") {
        if (isCustom) {
          await firewallIPv4Service.setCustomChainDefaultAction(chain, action);
        } else if (chain === "prerouting_raw") {
          await firewallIPv4Service.setPreroutingRawDefaultAction(action);
        } else {
          await firewallIPv4Service.setBaseChainDefaultAction(chain, action);
        }
        await fetchConfig(true);
      } else {
        if (isCustom) {
          await firewallIPv6Service.setCustomChainDefaultAction(chain, action);
        } else {
          await firewallIPv6Service.setBaseChainDefaultAction(chain, action);
        }
        await fetchConfigIPv6(true);
      }
    } catch (err) {
      console.error("Error changing default action:", err);
      setError(err instanceof Error ? err.message : "Failed to change default action");
    } finally {
      setSavingDefaultAction(false);
    }
  };

  // Helper to get default action for a chain
  const getDefaultAction = (chain: string, isCustom: boolean, protocol: "ipv4" | "ipv6"): string | null => {
    if (protocol === "ipv4") {
      if (isCustom) {
        const customChain = customChains.find((c) => c.name === chain);
        return customChain?.default_action || null;
      } else {
        if (chain === "forward") return config?.forward?.default_action || null;
        if (chain === "input") return config?.input?.default_action || null;
        if (chain === "output") return config?.output?.default_action || null;
        if (chain === "prerouting_raw") return config?.prerouting_raw?.default_action || null;
      }
    } else {
      if (isCustom) {
        const customChain = customChainsIPv6.find((c) => c.name === chain);
        return customChain?.default_action || null;
      } else {
        if (chain === "forward") return configIPv6?.forward?.default_action || null;
        if (chain === "input") return configIPv6?.input?.default_action || null;
        if (chain === "output") return configIPv6?.output?.default_action || null;
      }
    }
    return null;
  };

  // Helper to get colored class for default action badge (matches table row styling)
  const getDefaultActionBadgeClass = (action: string | null): string => {
    if (!action) return "";
    if (action === "accept") return "bg-green-500/10 text-green-500 border-green-500/20";
    if (action === "drop") return "bg-red-500/10 text-red-500 border-red-500/20";
    if (action === "reject") return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "";
  };

  useEffect(() => {
    // Load IPv4 data
    fetchConfig();
    fetchCapabilities();
    // Load IPv6 data
    fetchConfigIPv6();
    fetchCapabilitiesIPv6();
    // Load groups (shared between IPv4 and IPv6)
    fetchGroups();
  }, []);

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "ipv4" || section === "ipv6") {
      setSelectedProtocol(section);
    }
  }, [searchParams]);

  // IPv4 rules
  const forwardRules = config ? config.forward_rules : [];
  const inputRules = config ? config.input_rules : [];
  const outputRules = config ? config.output_rules : [];
  const customChains = config ? config.custom_chains : [];

  // IPv6 rules
  const forwardRulesIPv6 = configIPv6 ? configIPv6.forward_rules : [];
  const inputRulesIPv6 = configIPv6 ? configIPv6.input_rules : [];
  const outputRulesIPv6 = configIPv6 ? configIPv6.output_rules : [];
  const customChainsIPv6 = configIPv6 ? configIPv6.custom_chains : [];

  useEffect(() => {
    const chainParam = searchParams.get("chain");
    const view = searchParams.get("view");
    const customParam = searchParams.get("custom");
    const section = searchParams.get("section");
    const protocol = section === "ipv6" ? "ipv6" : "ipv4";

    if (protocol === "ipv6") {
      if (!configIPv6) return;
      if (chainParam && customChainsIPv6.some((c) => c.name === chainParam)) {
        setSelectedChainIPv6(chainParam);
        setIsCustomChainIPv6(true);
      } else if (view === "custom-chains" || customParam === "1") {
        const first = customChainsIPv6[0];
        if (first) {
          setSelectedChainIPv6(first.name);
          setIsCustomChainIPv6(true);
        }
      }
    } else {
      if (!config) return;
      if (chainParam && customChains.some((c) => c.name === chainParam)) {
        setSelectedChain(chainParam);
        setIsCustomChain(true);
      } else if (view === "custom-chains" || customParam === "1") {
        const first = customChains[0];
        if (first) {
          setSelectedChain(first.name);
          setIsCustomChain(true);
        }
      }
    }
  }, [config, configIPv6, customChains, customChainsIPv6, searchParams]);

  // Prerouting raw rules
  const preroutingRawRules = config?.prerouting_raw?.rules ?? [];

  // Get rules for the selected chain (protocol-aware)
  const getCurrentRules = (): FirewallRule[] => {
    if (selectedProtocol === "ipv4") {
      if (isCustomChain) {
        const chain = customChains.find((c) => c.name === selectedChain);
        return chain ? chain.rules : [];
      } else {
        if (selectedChain === "forward") return forwardRules;
        if (selectedChain === "input") return inputRules;
        if (selectedChain === "output") return outputRules;
        if (selectedChain === "prerouting_raw") return preroutingRawRules;
        return [];
      }
    } else {
      // IPv6
      if (isCustomChainIPv6) {
        const chain = customChainsIPv6.find((c) => c.name === selectedChainIPv6);
        return chain ? chain.rules : [];
      } else {
        if (selectedChainIPv6 === "forward") return forwardRulesIPv6;
        if (selectedChainIPv6 === "input") return inputRulesIPv6;
        if (selectedChainIPv6 === "output") return outputRulesIPv6;
        return [];
      }
    }
  };

  // Initialize reordered rules when current rules change or chain changes
  useEffect(() => {
    if (selectedProtocol === "ipv4") {
      if (!hasChanges) {
        const rules = getCurrentRules();
        setReorderedRules([...rules]);
        setOriginalRules([...rules]);
      }
    } else {
      if (!hasChangesIPv6) {
        const rules = getCurrentRules();
        setReorderedRulesIPv6([...rules]);
        setOriginalRulesIPv6([...rules]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain, isCustomChain, config, hasChanges, selectedChainIPv6, isCustomChainIPv6, configIPv6, hasChangesIPv6, selectedProtocol]);

  // Load chain settings when selected chain changes
  useEffect(() => {
    if (selectedProtocol !== "ipv4" || !config) return;

    const currentChainName = selectedChain;
    const isCustom = isCustomChain;

    if (isCustom) {
      const chain = customChains.find((c) => c.name === currentChainName);
      setChainDescription(chain?.description || "");
      setChainDefaultLog(chain?.default_log || false);
      setChainDefaultJumpTarget(chain?.default_jump_target || "");
    } else if (currentChainName === "prerouting_raw") {
      setChainDescription(config.prerouting_raw?.description || "");
      setChainDefaultLog(config.prerouting_raw?.default_log || false);
      setChainDefaultJumpTarget(config.prerouting_raw?.default_jump_target || "");
    } else {
      // Base chain (forward/input/output)
      const baseConfig = currentChainName === "forward" ? config.forward
        : currentChainName === "input" ? config.input
        : config.output;
      setChainDescription(baseConfig?.description || "");
      setChainDefaultLog(baseConfig?.default_log || false);
      setChainDefaultJumpTarget("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain, isCustomChain, config, selectedProtocol]);

  const currentRules = selectedProtocol === "ipv4"
    ? (hasChanges ? reorderedRules : getCurrentRules())
    : (hasChangesIPv6 ? reorderedRulesIPv6 : getCurrentRules());

  // Drag and drop handlers (IPv4)
  const handleDragStart = (event: any) => {
    if (selectedProtocol === "ipv4") {
      setActiveId(event.active.id);
    } else {
      setActiveIdIPv6(event.active.id);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (selectedProtocol === "ipv4") {
      setActiveId(null);
    } else {
      setActiveIdIPv6(null);
    }

    if (!over || active.id === over.id) {
      return;
    }

    if (selectedProtocol === "ipv4") {
      setReorderedRules((rules) => {
        const oldIndex = rules.findIndex((r) => r.rule_number === active.id);
        const newIndex = rules.findIndex((r) => r.rule_number === over.id);

        const newRules = arrayMove(rules, oldIndex, newIndex);
        setHasChanges(true);
        return newRules;
      });
    } else {
      setReorderedRulesIPv6((rules) => {
        const oldIndex = rules.findIndex((r) => r.rule_number === active.id);
        const newIndex = rules.findIndex((r) => r.rule_number === over.id);

        const newRules = arrayMove(rules, oldIndex, newIndex);
        setHasChangesIPv6(true);
        return newRules;
      });
    }
  };

  const handleCancelReorder = () => {
    if (selectedProtocol === "ipv4") {
      setReorderedRules([...originalRules]);
      setHasChanges(false);
    } else {
      setReorderedRulesIPv6([...originalRulesIPv6]);
      setHasChangesIPv6(false);
    }
  };

  const handleSaveReorder = async () => {
    if (selectedProtocol === "ipv4") {
      if (!reorderedRules.length || !hasChanges) return;

      setSavingReorder(true);
      try {
        // Get sorted original rule numbers to use as the new sequence
        const sortedRuleNumbers = [...originalRules]
          .map((r) => r.rule_number)
          .sort((a, b) => a - b);

        // Build the reorder request
        const reorderItems = reorderedRules.map((rule, i) => ({
          old_number: rule.rule_number,
          new_number: sortedRuleNumbers[i],
          rule_data: rule,
        }));

        // Call the reorder endpoint
        await firewallIPv4Service.reorderRules({
          chain: selectedChain as string,
          is_custom_chain: isCustomChain,
          rules: reorderItems,
        });

        // Refresh config and reset state
        await fetchConfig(true);
      } catch (err) {
        console.error("Error saving reordered rules:", err);
        setError(err instanceof Error ? err.message : "Failed to save reordered rules");
      } finally {
        setSavingReorder(false);
      }
    } else {
      // IPv6
      if (!reorderedRulesIPv6.length || !hasChangesIPv6) return;

      setSavingReorderIPv6(true);
      try {
        // Get sorted original rule numbers to use as the new sequence
        const sortedRuleNumbers = [...originalRulesIPv6]
          .map((r) => r.rule_number)
          .sort((a, b) => a - b);

        // Build the reorder request
        const reorderItems = reorderedRulesIPv6.map((rule, i) => ({
          old_number: rule.rule_number,
          new_number: sortedRuleNumbers[i],
          rule_data: rule,
        }));

        // Call the reorder endpoint
        await firewallIPv6Service.reorderRules({
          chain: selectedChainIPv6 as string,
          is_custom_chain: isCustomChainIPv6,
          rules: reorderItems,
        });

        // Refresh config and reset state
        await fetchConfigIPv6(true);
      } catch (err) {
        console.error("Error saving reordered IPv6 rules:", err);
        setErrorIPv6(err instanceof Error ? err.message : "Failed to save reordered IPv6 rules");
      } finally {
        setSavingReorderIPv6(false);
      }
    }
  };

  // Chain settings handlers
  const handleChainDescriptionBlur = async () => {
    if (selectedProtocol !== "ipv4") return;
    setSavingChainSettings(true);
    try {
      const chain = selectedChain;
      if (isCustomChain) {
        if (chainDescription) {
          await firewallIPv4Service.setCustomChainDescription(chain, chainDescription);
        } else {
          await firewallIPv4Service.deleteCustomChainDescription(chain);
        }
      } else if (chain === "prerouting_raw") {
        if (chainDescription) {
          await firewallIPv4Service.setPreroutingRawDescription(chainDescription);
        } else {
          await firewallIPv4Service.deletePreroutingRawDescription();
        }
      } else {
        if (chainDescription) {
          await firewallIPv4Service.setBaseChainDescription(chain, chainDescription);
        } else {
          await firewallIPv4Service.deleteBaseChainDescription(chain);
        }
      }
      await fetchConfig(true);
    } catch (err) {
      console.error("Error saving chain description:", err);
      setError(err instanceof Error ? err.message : "Failed to save chain description");
    } finally {
      setSavingChainSettings(false);
    }
  };

  const handleChainDefaultLogChange = async (checked: boolean) => {
    if (selectedProtocol !== "ipv4") return;
    setChainDefaultLog(checked);
    setSavingChainSettings(true);
    try {
      const chain = selectedChain;
      if (isCustomChain) {
        if (checked) {
          await firewallIPv4Service.setCustomChainDefaultLog(chain);
        } else {
          await firewallIPv4Service.deleteCustomChainDefaultLog(chain);
        }
      } else if (chain === "prerouting_raw") {
        if (checked) {
          await firewallIPv4Service.setPreroutingRawDefaultLog();
        } else {
          await firewallIPv4Service.deletePreroutingRawDefaultLog();
        }
      } else {
        if (checked) {
          await firewallIPv4Service.setBaseChainDefaultLog(chain);
        } else {
          await firewallIPv4Service.deleteBaseChainDefaultLog(chain);
        }
      }
      await fetchConfig(true);
    } catch (err) {
      console.error("Error saving chain default log:", err);
      setError(err instanceof Error ? err.message : "Failed to save chain default log");
    } finally {
      setSavingChainSettings(false);
    }
  };

  const handleChainDefaultJumpTargetChange = async (value: string) => {
    if (selectedProtocol !== "ipv4") return;
    setChainDefaultJumpTarget(value);
    setSavingChainSettings(true);
    try {
      const chain = selectedChain;
      if (isCustomChain) {
        if (value && value !== "__none__") {
          await firewallIPv4Service.setCustomChainDefaultJumpTarget(chain, value);
        } else {
          await firewallIPv4Service.deleteCustomChainDefaultJumpTarget(chain);
        }
      } else if (chain === "prerouting_raw") {
        if (value && value !== "__none__") {
          await firewallIPv4Service.setPreroutingRawDefaultJumpTarget(value);
        } else {
          await firewallIPv4Service.deletePreroutingRawDefaultJumpTarget();
        }
      }
      await fetchConfig(true);
    } catch (err) {
      console.error("Error saving chain default jump target:", err);
      setError(err instanceof Error ? err.message : "Failed to save chain default jump target");
    } finally {
      setSavingChainSettings(false);
    }
  };

  // Filter rules based on search
  const filteredRules = currentRules.filter((rule) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      rule.rule_number.toString().includes(query) ||
      rule.description?.toLowerCase().includes(query) ||
      rule.protocol?.toLowerCase().includes(query) ||
      rule.action?.toLowerCase().includes(query) ||
      rule.source?.address?.toLowerCase().includes(query) ||
      rule.destination?.address?.toLowerCase().includes(query)
    );
  });

  const handleChainSelect = (chain: string, custom: boolean = false) => {
    if (selectedProtocol === "ipv4") {
      setSelectedChain(chain);
      setIsCustomChain(custom);
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
    } else {
      setSelectedChainIPv6(chain);
      setIsCustomChainIPv6(custom);
      setHasChangesIPv6(false);
      setReorderedRulesIPv6([]);
      setOriginalRulesIPv6([]);
    }
  };

  const totalRules = selectedProtocol === "ipv4"
    ? forwardRules.length + inputRules.length + outputRules.length
    : forwardRulesIPv6.length + inputRulesIPv6.length + outputRulesIPv6.length;

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className={cn(
          "border-r border-border bg-card/50 flex flex-col h-full transition-all duration-300 shrink-0",
          sidebarCollapsed ? "w-12" : "w-80"
        )}>
          {sidebarCollapsed ? (
            /* Collapsed strip */
            <div className="flex flex-col items-center py-4 gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSidebarCollapsed(false)}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
            </div>
          ) : (
          <div className="p-6 pb-4 flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-foreground">Firewall Policies</h1>
                <p className="text-xs text-muted-foreground">
                  {totalRules} rule{totalRules !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setSidebarCollapsed(true)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>

            <Tabs
              defaultValue="ipv4"
              value={selectedProtocol}
              onValueChange={(value) => setSelectedProtocol(value as "ipv4" | "ipv6")}
              className="w-full flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ipv4">IPv4</TabsTrigger>
                <TabsTrigger value="ipv6">IPv6</TabsTrigger>
              </TabsList>

              <TabsContent value="ipv4" className="flex flex-col flex-1 min-h-0 overflow-hidden mt-0">
                <Separator className="mb-3 shrink-0" />
                <ScrollArea className="flex-1 min-h-0 px-3">
                  <div className="space-y-1 py-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-2">
                      Base Chains
                    </div>

                    <button
                      onClick={() => handleChainSelect("forward", false)}
                      className={cn(
                        "w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChain === "forward" && !isCustomChain
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Forward</span>
                    </button>

                    <button
                      onClick={() => handleChainSelect("input", false)}
                      className={cn(
                        "w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChain === "input" && !isCustomChain
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Input</span>
                    </button>

                    <button
                      onClick={() => handleChainSelect("output", false)}
                      className={cn(
                        "w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChain === "output" && !isCustomChain
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Output</span>
                    </button>

                    {capabilities?.features.prerouting_raw?.supported && (
                      <button
                        onClick={() => handleChainSelect("prerouting_raw", false)}
                        className={cn(
                          "w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-all",
                          selectedChain === "prerouting_raw" && !isCustomChain
                            ? "bg-accent text-accent-foreground shadow-sm"
                            : "hover:bg-accent/50 text-foreground"
                        )}
                      >
                        <span className="font-medium">Prerouting Raw</span>
                      </button>
                    )}

                    <Separator className="my-4" />
                    <div className="flex items-center justify-between px-2 py-1 mb-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Custom Chains
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setCreateChainModalOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        New
                      </Button>
                    </div>

                    {customChains.length === 0 ? (
                      <div className="px-2 py-4 text-center">
                        <p className="text-xs text-muted-foreground">No custom chains</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click "New" to create one
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {customChains.map((chain) => (
                          <div
                            key={chain.name}
                            className={cn(
                              "group relative rounded-lg transition-all",
                              selectedChain === chain.name && isCustomChain
                                ? "bg-accent shadow-sm"
                                : "hover:bg-accent/50"
                            )}
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 pl-3 pr-1 py-2.5 text-sm">
                              <button
                                onClick={() => handleChainSelect(chain.name, true)}
                                className="text-left truncate min-w-0"
                              >
                                <span className="font-medium text-foreground">
                                  {chain.name}
                                </span>
                              </button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingChain(chain);
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="ipv6" className="flex flex-col flex-1 min-h-0 overflow-hidden mt-0">
                <Separator className="mb-3 shrink-0" />
                <ScrollArea className="flex-1 min-h-0 px-3">
                  <div className="space-y-1 py-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-2">
                      Base Chains
                    </div>

                    <button
                      onClick={() => handleChainSelect("forward", false)}
                      className={cn(
                        "w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChainIPv6 === "forward" && !isCustomChainIPv6
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Forward</span>
                    </button>

                    <button
                      onClick={() => handleChainSelect("input", false)}
                      className={cn(
                        "w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChainIPv6 === "input" && !isCustomChainIPv6
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Input</span>
                    </button>

                    <button
                      onClick={() => handleChainSelect("output", false)}
                      className={cn(
                        "w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChainIPv6 === "output" && !isCustomChainIPv6
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Output</span>
                    </button>

                    <Separator className="my-4" />
                    <div className="flex items-center justify-between px-2 py-1 mb-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Custom Chains
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setCreateChainModalOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        New
                      </Button>
                    </div>

                    {customChainsIPv6.length === 0 ? (
                      <div className="px-2 py-4 text-center">
                        <p className="text-xs text-muted-foreground">No custom chains</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click "New" to create one
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {customChainsIPv6.map((chain) => (
                          <div
                            key={chain.name}
                            className={cn(
                              "group relative rounded-lg transition-all",
                              selectedChainIPv6 === chain.name && isCustomChainIPv6
                                ? "bg-accent shadow-sm"
                                : "hover:bg-accent/50"
                            )}
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 pl-3 pr-1 py-2.5 text-sm">
                              <button
                                onClick={() => handleChainSelect(chain.name, true)}
                                className="text-left truncate min-w-0"
                              >
                                <span className="font-medium text-foreground">
                                  {chain.name}
                                </span>
                              </button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingChain(chain);
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-border bg-card/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <span>Firewall</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>{selectedProtocol === "ipv4" ? "IPv4" : "IPv6"}</span>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-foreground font-medium capitalize">
                    {selectedProtocol === "ipv4" ? selectedChain : selectedChainIPv6}
                  </span>
                  {(selectedProtocol === "ipv4" ? isCustomChain : isCustomChainIPv6) && (
                    <Badge variant="outline" className="ml-2">
                      Custom Chain
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-foreground capitalize">
                  {selectedProtocol === "ipv4" ? selectedChain : selectedChainIPv6} Chain
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => selectedProtocol === "ipv4" ? fetchConfig(true) : fetchConfigIPv6(true)}
                  disabled={selectedProtocol === "ipv4" ? loading : loadingIPv6}
                >
                  <RefreshCw className={cn("h-4 w-4", (selectedProtocol === "ipv4" ? loading : loadingIPv6) && "animate-spin")} />
                </Button>
                <ColumnToggleButton
                  columns={orderedColumns}
                  visibleColumns={visibleColumns}
                  onToggle={toggleColumn}
                  onReorder={reorderColumns}
                  onReset={resetToDefault}
                />
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </div>

            {/* Search and Default Action */}
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredRules.length} rule{filteredRules.length !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">Default Action:</span>
                <Select
                  value={getDefaultAction(
                    selectedProtocol === "ipv4" ? selectedChain : selectedChainIPv6,
                    selectedProtocol === "ipv4" ? isCustomChain : isCustomChainIPv6,
                    selectedProtocol
                  ) || ""}
                  onValueChange={(v) => handleDefaultActionChange(
                    selectedProtocol === "ipv4" ? selectedChain : selectedChainIPv6,
                    v,
                    selectedProtocol === "ipv4" ? isCustomChain : isCustomChainIPv6,
                    selectedProtocol
                  )}
                  disabled={savingDefaultAction}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Not Set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accept">accept</SelectItem>
                    <SelectItem value="drop">drop</SelectItem>
                    <SelectItem value="reject">reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chain Settings (IPv4 only) */}
            {selectedProtocol === "ipv4" && (
              <Collapsible open={chainSettingsOpen} onOpenChange={setChainSettingsOpen} className="mt-4">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", chainSettingsOpen && "rotate-180")} />
                  <span className="font-medium">Chain Settings</span>
                  {savingChainSettings && <RefreshCw className="h-3 w-3 animate-spin" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border border-border bg-muted/30">
                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="chain-description" className="text-sm font-medium">Description</Label>
                      <Input
                        id="chain-description"
                        placeholder="Chain description..."
                        value={chainDescription}
                        onChange={(e) => setChainDescription(e.target.value)}
                        onBlur={handleChainDescriptionBlur}
                        disabled={savingChainSettings}
                      />
                    </div>

                    {/* Default Log */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Default Log</Label>
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id="chain-default-log"
                          checked={chainDefaultLog}
                          onCheckedChange={(checked) => handleChainDefaultLogChange(checked === true)}
                          disabled={savingChainSettings}
                        />
                        <Label htmlFor="chain-default-log" className="text-sm text-muted-foreground cursor-pointer">
                          Log packets matching default action
                        </Label>
                      </div>
                    </div>

                    {/* Default Jump Target (custom chains and prerouting_raw only) */}
                    {(isCustomChain || selectedChain === "prerouting_raw") && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Default Jump Target</Label>
                        <Select
                          value={chainDefaultJumpTarget || "__none__"}
                          onValueChange={handleChainDefaultJumpTargetChange}
                          disabled={savingChainSettings}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {customChains
                              .filter((c) => c.name !== selectedChain)
                              .map((c) => (
                                <SelectItem key={c.name} value={c.name}>
                                  {c.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Rules Table */}
          <div className="flex-1 overflow-auto">
            {(selectedProtocol === "ipv4" ? loading : loadingIPv6) ? (
              <LoadingSpinner message={`Loading ${selectedProtocol === "ipv4" ? "IPv4" : "IPv6"} firewall rules...`} />
            ) : (selectedProtocol === "ipv4" ? error : errorIPv6) ? (
              <div className="flex items-center justify-center h-full">
                <Card className="border-destructive max-w-md">
                  <CardContent className="flex items-center gap-4 py-8">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-destructive">Error Loading Configuration</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedProtocol === "ipv4" ? error : errorIPv6}
                      </p>
                    </div>
                    <Button
                      onClick={() => selectedProtocol === "ipv4" ? fetchConfig(true) : fetchConfigIPv6(true)}
                      variant="outline"
                    >
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="p-6 pt-0">
                <div className="rounded-lg border border-border bg-card">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead className="w-[80px]">Rule #</TableHead>
                          <TableHead className="w-[100px]">Action</TableHead>
                          {visibleOrderedColumns.map((col) => {
                            const widths: Record<string, string> = {
                              source: "", destination: "",
                              protocol: "w-[100px]", srcPort: "w-[100px]", dstPort: "w-[100px]",
                              state: "w-[120px]", description: "w-[200px]", status: "w-[100px]",
                              log: "w-[80px]", interface: "w-[140px]", limit: "w-[120px]",
                              time: "w-[160px]", icmpType: "w-[120px]", tcpFlags: "w-[120px]",
                              connectionStatus: "w-[120px]",
                              mark: "w-[100px]", packetLength: "w-[100px]", recent: "w-[100px]",
                            };
                            return (
                              <TableHead key={col.id} className={widths[col.id] ?? ""}>
                                {col.label}
                              </TableHead>
                            );
                          })}
                          <TableHead className="w-[140px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext
                          items={filteredRules.map((r) => r.rule_number)}
                          strategy={verticalListSortingStrategy}
                        >
                          {filteredRules.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4 + visibleColumnCount} className="h-32">
                                <div className="flex flex-col items-center justify-center text-center">
                                  <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                                  <p className="text-sm font-medium text-foreground">
                                    {searchQuery
                                      ? "No matching rules"
                                      : `No rules in ${selectedProtocol === "ipv4" ? selectedChain : selectedChainIPv6} chain`}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {searchQuery ? "Try adjusting your search" : "Add a rule to get started"}
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredRules.map((rule) => (
                              <FirewallRuleRow
                                key={rule.rule_number}
                                rule={rule}
                                onEdit={() => setEditingRule(rule)}
                                onClone={() => { setCloningRule(rule); setCreateModalOpen(true); }}
                                onDelete={() => setDeletingRule(rule)}
                                isDragging={(selectedProtocol === "ipv4" ? activeId : activeIdIPv6) === rule.rule_number}
                                groups={groups}
                                visibleOrderedColumns={visibleOrderedColumns}
                              />
                            ))
                          )}
                        </SortableContext>
                      </TableBody>
                    </Table>
                    <DragOverlay
                      dropAnimation={{
                        duration: 200,
                        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                      }}
                    >
                      {(selectedProtocol === "ipv4" ? activeId : activeIdIPv6) !== null ? (
                        <div className="bg-card border-2 border-primary shadow-2xl rounded-lg overflow-hidden">
                          <Table>
                            <TableBody>
                              {(() => {
                                const activeRuleId = selectedProtocol === "ipv4" ? activeId : activeIdIPv6;
                                const draggedRule = currentRules.find((r) => r.rule_number === activeRuleId);
                                if (!draggedRule) return null;
                                return (
                                  <TableRow className="hover:bg-transparent">
                                    <TableCell className="w-[40px]"></TableCell>
                                    <TableCell className="font-mono font-semibold">{draggedRule.rule_number}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{draggedRule.action}</Badge>
                                    </TableCell>
                                    <TableCell>{draggedRule.protocol || "all"}</TableCell>
                                    <TableCell>
                                      {draggedRule.source?.address || "any"}
                                    </TableCell>
                                    <TableCell>
                                      {draggedRule.source?.port || "-"}
                                    </TableCell>
                                    <TableCell>
                                      {draggedRule.destination?.address || "any"}
                                    </TableCell>
                                    <TableCell>
                                      {draggedRule.destination?.port || "-"}
                                    </TableCell>
                                  </TableRow>
                                );
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reorder Banner */}
      {(selectedProtocol === "ipv4" ? hasChanges : hasChangesIPv6) && (
        <FirewallReorderBanner
          changesCount={selectedProtocol === "ipv4" ? reorderedRules.length : reorderedRulesIPv6.length}
          onSave={handleSaveReorder}
          onCancel={handleCancelReorder}
          saving={selectedProtocol === "ipv4" ? savingReorder : savingReorderIPv6}
        />
      )}

      {/* Modals */}
      <CreateFirewallRuleModal
        open={createModalOpen}
        onOpenChange={(open) => { setCreateModalOpen(open); if (!open) setCloningRule(null); }}
        onSuccess={() => selectedProtocol === "ipv4" ? fetchConfig(true) : fetchConfigIPv6(true)}
        chain={(selectedProtocol === "ipv4" ? selectedChain : selectedChainIPv6) as string}
        isCustomChain={selectedProtocol === "ipv4" ? isCustomChain : isCustomChainIPv6}
        existingRules={currentRules}
        protocol={selectedProtocol}
        capabilities={selectedProtocol === "ipv4" ? capabilities : capabilitiesIPv6}
        cloneRule={cloningRule ?? undefined}
      />

      {editingRule && (
        <EditFirewallRuleModal
          open={!!editingRule}
          onOpenChange={(open) => !open && setEditingRule(null)}
          onSuccess={() => selectedProtocol === "ipv4" ? fetchConfig(true) : fetchConfigIPv6(true)}
          rule={editingRule}
          protocol={selectedProtocol}
          capabilities={selectedProtocol === "ipv4" ? capabilities : capabilitiesIPv6}
        />
      )}

      {deletingRule && (
        <DeleteFirewallRuleModal
          open={!!deletingRule}
          onOpenChange={(open) => !open && setDeletingRule(null)}
          onSuccess={() => selectedProtocol === "ipv4" ? fetchConfig(true) : fetchConfigIPv6(true)}
          rule={deletingRule}
          protocol={selectedProtocol}
        />
      )}

      <CreateCustomChainModal
        open={createChainModalOpen}
        onOpenChange={setCreateChainModalOpen}
        onSuccess={() => selectedProtocol === "ipv4" ? fetchConfig(true) : fetchConfigIPv6(true)}
        existingChainNames={(selectedProtocol === "ipv4" ? customChains : customChainsIPv6).map((c) => c.name.toLowerCase())}
        protocol={selectedProtocol}
      />

      <DeleteCustomChainModal
        open={!!deletingChain}
        onOpenChange={(open) => !open && setDeletingChain(null)}
        onSuccess={() => {
          if (selectedProtocol === "ipv4") {
            fetchConfig(true);
            // If we're deleting the currently selected chain, switch to forward
            if (deletingChain && selectedChain === deletingChain.name && isCustomChain) {
              handleChainSelect("forward", false);
            }
          } else {
            fetchConfigIPv6(true);
            // If we're deleting the currently selected chain, switch to forward
            if (deletingChain && selectedChainIPv6 === deletingChain.name && isCustomChainIPv6) {
              handleChainSelect("forward", false);
            }
          }
        }}
        chain={deletingChain}
        protocol={selectedProtocol}
      />
    </AppLayout>
  );
}
