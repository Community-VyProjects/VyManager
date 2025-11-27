"use client";

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
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Shield,
  ChevronRight,
  Trash2,
} from "lucide-react";
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

type ChainType = "forward" | "input" | "output";

export default function FirewallPoliciesPage() {
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
  const [editingRule, setEditingRule] = useState<FirewallRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<FirewallRule | null>(null);
  const [createChainModalOpen, setCreateChainModalOpen] = useState(false);
  const [deletingChain, setDeletingChain] = useState<CustomChain | null>(null);

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
        const reorderItems = reorderedRules.map((rule, i) => {
          const oldNumber = rule.rule_number;
          const newNumber = sortedRuleNumbers[i];

          const ruleData: any = {
            action: rule.action,
            description: rule.description,
            protocol: rule.protocol,
            source: rule.source,
            destination: rule.destination,
            state: rule.state,
            interface: rule.interface,
            packet_mods: rule.packet_mods,
            tcp_flags: rule.tcp_flags,
            icmp_type_name: rule.icmp_type_name,
            jump_target: rule.jump_target,
            disable: rule.disable,
            log: rule.log,
          };

          return {
            old_number: oldNumber,
            new_number: newNumber,
            rule_data: ruleData,
          };
        });

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
        const reorderItems = reorderedRulesIPv6.map((rule, i) => {
          const oldNumber = rule.rule_number;
          const newNumber = sortedRuleNumbers[i];

          const ruleData: any = {
            action: rule.action,
            description: rule.description,
            protocol: rule.protocol,
            source: rule.source,
            destination: rule.destination,
            state: rule.state,
            interface: rule.interface,
            packet_mods: rule.packet_mods,
            tcp_flags: rule.tcp_flags,
            icmp_type_name: rule.icmp_type_name,
            jump_target: rule.jump_target,
            disable: rule.disable,
            log: rule.log,
          };

          return {
            old_number: oldNumber,
            new_number: newNumber,
            rule_data: ruleData,
          };
        });

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
        <div className="w-72 border-r border-border bg-card/50 flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Firewall Policies</h1>
                <p className="text-xs text-muted-foreground">
                  {totalRules} rule{totalRules !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <Tabs
              defaultValue="ipv4"
              value={selectedProtocol}
              onValueChange={(value) => setSelectedProtocol(value as "ipv4" | "ipv6")}
              className="w-full flex flex-col flex-1 overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ipv4">IPv4</TabsTrigger>
                <TabsTrigger value="ipv6">IPv6</TabsTrigger>
              </TabsList>

              <TabsContent value="ipv4" className="flex-1 overflow-hidden mt-0">
                <Separator className="mb-3" />
                <ScrollArea className="h-full px-3">
                  <div className="space-y-1 py-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-2">
                      Base Chains
                    </div>

                    <button
                      onClick={() => handleChainSelect("forward", false)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChain === "forward" && !isCustomChain
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Forward</span>
                      <Badge variant="secondary" className="ml-2">
                        {forwardRules.length}
                      </Badge>
                    </button>

                    <button
                      onClick={() => handleChainSelect("input", false)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChain === "input" && !isCustomChain
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Input</span>
                      <Badge variant="secondary" className="ml-2">
                        {inputRules.length}
                      </Badge>
                    </button>

                    <button
                      onClick={() => handleChainSelect("output", false)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChain === "output" && !isCustomChain
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Output</span>
                      <Badge variant="secondary" className="ml-2">
                        {outputRules.length}
                      </Badge>
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

                    {customChains.length === 0 ? (
                      <div className="px-2 py-4 text-center">
                        <p className="text-xs text-muted-foreground">No custom chains</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click "New" to create one
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="max-h-[400px]">
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
                              <button
                                onClick={() => handleChainSelect(chain.name, true)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left pr-9"
                              >
                                <span className="font-medium text-foreground flex-1 truncate">
                                  {chain.name}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="flex-shrink-0 group-hover:opacity-0 transition-opacity"
                                >
                                  {chain.rules.length}
                                </Badge>
                              </button>
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingChain(chain);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="ipv6" className="flex-1 overflow-hidden mt-0">
                <Separator className="mb-3" />
                <ScrollArea className="h-full px-3">
                  <div className="space-y-1 py-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-2">
                      Base Chains
                    </div>

                    <button
                      onClick={() => handleChainSelect("forward", false)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChainIPv6 === "forward" && !isCustomChainIPv6
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Forward</span>
                      <Badge variant="secondary" className="ml-2">
                        {forwardRulesIPv6.length}
                      </Badge>
                    </button>

                    <button
                      onClick={() => handleChainSelect("input", false)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChainIPv6 === "input" && !isCustomChainIPv6
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Input</span>
                      <Badge variant="secondary" className="ml-2">
                        {inputRulesIPv6.length}
                      </Badge>
                    </button>

                    <button
                      onClick={() => handleChainSelect("output", false)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChainIPv6 === "output" && !isCustomChainIPv6
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Output</span>
                      <Badge variant="secondary" className="ml-2">
                        {outputRulesIPv6.length}
                      </Badge>
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
                      <ScrollArea className="max-h-[400px]">
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
                              <button
                                onClick={() => handleChainSelect(chain.name, true)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left pr-9"
                              >
                                <span className="font-medium text-foreground flex-1 truncate">
                                  {chain.name}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="flex-shrink-0 group-hover:opacity-0 transition-opacity"
                                >
                                  {chain.rules.length}
                                </Badge>
                              </button>
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingChain(chain);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
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
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </div>

            {/* Search */}
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
            </div>
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
                          <TableHead className="w-[100px]">Protocol</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead className="w-[100px]">Src Port</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead className="w-[100px]">Dst Port</TableHead>
                          <TableHead className="w-[120px]">State</TableHead>
                          <TableHead className="w-[200px]">Description</TableHead>
                          <TableHead className="w-[100px]">Status</TableHead>
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
                              <TableCell colSpan={12} className="h-32">
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
                                onDelete={() => setDeletingRule(rule)}
                                isDragging={(selectedProtocol === "ipv4" ? activeId : activeIdIPv6) === rule.rule_number}
                                groups={groups}
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
        onOpenChange={setCreateModalOpen}
        onSuccess={() => selectedProtocol === "ipv4" ? fetchConfig(true) : fetchConfigIPv6(true)}
        chain={(selectedProtocol === "ipv4" ? selectedChain : selectedChainIPv6) as string}
        isCustomChain={selectedProtocol === "ipv4" ? isCustomChain : isCustomChainIPv6}
        existingRules={currentRules}
        protocol={selectedProtocol}
        capabilities={selectedProtocol === "ipv4" ? capabilities : capabilitiesIPv6}
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
