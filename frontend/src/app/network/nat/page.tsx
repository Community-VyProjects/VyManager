"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowLeftRight,
  ArrowRightLeft,
  Globe,
  ChevronRight,
  Network,
  Shield,
  GripVertical
} from "lucide-react";
import { useEffect, useState } from "react";
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { natService, type NATConfigResponse, type SourceNATRule, type DestinationNATRule, type StaticNATRule } from "@/lib/api/nat";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateSourceNATModal } from "@/components/network/CreateSourceNATModal";
import { CreateDestinationNATModal } from "@/components/network/CreateDestinationNATModal";
import { CreateStaticNATModal } from "@/components/network/CreateStaticNATModal";
import { EditSourceNATModal } from "@/components/network/EditSourceNATModal";
import { EditDestinationNATModal } from "@/components/network/EditDestinationNATModal";
import { EditStaticNATModal } from "@/components/network/EditStaticNATModal";
import { DeleteNATModal } from "@/components/network/DeleteNATModal";
import { NATRuleRow } from "@/components/network/NATRuleRow";
import { NATReorderBanner } from "@/components/network/NATReorderBanner";

type RuleType = "source" | "destination" | "static";

export default function NATPage() {
  const [config, setConfig] = useState<NATConfigResponse | null>(null);
  const [selectedType, setSelectedType] = useState<RuleType>("source");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [createSourceOpen, setCreateSourceOpen] = useState(false);
  const [createDestOpen, setCreateDestOpen] = useState(false);
  const [createStaticOpen, setCreateStaticOpen] = useState(false);
  const [editingSourceRule, setEditingSourceRule] = useState<SourceNATRule | null>(null);
  const [editingDestRule, setEditingDestRule] = useState<DestinationNATRule | null>(null);
  const [editingStaticRule, setEditingStaticRule] = useState<StaticNATRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<SourceNATRule | DestinationNATRule | StaticNATRule | null>(null);
  const [deleteRuleType, setDeleteRuleType] = useState<RuleType>("source");

  // Drag and drop states
  const [reorderedRules, setReorderedRules] = useState<(SourceNATRule | DestinationNATRule | StaticNATRule)[]>([]);
  const [originalRules, setOriginalRules] = useState<(SourceNATRule | DestinationNATRule | StaticNATRule)[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [savingReorder, setSavingReorder] = useState(false);

  // Drag and drop sensors - require 8px movement before drag starts to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchConfig = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await natService.getConfig(refresh);
      setConfig(data);
      // Reset reorder state when new config is loaded
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NAT configuration");
      console.error("Error fetching NAT config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const sourceRules = config ? config.source_rules : [];
  const destinationRules = config ? config.destination_rules : [];
  const staticRules = config ? config.static_rules : [];

  // Initialize reordered rules when current rules change or type changes
  useEffect(() => {
    if (!hasChanges) {
      const rules = selectedType === "source" ? sourceRules : selectedType === "destination" ? destinationRules : staticRules;
      setReorderedRules([...rules]);
      setOriginalRules([...rules]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, config, hasChanges]);

  const totalSourceRules = sourceRules.length;
  const totalDestinationRules = destinationRules.length;
  const totalStaticRules = staticRules.length;
  const totalRules = totalSourceRules + totalDestinationRules + totalStaticRules;

  const currentRules = hasChanges ? reorderedRules : (selectedType === "source" ? sourceRules : selectedType === "destination" ? destinationRules : staticRules);

  // Drag and drop handlers
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setReorderedRules((rules) => {
      const oldIndex = rules.findIndex((r) => r.rule_number === active.id);
      const newIndex = rules.findIndex((r) => r.rule_number === over.id);

      const newRules = arrayMove(rules, oldIndex, newIndex);
      setHasChanges(true);
      return newRules;
    });
  };

  const handleCancelReorder = () => {
    setReorderedRules([...originalRules]);
    setHasChanges(false);
  };

  const handleSaveReorder = async () => {
    if (!reorderedRules.length || !hasChanges) return;

    setSavingReorder(true);
    try {
      // Get sorted original rule numbers to use as the new sequence
      const sortedRuleNumbers = [...originalRules]
        .map(r => r.rule_number)
        .sort((a, b) => a - b);

      // Build the reorder request with all rules in a single batch
      const reorderItems = reorderedRules.map((rule, i) => {
        const oldNumber = rule.rule_number;
        const newNumber = sortedRuleNumbers[i];
        let ruleData: any = {};

        if (selectedType === "source") {
          const sRule = rule as SourceNATRule;
          ruleData = {
            description: sRule.description,
            source_address: sRule.source?.address,
            source_port: sRule.source?.port,
            destination_address: sRule.destination?.address,
            destination_port: sRule.destination?.port,
            outbound_interface_name: sRule.outbound_interface?.name,
            protocol: sRule.protocol,
            packet_type: sRule.packet_type,
            translation_address: sRule.translation?.address,
            disable: sRule.disable,
            exclude: sRule.exclude,
            log: sRule.log,
          };
        } else if (selectedType === "destination") {
          const dRule = rule as DestinationNATRule;
          ruleData = {
            description: dRule.description,
            source_address: dRule.source?.address,
            source_port: dRule.source?.port,
            destination_address: dRule.destination?.address,
            destination_port: dRule.destination?.port,
            inbound_interface_name: dRule.inbound_interface?.name,
            protocol: dRule.protocol,
            packet_type: dRule.packet_type,
            translation_address: dRule.translation?.address,
            translation_port: dRule.translation?.port,
            disable: dRule.disable,
            exclude: dRule.exclude,
            log: dRule.log,
          };
        } else {
          const stRule = rule as StaticNATRule;
          ruleData = {
            description: stRule.description,
            destination_address: stRule.destination?.address,
            inbound_interface: stRule.inbound_interface,
            translation_address: stRule.translation?.address,
          };
        }

        return {
          old_number: oldNumber,
          new_number: newNumber,
          rule_data: ruleData
        };
      });

      // Call the new bulk reorder endpoint (single API call, single VyOS commit)
      await natService.reorderRules(selectedType, reorderItems);

      // Refresh config and reset state
      await fetchConfig(true);
    } catch (err) {
      console.error("Error saving reordered rules:", err);
      setError(err instanceof Error ? err.message : "Failed to save reordered rules");
    } finally {
      setSavingReorder(false);
    }
  };

  // Filter rules based on search
  const filteredRules = currentRules.filter((rule) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    if (selectedType === "source") {
      const sRule = rule as SourceNATRule;
      return (
        sRule.rule_number.toString().includes(query) ||
        sRule.description?.toLowerCase().includes(query) ||
        sRule.protocol?.toLowerCase().includes(query) ||
        sRule.source?.address?.toLowerCase().includes(query) ||
        sRule.destination?.address?.toLowerCase().includes(query) ||
        sRule.outbound_interface?.name?.toLowerCase().includes(query)
      );
    } else if (selectedType === "destination") {
      const dRule = rule as DestinationNATRule;
      return (
        dRule.rule_number.toString().includes(query) ||
        dRule.description?.toLowerCase().includes(query) ||
        dRule.protocol?.toLowerCase().includes(query) ||
        dRule.destination?.address?.toLowerCase().includes(query) ||
        dRule.inbound_interface?.name?.toLowerCase().includes(query) ||
        dRule.translation?.address?.toLowerCase().includes(query)
      );
    } else {
      const stRule = rule as StaticNATRule;
      return (
        stRule.rule_number.toString().includes(query) ||
        stRule.description?.toLowerCase().includes(query) ||
        stRule.destination?.address?.toLowerCase().includes(query) ||
        stRule.translation?.address?.toLowerCase().includes(query)
      );
    }
  });

  const masqueradeRules = sourceRules.filter((rule) =>
    rule.translation?.address === "masquerade"
  ).length;

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Sidebar - Rule Type Selector */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">NAT Rules</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalRules} total rules
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchConfig(true)}
                disabled={loading}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Rule Type List */}
          <ScrollArea className="flex-1 px-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner message="" size="sm" />
              </div>
            ) : error ? (
              <div className="p-4">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to load</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 py-3">
                {/* Source NAT */}
                <button
                  onClick={() => setSelectedType("source")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "source"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "source" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <ArrowRightLeft className={cn(
                        "h-4 w-4",
                        selectedType === "source" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn(
                          "font-medium text-sm",
                          selectedType === "source" ? "text-foreground" : "text-foreground"
                        )}>
                          Source NAT
                        </span>
                        {selectedType === "source" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                          {totalSourceRules} {totalSourceRules === 1 ? "rule" : "rules"}
                        </span>
                        {masqueradeRules > 0 && (
                          <Badge variant="outline" className="text-xs h-5 w-fit bg-blue-500/10 text-blue-500 border-blue-500/20">
                            {masqueradeRules} masquerade
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Destination NAT */}
                <button
                  onClick={() => setSelectedType("destination")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "destination"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "destination" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <ArrowLeftRight className={cn(
                        "h-4 w-4",
                        selectedType === "destination" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn(
                          "font-medium text-sm",
                          selectedType === "destination" ? "text-foreground" : "text-foreground"
                        )}>
                          Destination NAT
                        </span>
                        {selectedType === "destination" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                          {totalDestinationRules} {totalDestinationRules === 1 ? "rule" : "rules"}
                        </span>
                        <span className="text-xs text-muted-foreground">Port forwarding</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Static NAT */}
                <button
                  onClick={() => setSelectedType("static")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "static"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "static" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Network className={cn(
                        "h-4 w-4",
                        selectedType === "static" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn(
                          "font-medium text-sm",
                          selectedType === "static" ? "text-foreground" : "text-foreground"
                        )}>
                          Static NAT
                        </span>
                        {selectedType === "static" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                          {totalStaticRules} {totalStaticRules === 1 ? "rule" : "rules"}
                        </span>
                        <span className="text-xs text-muted-foreground">1:1 mapping</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Content - Rules Table */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {selectedType === "source" ? "Source NAT Rules" : selectedType === "destination" ? "Destination NAT Rules" : "Static NAT Rules"}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedType === "source"
                    ? "Outbound traffic translation (SNAT, Masquerade)"
                    : selectedType === "destination"
                    ? "Inbound traffic translation (DNAT, Port Forwarding)"
                    : "One-to-one IP address mapping"}
                </p>
              </div>
              <Button
                className="gap-2"
                onClick={() => {
                  if (selectedType === "source") setCreateSourceOpen(true);
                  else if (selectedType === "destination") setCreateDestOpen(true);
                  else setCreateStaticOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-5 gap-4 mb-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalRules}</p>
                      <p className="text-xs text-muted-foreground">Total Rules</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalSourceRules}</p>
                      <p className="text-xs text-muted-foreground">Source NAT</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <ArrowLeftRight className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalDestinationRules}</p>
                      <p className="text-xs text-muted-foreground">Destination NAT</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Network className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalStaticRules}</p>
                      <p className="text-xs text-muted-foreground">Static NAT</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Globe className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{masqueradeRules}</p>
                      <p className="text-xs text-muted-foreground">Masquerade</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Toolbar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search rules..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Rules Table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <LoadingSpinner message="Loading NAT rules..." />
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <Card className="border-destructive max-w-md">
                  <CardContent className="flex items-center gap-4 py-8">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-destructive">Error Loading Configuration</h3>
                      <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    </div>
                    <Button onClick={() => fetchConfig(true)} variant="outline">
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
                          {selectedType === "source" ? (
                            <>
                              <TableHead className="w-[100px]">Protocol</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Destination</TableHead>
                              <TableHead>Translation</TableHead>
                              <TableHead className="w-[150px]">Outbound Interface</TableHead>
                              <TableHead className="w-[200px]">Description</TableHead>
                              <TableHead className="w-[100px]">Status</TableHead>
                            </>
                          ) : selectedType === "destination" ? (
                            <>
                              <TableHead className="w-[100px]">Protocol</TableHead>
                              <TableHead>Destination</TableHead>
                              <TableHead>Translation</TableHead>
                              <TableHead className="w-[150px]">Inbound Interface</TableHead>
                              <TableHead className="w-[200px]">Description</TableHead>
                              <TableHead className="w-[100px]">Status</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead>Destination</TableHead>
                              <TableHead>Translation</TableHead>
                              <TableHead className="w-[150px]">Inbound Interface</TableHead>
                              <TableHead className="w-[250px]">Description</TableHead>
                            </>
                          )}
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
                              <TableCell colSpan={selectedType === "source" ? 10 : selectedType === "destination" ? 9 : 6} className="h-32">
                                <div className="flex flex-col items-center justify-center text-center">
                                  <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                                  <p className="text-sm font-medium text-foreground">
                                    {searchQuery ? "No matching rules" : `No ${selectedType} NAT rules`}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {searchQuery ? "Try adjusting your search" : "Add a rule to get started"}
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredRules.map((rule) => (
                              <NATRuleRow
                                key={rule.rule_number}
                                rule={rule}
                                ruleType={selectedType}
                                onEdit={() => {
                                  if (selectedType === "source") {
                                    setEditingSourceRule(rule as SourceNATRule);
                                  } else if (selectedType === "destination") {
                                    setEditingDestRule(rule as DestinationNATRule);
                                  } else {
                                    setEditingStaticRule(rule as StaticNATRule);
                                  }
                                }}
                                onDelete={() => {
                                  setDeletingRule(rule);
                                  setDeleteRuleType(selectedType);
                                }}
                                isDragging={activeId === rule.rule_number}
                              />
                            ))
                          )}
                        </SortableContext>
                      </TableBody>
                    </Table>
                    <DragOverlay dropAnimation={{
                      duration: 200,
                      easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                    }}>
                      {activeId !== null ? (
                        <div className="bg-card border-2 border-primary shadow-2xl rounded-lg overflow-hidden">
                          <Table>
                            <TableBody>
                              {(() => {
                                const draggedRule = currentRules.find(r => r.rule_number === activeId);
                                if (!draggedRule) return null;
                                return (
                                  <TableRow className="hover:bg-transparent">
                                    <TableCell className="w-[40px]">
                                      <GripVertical className="h-4 w-4 text-primary" />
                                    </TableCell>
                                    <TableCell className="font-mono font-semibold text-base">
                                      {draggedRule.rule_number}
                                    </TableCell>
                                    {selectedType === "source" && (() => {
                                      const sRule = draggedRule as SourceNATRule;
                                      const isMasquerade = sRule.translation?.address === "masquerade";
                                      return (
                                        <>
                                          <TableCell>
                                            <span className="text-sm font-medium uppercase">
                                              {sRule.protocol || "all"}
                                            </span>
                                          </TableCell>
                                          <TableCell>
                                            <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                                              {sRule.source?.address || "any"}
                                            </code>
                                          </TableCell>
                                          <TableCell>
                                            <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                                              {sRule.destination?.address || "any"}
                                            </code>
                                          </TableCell>
                                          <TableCell>
                                            {isMasquerade ? (
                                              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                masquerade
                                              </Badge>
                                            ) : (
                                              <code className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded font-mono">
                                                {sRule.translation?.address || "-"}
                                              </code>
                                            )}
                                          </TableCell>
                                        </>
                                      );
                                    })()}
                                    {selectedType === "destination" && (() => {
                                      const dRule = draggedRule as DestinationNATRule;
                                      return (
                                        <>
                                          <TableCell>
                                            <span className="text-sm font-medium uppercase">
                                              {dRule.protocol || "all"}
                                            </span>
                                          </TableCell>
                                          <TableCell>
                                            <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                                              {dRule.destination?.address || "any"}
                                            </code>
                                          </TableCell>
                                          <TableCell>
                                            <code className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded font-mono">
                                              {dRule.translation?.address || "-"}
                                            </code>
                                          </TableCell>
                                        </>
                                      );
                                    })()}
                                    {selectedType === "static" && (() => {
                                      const stRule = draggedRule as StaticNATRule;
                                      return (
                                        <>
                                          <TableCell>
                                            <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                                              {stRule.destination?.address || "-"}
                                            </code>
                                          </TableCell>
                                          <TableCell>
                                            <code className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded font-mono">
                                              {stRule.translation?.address || "-"}
                                            </code>
                                          </TableCell>
                                        </>
                                      );
                                    })()}
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
      {hasChanges && (
        <NATReorderBanner
          changesCount={reorderedRules.length}
          onSave={handleSaveReorder}
          onCancel={handleCancelReorder}
          saving={savingReorder}
        />
      )}

      {/* Modals */}
      <CreateSourceNATModal
        open={createSourceOpen}
        onOpenChange={setCreateSourceOpen}
        onSuccess={() => fetchConfig(true)}
      />
      <CreateDestinationNATModal
        open={createDestOpen}
        onOpenChange={setCreateDestOpen}
        onSuccess={() => fetchConfig(true)}
      />
      <CreateStaticNATModal
        open={createStaticOpen}
        onOpenChange={setCreateStaticOpen}
        onSuccess={() => fetchConfig(true)}
      />
      <EditSourceNATModal
        open={!!editingSourceRule}
        onOpenChange={(open) => !open && setEditingSourceRule(null)}
        rule={editingSourceRule}
        onSuccess={() => fetchConfig(true)}
      />
      <EditDestinationNATModal
        open={!!editingDestRule}
        onOpenChange={(open) => !open && setEditingDestRule(null)}
        rule={editingDestRule}
        onSuccess={() => fetchConfig(true)}
      />
      <EditStaticNATModal
        open={!!editingStaticRule}
        onOpenChange={(open) => !open && setEditingStaticRule(null)}
        rule={editingStaticRule}
        onSuccess={() => fetchConfig(true)}
      />
      <DeleteNATModal
        open={!!deletingRule}
        onOpenChange={(open) => !open && setDeletingRule(null)}
        rule={deletingRule}
        ruleType={deleteRuleType}
        onSuccess={() => fetchConfig(true)}
      />
    </AppLayout>
  );
}
