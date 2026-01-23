"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Loader2 } from "lucide-react";
import {
  qosService,
  type QoSPolicy,
  type QoSCapabilities,
  type QoSOperation,
} from "@/lib/api/qos";
import { useToast } from "@/hooks/useToast";

interface QoSPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: QoSCapabilities | null;
  existingPolicy?: QoSPolicy | null;
}

export function QoSPolicyModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingPolicy,
}: QoSPolicyModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Common fields
  const [policyType, setPolicyType] = useState("shaper");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bandwidth, setBandwidth] = useState("");

  // Type-specific fields
  const [burst, setBurst] = useState("");
  const [latency, setLatency] = useState("");
  const [delay, setDelay] = useState("");
  const [loss, setLoss] = useState("");
  const [corruption, setCorruption] = useState("");
  const [reordering, setReordering] = useState("");
  const [queueLimit, setQueueLimit] = useState("");
  const [flowIsolation, setFlowIsolation] = useState("");
  const [rtt, setRtt] = useState("");
  const [target, setTarget] = useState("");
  const [interval, setInterval] = useState("");
  const [flows, setFlows] = useState("");
  const [quantum, setQuantum] = useState("");
  const [hashInterval, setHashInterval] = useState("");

  // Shaper default class
  const [defaultBandwidth, setDefaultBandwidth] = useState("");
  const [defaultCeiling, setDefaultCeiling] = useState("");
  const [defaultQueueType, setDefaultQueueType] = useState("");

  const isEditing = !!existingPolicy;

  useEffect(() => {
    if (open) {
      if (existingPolicy) {
        setPolicyType(existingPolicy.type);
        setName(existingPolicy.name);
        setDescription(existingPolicy.description || "");
        setBandwidth(existingPolicy.bandwidth || "");
        setBurst(existingPolicy.burst || "");
        setLatency(existingPolicy.latency || "");
        setDelay(existingPolicy.delay || "");
        setLoss(existingPolicy.loss || "");
        setCorruption(existingPolicy.corruption || "");
        setReordering(existingPolicy.reordering || "");
        setQueueLimit(existingPolicy.queue_limit || "");
        setFlowIsolation(existingPolicy.flow_isolation || "");
        setRtt(existingPolicy.rtt || "");
        setTarget(existingPolicy.target || "");
        setInterval(existingPolicy.interval || "");
        setFlows(existingPolicy.flows || "");
        setQuantum(existingPolicy.codel_quantum || "");
        setHashInterval(existingPolicy.hash_interval || "");
        setDefaultBandwidth(existingPolicy.default?.bandwidth as string || "");
        setDefaultCeiling(existingPolicy.default?.ceiling as string || "");
        setDefaultQueueType(existingPolicy.default?.queue_type as string || "");
      } else {
        resetForm();
      }
    }
  }, [open, existingPolicy]);

  const resetForm = () => {
    setPolicyType("shaper");
    setName("");
    setDescription("");
    setBandwidth("");
    setBurst("");
    setLatency("");
    setDelay("");
    setLoss("");
    setCorruption("");
    setReordering("");
    setQueueLimit("");
    setFlowIsolation("");
    setRtt("");
    setTarget("");
    setInterval("");
    setFlows("");
    setQuantum("");
    setHashInterval("");
    setDefaultBandwidth("");
    setDefaultCeiling("");
    setDefaultQueueType("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Validation Error", "Policy name is required");
      return;
    }

    // Validate bandwidth for policies that require it
    const needsBandwidth = ["shaper", "rate-control", "cake", "network-emulator", "random-detect"].includes(policyType);
    if (needsBandwidth && !bandwidth.trim()) {
      toast.error("Validation Error", "Bandwidth is required for this policy type");
      return;
    }

    setLoading(true);
    try {
      const operations: QoSOperation[] = [];

      // Build operation based on policy type
      switch (policyType) {
        case "shaper":
          operations.push({
            op: "create_shaper",
            name,
            bandwidth,
            description: description || undefined,
          });
          if (defaultBandwidth || defaultCeiling || defaultQueueType) {
            operations.push({
              op: "set_shaper_default",
              name,
              bandwidth: defaultBandwidth || undefined,
              ceiling: defaultCeiling || undefined,
              queue_type: defaultQueueType || undefined,
            });
          }
          break;

        case "rate-control":
          operations.push({
            op: "create_rate_control",
            name,
            bandwidth,
            burst: burst || undefined,
            latency: latency || undefined,
            description: description || undefined,
          });
          break;

        case "limiter":
          operations.push({
            op: "create_limiter",
            name,
            description: description || undefined,
            default_bandwidth: defaultBandwidth || undefined,
            default_burst: burst || undefined,
          });
          break;

        case "fq-codel":
          operations.push({
            op: "create_fq_codel",
            name,
            quantum: quantum || undefined,
            flows: flows || undefined,
            interval: interval || undefined,
            queue_limit: queueLimit || undefined,
            target: target || undefined,
            description: description || undefined,
          });
          break;

        case "cake":
          operations.push({
            op: "create_cake",
            name,
            bandwidth,
            flow_isolation: flowIsolation || undefined,
            rtt: rtt || undefined,
            description: description || undefined,
          });
          break;

        case "network-emulator":
          operations.push({
            op: "create_network_emulator",
            name,
            bandwidth,
            delay: delay || undefined,
            loss: loss || undefined,
            corruption: corruption || undefined,
            reordering: reordering || undefined,
            queue_limit: queueLimit || undefined,
            description: description || undefined,
          });
          break;

        case "priority-queue":
          operations.push({
            op: "create_priority_queue",
            name,
            description: description || undefined,
          });
          break;

        case "round-robin":
          operations.push({
            op: "create_round_robin",
            name,
            description: description || undefined,
          });
          break;

        case "drop-tail":
          operations.push({
            op: "create_drop_tail",
            name,
            queue_limit: queueLimit || undefined,
            description: description || undefined,
          });
          break;

        case "fair-queue":
          operations.push({
            op: "create_fair_queue",
            name,
            hash_interval: hashInterval || undefined,
            queue_limit: queueLimit || undefined,
            description: description || undefined,
          });
          break;

        case "random-detect":
          operations.push({
            op: "create_random_detect",
            name,
            bandwidth,
            description: description || undefined,
          });
          break;
      }

      const result = await qosService.batch(operations);

      if (result.success) {
        toast.success(
          isEditing ? "Policy Updated" : "Policy Created",
          `Policy "${name}" has been ${isEditing ? "updated" : "created"}`
        );
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Failed", result.error || "Operation failed");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (policyType) {
      case "shaper":
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="bandwidth">Total Bandwidth *</Label>
              <Input
                id="bandwidth"
                value={bandwidth}
                onChange={(e) => setBandwidth(e.target.value)}
                placeholder="e.g., 100mbit, 1gbit"
              />
            </div>
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-2">Default Class</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="default-bandwidth">Bandwidth</Label>
                  <Input
                    id="default-bandwidth"
                    value={defaultBandwidth}
                    onChange={(e) => setDefaultBandwidth(e.target.value)}
                    placeholder="e.g., 10%"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="default-ceiling">Ceiling</Label>
                  <Input
                    id="default-ceiling"
                    value={defaultCeiling}
                    onChange={(e) => setDefaultCeiling(e.target.value)}
                    placeholder="e.g., 100%"
                  />
                </div>
              </div>
              <div className="grid gap-2 mt-4">
                <Label htmlFor="default-queue-type">Queue Type</Label>
                <Select value={defaultQueueType} onValueChange={setDefaultQueueType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select queue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {capabilities?.queue_types.map((qt) => (
                      <SelectItem key={qt.value} value={qt.value}>
                        {qt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        );

      case "rate-control":
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="bandwidth">Bandwidth *</Label>
              <Input
                id="bandwidth"
                value={bandwidth}
                onChange={(e) => setBandwidth(e.target.value)}
                placeholder="e.g., 100mbit"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="burst">Burst</Label>
                <Input
                  id="burst"
                  value={burst}
                  onChange={(e) => setBurst(e.target.value)}
                  placeholder="e.g., 15k"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="latency">Latency</Label>
                <Input
                  id="latency"
                  value={latency}
                  onChange={(e) => setLatency(e.target.value)}
                  placeholder="e.g., 50ms"
                />
              </div>
            </div>
          </>
        );

      case "cake":
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="bandwidth">Bandwidth *</Label>
              <Input
                id="bandwidth"
                value={bandwidth}
                onChange={(e) => setBandwidth(e.target.value)}
                placeholder="e.g., 100mbit"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="flow-isolation">Flow Isolation</Label>
                <Select value={flowIsolation} onValueChange={setFlowIsolation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {capabilities?.flow_isolation_modes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rtt">RTT</Label>
                <Input
                  id="rtt"
                  value={rtt}
                  onChange={(e) => setRtt(e.target.value)}
                  placeholder="e.g., 100ms"
                />
              </div>
            </div>
          </>
        );

      case "fq-codel":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantum">Quantum</Label>
                <Input
                  id="quantum"
                  value={quantum}
                  onChange={(e) => setQuantum(e.target.value)}
                  placeholder="e.g., 300"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="flows">Flows</Label>
                <Input
                  id="flows"
                  value={flows}
                  onChange={(e) => setFlows(e.target.value)}
                  placeholder="e.g., 1024"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="target">Target</Label>
                <Input
                  id="target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g., 5ms"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="interval">Interval</Label>
                <Input
                  id="interval"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  placeholder="e.g., 100ms"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="queue-limit">Queue Limit</Label>
              <Input
                id="queue-limit"
                value={queueLimit}
                onChange={(e) => setQueueLimit(e.target.value)}
                placeholder="e.g., 10240"
              />
            </div>
          </>
        );

      case "network-emulator":
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="bandwidth">Bandwidth *</Label>
              <Input
                id="bandwidth"
                value={bandwidth}
                onChange={(e) => setBandwidth(e.target.value)}
                placeholder="e.g., 100mbit"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="delay">Delay</Label>
                <Input
                  id="delay"
                  value={delay}
                  onChange={(e) => setDelay(e.target.value)}
                  placeholder="e.g., 50ms"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="loss">Packet Loss (%)</Label>
                <Input
                  id="loss"
                  value={loss}
                  onChange={(e) => setLoss(e.target.value)}
                  placeholder="e.g., 5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="corruption">Corruption (%)</Label>
                <Input
                  id="corruption"
                  value={corruption}
                  onChange={(e) => setCorruption(e.target.value)}
                  placeholder="e.g., 1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reordering">Reordering (%)</Label>
                <Input
                  id="reordering"
                  value={reordering}
                  onChange={(e) => setReordering(e.target.value)}
                  placeholder="e.g., 5"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="queue-limit">Queue Limit</Label>
              <Input
                id="queue-limit"
                value={queueLimit}
                onChange={(e) => setQueueLimit(e.target.value)}
                placeholder="e.g., 1000"
              />
            </div>
          </>
        );

      case "limiter":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="default-bandwidth">Default Bandwidth</Label>
                <Input
                  id="default-bandwidth"
                  value={defaultBandwidth}
                  onChange={(e) => setDefaultBandwidth(e.target.value)}
                  placeholder="e.g., 100mbit"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="burst">Default Burst</Label>
                <Input
                  id="burst"
                  value={burst}
                  onChange={(e) => setBurst(e.target.value)}
                  placeholder="e.g., 15k"
                />
              </div>
            </div>
          </>
        );

      case "drop-tail":
      case "fair-queue":
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="queue-limit">Queue Limit</Label>
              <Input
                id="queue-limit"
                value={queueLimit}
                onChange={(e) => setQueueLimit(e.target.value)}
                placeholder="e.g., 1000"
              />
            </div>
            {policyType === "fair-queue" && (
              <div className="grid gap-2">
                <Label htmlFor="hash-interval">Hash Interval</Label>
                <Input
                  id="hash-interval"
                  value={hashInterval}
                  onChange={(e) => setHashInterval(e.target.value)}
                  placeholder="e.g., 10"
                />
              </div>
            )}
          </>
        );

      case "random-detect":
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="bandwidth">Bandwidth *</Label>
              <Input
                id="bandwidth"
                value={bandwidth}
                onChange={(e) => setBandwidth(e.target.value)}
                placeholder="e.g., 100mbit"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Policy" : "Create QoS Policy"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Policy Type */}
          <div className="grid gap-2">
            <Label htmlFor="policy-type">Policy Type</Label>
            <Select value={policyType} onValueChange={setPolicyType} disabled={isEditing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {capabilities?.policy_types.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    <div>
                      <span className="font-medium">{pt.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        - {pt.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Policy Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., WAN-SHAPER"
              disabled={isEditing}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          {/* Type-specific fields */}
          {renderTypeSpecificFields()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
