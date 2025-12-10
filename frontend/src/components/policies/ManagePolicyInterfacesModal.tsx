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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Network, Loader2 } from "lucide-react";
import { routeService } from "@/lib/api/route";
import { apiClient } from "@/lib/api/client";

interface ManagePolicyInterfacesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyType: string;
  policyName: string;
  onSuccess: () => void;
}

interface InterfaceOption {
  name: string;
  type: string;
  description?: string;
}

export function ManagePolicyInterfacesModal({
  open,
  onOpenChange,
  policyType,
  policyName,
  onSuccess,
}: ManagePolicyInterfacesModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceOption[]>([]);
  const [selectedInterfaces, setSelectedInterfaces] = useState<Set<string>>(new Set());
  const [originalInterfaces, setOriginalInterfaces] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, policyType, policyName]);

  const loadData = async () => {
    setLoadingData(true);
    setError(null);
    try {
      // Load all available interfaces
      const [ethernetResponse, dummyResponse] = await Promise.all([
        apiClient.get<{interfaces: Array<{name: string, type: string, description?: string, vif?: Array<{vlan_id: string, description?: string}>}>}>("/vyos/ethernet/config"),
        apiClient.get<{interfaces: Array<{name: string, type: string, description?: string}>}>("/vyos/dummy/config"),
      ]);

      const allInterfaces: InterfaceOption[] = [
        ...ethernetResponse.interfaces.flatMap(i => {
          const interfaces: InterfaceOption[] = [{name: i.name, type: "ethernet", description: i.description}];
          // Add VLANs if they exist
          if (i.vif && Array.isArray(i.vif)) {
            i.vif.forEach(vlan => {
              interfaces.push({
                name: `${i.name}.${vlan.vlan_id}`,
                type: "ethernet",
                description: vlan.description || `VLAN ${vlan.vlan_id}`,
              });
            });
          }
          return interfaces;
        }),
        ...dummyResponse.interfaces.map(i => ({name: i.name, type: "dummy", description: i.description})),
      ];
      setAvailableInterfaces(allInterfaces);

      // Load currently assigned interfaces
      const config = await routeService.getConfig(true);
      const policies = policyType === "route" ? config.ipv4_policies : config.ipv6_policies;
      const policy = policies.find(p => p.name === policyName);

      const assigned = new Set<string>();
      if (policy && policy.interfaces) {
        policy.interfaces.forEach(iface => assigned.add(iface.name));
      }
      setSelectedInterfaces(assigned);
      setOriginalInterfaces(assigned);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleInterface = (interfaceName: string) => {
    const newSelected = new Set(selectedInterfaces);
    if (newSelected.has(interfaceName)) {
      newSelected.delete(interfaceName);
    } else {
      newSelected.add(interfaceName);
    }
    setSelectedInterfaces(newSelected);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Determine which interfaces to add and remove
      const toAdd = Array.from(selectedInterfaces).filter(i => !originalInterfaces.has(i));
      const toRemove = Array.from(originalInterfaces).filter(i => !selectedInterfaces.has(i));

      // Add interfaces
      for (const interfaceName of toAdd) {
        await routeService.addInterfaceToPolicy(
          policyType,
          policyName,
          "", // type not needed anymore
          interfaceName
        );
      }

      // Remove interfaces
      for (const interfaceName of toRemove) {
        await routeService.removeInterfaceFromPolicy(
          policyType,
          policyName,
          "", // type not needed anymore
          interfaceName
        );
      }

      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update interfaces");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSelectedInterfaces(new Set());
      setOriginalInterfaces(new Set());
      setAvailableInterfaces([]);
      onOpenChange(false);
    }
  };

  const hasChanges = () => {
    if (selectedInterfaces.size !== originalInterfaces.size) return true;
    for (const iface of selectedInterfaces) {
      if (!originalInterfaces.has(iface)) return true;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Policy Interfaces</DialogTitle>
          <DialogDescription>
            Select interfaces to apply the "{policyName}" policy to.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              {availableInterfaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No interfaces available</p>
                </div>
              ) : (
                availableInterfaces.map((iface) => (
                  <div
                    key={iface.name}
                    className="flex items-center space-x-3 p-2 hover:bg-accent rounded-md"
                  >
                    <Checkbox
                      id={`iface-${iface.name}`}
                      checked={selectedInterfaces.has(iface.name)}
                      onCheckedChange={() => handleToggleInterface(iface.name)}
                      disabled={loading}
                    />
                    <Label
                      htmlFor={`iface-${iface.name}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{iface.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({iface.type})
                          </span>
                        </div>
                        {iface.description && (
                          <span className="text-xs text-muted-foreground">
                            {iface.description}
                          </span>
                        )}
                      </div>
                    </Label>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || loadingData || !hasChanges()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
