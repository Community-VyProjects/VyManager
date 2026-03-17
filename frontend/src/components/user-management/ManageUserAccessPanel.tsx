"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Server,
  Shield,
  X,
  Building2,
  Check,
  Eye,
  Edit3,
  Lock,
  Network,
  Wifi,
  Router,
  Pencil,
  UserCircle,
  ChevronDown,
  Activity,
  Box,
  Waypoints,
  Globe,
  FileText,
  List,
  MapPin,
  Workflow,
  Radio,
  Power,
  Scale,
} from "lucide-react";
import {
  userManagementService,
  UserListItem,
  UserInstanceAssignment,
  InstanceRole,
  FeatureGroup,
  FeaturePermission,
} from "@/lib/api/user-management";
import { sessionService, Site } from "@/lib/api/session";
import { ApiError } from "@/lib/types/api";

interface ManageUserAccessPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem;
  onSuccess: () => void;
}

interface InstanceWithSite {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
}

// Feature icons mapping
const FEATURE_ICONS: Record<FeatureGroup, any> = {
  [FeatureGroup.FIREWALL]: Shield,
  [FeatureGroup.NAT]: Network,
  [FeatureGroup.NAT64]: Globe,
  [FeatureGroup.DHCP]: Wifi,
  [FeatureGroup.INTERFACES]: Router,
  [FeatureGroup.FIREWALL_GROUPS]: Shield,
  [FeatureGroup.FIREWALL_POLICIES]: Shield,
  [FeatureGroup.FIREWALL_ZONES]: Shield,
  [FeatureGroup.FIREWALL_GLOBAL_OPTIONS]: Shield,
  [FeatureGroup.FIREWALL_BRIDGE]: Shield,
  [FeatureGroup.FIREWALL_FLOWTABLES]: Shield,
  [FeatureGroup.NETWORK]: Network,
  [FeatureGroup.VRF]: Network,
  [FeatureGroup.LOAD_BALANCING]: Scale,
  [FeatureGroup.VPN]: Lock,
  [FeatureGroup.IPSEC]: Lock,
  [FeatureGroup.WIREGUARD]: Lock,
  [FeatureGroup.ROUTING]: Router,
  [FeatureGroup.UNICAST_PROTOCOLS]: Router,
  [FeatureGroup.BGP]: Router,
  [FeatureGroup.OSPF]: Router,
  [FeatureGroup.OSPFV3]: Router,
  [FeatureGroup.ISIS]: Router,
  [FeatureGroup.OPENFABRIC]: Router,
  [FeatureGroup.RIP]: Router,
  [FeatureGroup.RIPNG]: Router,
  [FeatureGroup.BABEL]: Router,
  [FeatureGroup.STATIC_ROUTES]: Router,
  [FeatureGroup.FAILOVER]: Router,
  [FeatureGroup.ROUTING_INFRASTRUCTURE]: Router,
  [FeatureGroup.BFD]: Activity,
  [FeatureGroup.MPLS]: Box,
  [FeatureGroup.SEGMENT_ROUTING]: Waypoints,
  [FeatureGroup.NHRP]: Globe,
  [FeatureGroup.RPKI]: Shield,
  [FeatureGroup.ROUTING_POLICIES]: FileText,
  [FeatureGroup.ACCESS_LIST]: List,
  [FeatureGroup.PREFIX_LIST]: List,
  [FeatureGroup.ROUTE_POLICY]: FileText,
  [FeatureGroup.ROUTE_MAP]: MapPin,
  [FeatureGroup.LOCAL_ROUTE]: Router,
  [FeatureGroup.BGP_AS_PATH]: Workflow,
  [FeatureGroup.BGP_COMMUNITY]: Network,
  [FeatureGroup.BGP_EXTENDED_COMMUNITY]: Network,
  [FeatureGroup.BGP_LARGE_COMMUNITY]: Network,
  [FeatureGroup.MULTICAST]: Radio,
  [FeatureGroup.IGMP_PROXY]: Wifi,
  [FeatureGroup.PIM]: Radio,
  [FeatureGroup.PIM6]: Radio,
  [FeatureGroup.SYSTEM]: Server,
  [FeatureGroup.CONFIGURATION]: Server,
  [FeatureGroup.MONITORING]: Activity,
  [FeatureGroup.DASHBOARD]: Server,
  [FeatureGroup.SITES_INSTANCES]: Building2,
  [FeatureGroup.USER_MANAGEMENT]: UserCircle,
  [FeatureGroup.POWER]: Power,
  [FeatureGroup.HIGH_AVAILABILITY]: Shield,
};

// Feature display names
const FEATURE_NAMES: Record<FeatureGroup, string> = {
  [FeatureGroup.FIREWALL]: "Firewall",
  [FeatureGroup.NAT]: "NAT",
  [FeatureGroup.NAT64]: "NAT64",
  [FeatureGroup.DHCP]: "DHCP",
  [FeatureGroup.INTERFACES]: "Interfaces",
  [FeatureGroup.FIREWALL_GROUPS]: "Firewall Groups",
  [FeatureGroup.FIREWALL_POLICIES]: "Firewall Policies",
  [FeatureGroup.FIREWALL_ZONES]: "Firewall Zones",
  [FeatureGroup.FIREWALL_GLOBAL_OPTIONS]: "Firewall Global Options",
  [FeatureGroup.FIREWALL_BRIDGE]: "Bridge Firewall",
  [FeatureGroup.FIREWALL_FLOWTABLES]: "Flowtables",
  [FeatureGroup.NETWORK]: "Network",
  [FeatureGroup.VRF]: "VRF",
  [FeatureGroup.LOAD_BALANCING]: "Load Balancing",
  [FeatureGroup.VPN]: "VPN",
  [FeatureGroup.IPSEC]: "IPsec",
  [FeatureGroup.WIREGUARD]: "WireGuard",
  [FeatureGroup.ROUTING]: "Routing",
  [FeatureGroup.UNICAST_PROTOCOLS]: "Unicast Protocols",
  [FeatureGroup.BGP]: "BGP",
  [FeatureGroup.OSPF]: "OSPF",
  [FeatureGroup.OSPFV3]: "OSPFv3",
  [FeatureGroup.ISIS]: "IS-IS",
  [FeatureGroup.OPENFABRIC]: "OpenFabric",
  [FeatureGroup.RIP]: "RIP",
  [FeatureGroup.RIPNG]: "RIPng",
  [FeatureGroup.BABEL]: "Babel",
  [FeatureGroup.STATIC_ROUTES]: "Static Routes",
  [FeatureGroup.FAILOVER]: "Failover",
  [FeatureGroup.ROUTING_INFRASTRUCTURE]: "Routing Infrastructure",
  [FeatureGroup.BFD]: "BFD",
  [FeatureGroup.MPLS]: "MPLS",
  [FeatureGroup.SEGMENT_ROUTING]: "Segment Routing",
  [FeatureGroup.NHRP]: "NHRP",
  [FeatureGroup.RPKI]: "RPKI",
  [FeatureGroup.ROUTING_POLICIES]: "Routing Policies",
  [FeatureGroup.ACCESS_LIST]: "Access List",
  [FeatureGroup.PREFIX_LIST]: "Prefix List",
  [FeatureGroup.ROUTE_POLICY]: "Route",
  [FeatureGroup.ROUTE_MAP]: "Route Map",
  [FeatureGroup.LOCAL_ROUTE]: "Local Route",
  [FeatureGroup.BGP_AS_PATH]: "BGP AS Path",
  [FeatureGroup.BGP_COMMUNITY]: "BGP Community",
  [FeatureGroup.BGP_EXTENDED_COMMUNITY]: "BGP Extended Community",
  [FeatureGroup.BGP_LARGE_COMMUNITY]: "BGP Large Community",
  [FeatureGroup.MULTICAST]: "Multicast",
  [FeatureGroup.IGMP_PROXY]: "IGMP Proxy",
  [FeatureGroup.PIM]: "PIM",
  [FeatureGroup.PIM6]: "PIM6",
  [FeatureGroup.SYSTEM]: "System",
  [FeatureGroup.CONFIGURATION]: "Configuration",
  [FeatureGroup.MONITORING]: "Monitoring",
  [FeatureGroup.DASHBOARD]: "Dashboard",
  [FeatureGroup.SITES_INSTANCES]: "Sites & Instances",
  [FeatureGroup.USER_MANAGEMENT]: "User Management",
  [FeatureGroup.POWER]: "Power",
  [FeatureGroup.HIGH_AVAILABILITY]: "High Availability",
};

// Role badge styles
const ROLE_STYLES: Record<InstanceRole, { bg: string; text: string; icon: any }> = {
  [InstanceRole.ADMIN]: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: Shield },
  [InstanceRole.OPERATOR]: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: Edit3 },
  [InstanceRole.VIEWER]: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", icon: Eye },
};

// Helper function to initialize all features with default permissions
const getDefaultFeaturePermissions = (): Record<FeatureGroup, { canEdit: boolean; canView: boolean }> => {
  const permissions: any = {};
  for (const feature of Object.values(FeatureGroup)) {
    permissions[feature] = { canEdit: false, canView: false };
  }
  return permissions;
};

// Define parent-child feature relationships
interface FeatureHierarchy {
  feature: FeatureGroup;
  children?: FeatureHierarchy[];
  binary?: boolean; // true = single "Allow access" toggle instead of Edit/View
}

interface FeatureCategory {
  name: string;
  description: string;
  features: FeatureHierarchy[];
}

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    name: "VyOS Configuration",
    description: "Network and routing features",
    features: [
      {
        feature: FeatureGroup.FIREWALL,
        children: [
          { feature: FeatureGroup.FIREWALL_POLICIES },
          { feature: FeatureGroup.FIREWALL_GROUPS },
          { feature: FeatureGroup.FIREWALL_ZONES },
          { feature: FeatureGroup.FIREWALL_GLOBAL_OPTIONS },
          { feature: FeatureGroup.FIREWALL_BRIDGE },
          { feature: FeatureGroup.FIREWALL_FLOWTABLES },
        ],
      },
      {
        feature: FeatureGroup.NETWORK,
        children: [
          { feature: FeatureGroup.INTERFACES },
          { feature: FeatureGroup.DHCP },
          { feature: FeatureGroup.VRF },
          { feature: FeatureGroup.LOAD_BALANCING },
          { feature: FeatureGroup.NAT },
          { feature: FeatureGroup.NAT64 },
          { feature: FeatureGroup.HIGH_AVAILABILITY },
        ],
      },
      {
        feature: FeatureGroup.ROUTING,
        children: [
          {
            feature: FeatureGroup.UNICAST_PROTOCOLS,
            children: [
              { feature: FeatureGroup.BGP },
              { feature: FeatureGroup.OSPF },
              { feature: FeatureGroup.OSPFV3 },
              { feature: FeatureGroup.ISIS },
              { feature: FeatureGroup.OPENFABRIC },
              { feature: FeatureGroup.RIP },
              { feature: FeatureGroup.RIPNG },
              { feature: FeatureGroup.BABEL },
            ],
          },
          { feature: FeatureGroup.STATIC_ROUTES },
          { feature: FeatureGroup.FAILOVER },
          {
            feature: FeatureGroup.ROUTING_INFRASTRUCTURE,
            children: [
              { feature: FeatureGroup.BFD },
              { feature: FeatureGroup.MPLS },
              { feature: FeatureGroup.SEGMENT_ROUTING },
              { feature: FeatureGroup.NHRP },
              { feature: FeatureGroup.RPKI },
            ],
          },
          {
            feature: FeatureGroup.MULTICAST,
            children: [
              { feature: FeatureGroup.IGMP_PROXY },
              { feature: FeatureGroup.PIM },
              { feature: FeatureGroup.PIM6 },
            ],
          },
        ],
      },
      {
        feature: FeatureGroup.ROUTING_POLICIES,
        children: [
          { feature: FeatureGroup.ACCESS_LIST },
          { feature: FeatureGroup.PREFIX_LIST },
          { feature: FeatureGroup.ROUTE_POLICY },
          { feature: FeatureGroup.ROUTE_MAP },
          { feature: FeatureGroup.LOCAL_ROUTE },
          { feature: FeatureGroup.BGP_AS_PATH },
          { feature: FeatureGroup.BGP_COMMUNITY },
          { feature: FeatureGroup.BGP_EXTENDED_COMMUNITY },
          { feature: FeatureGroup.BGP_LARGE_COMMUNITY },
        ],
      },
      {
        feature: FeatureGroup.VPN,
        children: [
          { feature: FeatureGroup.IPSEC },
          { feature: FeatureGroup.WIREGUARD },
        ],
      },
    ],
  },
  {
    name: "System & General",
    description: "System settings and monitoring",
    features: [
      { feature: FeatureGroup.SYSTEM },
      { feature: FeatureGroup.CONFIGURATION },
      { feature: FeatureGroup.DASHBOARD },
      { feature: FeatureGroup.POWER },
      { feature: FeatureGroup.MONITORING, binary: true },
    ],
  },
];

export function ManageUserAccessPanel({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ManageUserAccessPanelProps) {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [assignments, setAssignments] = useState<UserInstanceAssignment[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [instances, setInstances] = useState<InstanceWithSite[]>([]);

  // Modal states
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<UserInstanceAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<UserInstanceAssignment | null>(null);

  // Grant form state
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<InstanceRole>(InstanceRole.VIEWER);

  // Feature permissions (only for OPERATOR/VIEWER roles)
  const [featurePermissions, setFeaturePermissions] = useState<Record<FeatureGroup, { canEdit: boolean; canView: boolean }>>(
    getDefaultFeaturePermissions()
  );

  // Collapsible category state (all open by default)
  const [openCategories, setOpenCategories] = useState<string[]>(
    FEATURE_CATEGORIES.map(cat => cat.name)
  );

  // Collapsible parent feature state (all closed by default for cleaner UI)
  const [openParentFeatures, setOpenParentFeatures] = useState<FeatureGroup[]>([]);

  // Collapsible child feature state (for three-level hierarchy)
  const [openChildFeatures, setOpenChildFeatures] = useState<FeatureGroup[]>([]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, user.id]);

  const loadData = async () => {
    setDataLoading(true);
    setError(null);

    try {
      const [assignmentsData, sitesData] = await Promise.all([
        userManagementService.getUserAssignments(user.id),
        sessionService.listSites(),
      ]);

      setAssignments(assignmentsData);
      setSites(sitesData);

      const allInstances: InstanceWithSite[] = [];
      for (const site of sitesData) {
        try {
          const siteInstances = await sessionService.listInstances(site.id);
          for (const instance of siteInstances) {
            allInstances.push({
              id: instance.id,
              name: instance.name,
              siteId: site.id,
              siteName: site.name,
            });
          }
        } catch (err) {
          console.error(`Failed to load instances for site ${site.name}:`, err);
        }
      }
      setInstances(allInstances);
    } catch (err) {
      setError((err as ApiError).message || "Failed to load data");
    } finally {
      setDataLoading(false);
    }
  };

  const resetGrantForm = () => {
    setSelectedSiteId("");
    setSelectedInstanceIds([]);
    setSelectedRole(InstanceRole.VIEWER);
    setFeaturePermissions(getDefaultFeaturePermissions());
  };

  const resetEditForm = () => {
    setSelectedRole(InstanceRole.VIEWER);
    setFeaturePermissions(getDefaultFeaturePermissions());
  };

  // Helper function to handle parent feature checkbox change (supports three-level hierarchy)
  const handleParentFeatureChange = (
    parentFeature: FeatureGroup,
    children: FeatureHierarchy[] | undefined,
    checked: boolean,
    isEdit: boolean
  ) => {
    setFeaturePermissions((prev) => {
      const updated = { ...prev };

      // Update parent
      if (isEdit) {
        updated[parentFeature] = {
          canEdit: checked,
          canView: checked ? true : prev[parentFeature].canView,
        };
      } else {
        updated[parentFeature] = {
          canView: checked,
          canEdit: checked ? prev[parentFeature].canEdit : false,
        };
      }

      // Recursive function to update all descendants
      const updateDescendants = (hierarchyArray: FeatureHierarchy[]) => {
        hierarchyArray.forEach((item) => {
          // Update this level
          if (isEdit) {
            updated[item.feature] = {
              canEdit: checked,
              canView: checked ? true : prev[item.feature].canView,
            };
          } else {
            updated[item.feature] = {
              canView: checked,
              canEdit: checked ? prev[item.feature].canEdit : false,
            };
          }

          // Recursively update children if they exist
          if (item.children && item.children.length > 0) {
            updateDescendants(item.children);
          }
        });
      };

      // Update all children and grandchildren if they exist
      if (children && children.length > 0) {
        updateDescendants(children);
      }

      return updated;
    });
  };

  // Helper function to handle child feature checkbox change (supports descendants)
  const handleChildFeatureChange = (
    childFeature: FeatureGroup,
    checked: boolean,
    isEdit: boolean,
    children?: FeatureHierarchy[]
  ) => {
    setFeaturePermissions((prev) => {
      const updated = { ...prev };

      // Update child
      if (isEdit) {
        updated[childFeature] = {
          canEdit: checked,
          canView: checked ? true : prev[childFeature].canView,
        };
      } else {
        updated[childFeature] = {
          canView: checked,
          canEdit: checked ? prev[childFeature].canEdit : false,
        };
      }

      // Recursive function to update all descendants
      const updateDescendants = (hierarchyArray: FeatureHierarchy[]) => {
        hierarchyArray.forEach((item) => {
          // Update this level
          if (isEdit) {
            updated[item.feature] = {
              canEdit: checked,
              canView: checked ? true : prev[item.feature].canView,
            };
          } else {
            updated[item.feature] = {
              canView: checked,
              canEdit: checked ? prev[item.feature].canEdit : false,
            };
          }

          // Recursively update children if they exist
          if (item.children && item.children.length > 0) {
            updateDescendants(item.children);
          }
        });
      };

      // Update all descendants if they exist
      if (children && children.length > 0) {
        updateDescendants(children);
      }

      return updated;
    });
  };

  // Toggle category expansion
  const toggleCategory = (categoryName: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  // Toggle parent feature expansion
  const toggleParentFeature = (feature: FeatureGroup) => {
    setOpenParentFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  // Toggle child feature expansion (for three-level hierarchy)
  const toggleChildFeature = (feature: FeatureGroup) => {
    setOpenChildFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const handleClose = () => {
    resetGrantForm();
    resetEditForm();
    setShowGrantModal(false);
    setEditingAssignment(null);
    setDeletingAssignment(null);
    setError(null);
    onOpenChange(false);
  };

  const handleOpenGrantModal = () => {
    resetGrantForm();
    setError(null);
    setShowGrantModal(true);
  };

  const handleOpenEditModal = (assignment: UserInstanceAssignment) => {
    setEditingAssignment(assignment);
    setSelectedRole(assignment.role as InstanceRole);

    if (assignment.feature_permissions && assignment.feature_permissions.length > 0) {
      const perms = getDefaultFeaturePermissions();

      assignment.feature_permissions.forEach((perm) => {
        if (perm.feature in perms) {
          perms[perm.feature as FeatureGroup] = {
            canEdit: perm.can_edit,
            canView: perm.can_view,
          };
        }
      });

      setFeaturePermissions(perms);
    }
    setError(null);
  };

  const handleOpenDeleteModal = (assignment: UserInstanceAssignment) => {
    setDeletingAssignment(assignment);
  };

  const handleDeleteAssignment = async () => {
    if (!deletingAssignment) return;

    setLoading(true);
    setError(null);

    try {
      await userManagementService.removeAssignment(deletingAssignment.id);
      setDeletingAssignment(null);
      await loadData();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to remove assignment");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;

    setError(null);

    if (selectedRole !== InstanceRole.ADMIN) {
      const hasAnyPermission = Object.values(featurePermissions).some(
        perm => perm.canEdit || perm.canView
      );
      if (!hasAnyPermission) {
        setError("Please select at least one feature permission");
        return;
      }
    }

    setLoading(true);

    try {
      await userManagementService.removeAssignment(editingAssignment.id);

      const permissions: FeaturePermission[] = selectedRole === InstanceRole.ADMIN
        ? []
        : Object.entries(featurePermissions)
            .filter(([_, perm]) => perm.canEdit || perm.canView)
            .map(([feature, perm]) => ({
              feature: feature as FeatureGroup,
              can_edit: perm.canEdit,
              can_view: perm.canView,
            }));

      await userManagementService.assignUser({
        user_id: user.id,
        instance_ids: [editingAssignment.instance_id],
        role: selectedRole,
        feature_permissions: permissions.length > 0 ? permissions : undefined,
      });

      setEditingAssignment(null);
      resetEditForm();
      await loadData();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update assignment");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async () => {
    setError(null);

    if (selectedInstanceIds.length === 0) {
      setError("Please select at least one instance");
      return;
    }

    if (selectedRole !== InstanceRole.ADMIN) {
      const hasAnyPermission = Object.values(featurePermissions).some(
        perm => perm.canEdit || perm.canView
      );
      if (!hasAnyPermission) {
        setError("Please select at least one feature permission");
        return;
      }
    }

    setLoading(true);

    try {
      const permissions: FeaturePermission[] = selectedRole === InstanceRole.ADMIN
        ? []
        : Object.entries(featurePermissions)
            .filter(([_, perm]) => perm.canEdit || perm.canView)
            .map(([feature, perm]) => ({
              feature: feature as FeatureGroup,
              can_edit: perm.canEdit,
              can_view: perm.canView,
            }));

      await userManagementService.assignUser({
        user_id: user.id,
        instance_ids: selectedInstanceIds,
        role: selectedRole,
        feature_permissions: permissions.length > 0 ? permissions : undefined,
      });

      setShowGrantModal(false);
      resetGrantForm();
      await loadData();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to assign user");
    } finally {
      setLoading(false);
    }
  };

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    setSelectedInstanceIds([]);
  };

  const handleSelectAllInstances = () => {
    const siteInstances = instances
      .filter((inst) => inst.siteId === selectedSiteId)
      .map((inst) => inst.id);
    setSelectedInstanceIds(siteInstances);
  };

  const handleInstanceToggle = (instanceId: string) => {
    setSelectedInstanceIds((prev) =>
      prev.includes(instanceId)
        ? prev.filter((id) => id !== instanceId)
        : [...prev, instanceId]
    );
  };

  const filteredInstances = selectedSiteId
    ? instances.filter((inst) => inst.siteId === selectedSiteId)
    : [];

  const assignmentsBySite = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.site_name]) {
      acc[assignment.site_name] = [];
    }
    acc[assignment.site_name].push(assignment);
    return acc;
  }, {} as Record<string, UserInstanceAssignment[]>);

  return (
    <>
      {/* Main Slide-out Panel */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[450px] p-0 flex flex-col">
          {/* Sticky Header */}
          <div className="px-6 py-4 border-b bg-background sticky top-0 z-10">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-lg font-semibold">{user.name || user.email}</div>
                  <div className="text-sm text-muted-foreground font-normal">Manage Access</div>
                </div>
              </SheetTitle>
            </SheetHeader>
            <Button
              onClick={handleOpenGrantModal}
              className="w-full mt-4 gap-2"
              disabled={dataLoading}
            >
              <Plus className="h-4 w-4" />
              Grant Access
            </Button>
          </div>

          {/* Scrollable Content */}
          {dataLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="px-6 py-4 space-y-4">
                {/* Summary */}
                <div className="text-sm text-muted-foreground">
                  {assignments.length === 0
                    ? "No access granted yet"
                    : `${assignments.length} instance${assignments.length === 1 ? '' : 's'} across ${Object.keys(assignmentsBySite).length} site${Object.keys(assignmentsBySite).length === 1 ? '' : 's'}`
                  }
                </div>

                {assignments.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium text-foreground mb-1">No Instance Access</p>
                    <p className="text-xs text-muted-foreground">
                      Click "Grant Access" to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(assignmentsBySite).map(([siteName, siteAssignments]) => (
                      <div key={siteName} className="space-y-2">
                        {/* Site Header */}
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{siteName}</span>
                        </div>

                        {/* Instances */}
                        <div className="space-y-2">
                          {siteAssignments.map((assignment) => {
                            const roleStyle = ROLE_STYLES[assignment.role as InstanceRole];
                            const RoleIcon = roleStyle.icon;

                            return (
                              <div
                                key={assignment.id}
                                className="border border-border rounded-lg p-3 bg-card hover:bg-accent/5 transition-colors"
                              >
                                <div className="space-y-2">
                                  {/* Instance Name & Role */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm text-foreground truncate">
                                        {assignment.instance_name}
                                      </div>
                                      <Badge variant="secondary" className={`${roleStyle.bg} ${roleStyle.text} border-0 gap-1 mt-1.5`}>
                                        <RoleIcon className="h-3 w-3" />
                                        <span className="text-xs">{assignment.role}</span>
                                      </Badge>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10"
                                        onClick={() => handleOpenEditModal(assignment)}
                                        title="Edit"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleOpenDeleteModal(assignment)}
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Feature Permissions */}
                                  {assignment.role !== InstanceRole.ADMIN && assignment.feature_permissions && assignment.feature_permissions.length > 0 && (
                                    <div className="pt-2 border-t">
                                      <div className="flex flex-wrap gap-1">
                                        {assignment.feature_permissions.map((perm) => {
                                          const FeatureIcon = FEATURE_ICONS[perm.feature as FeatureGroup];
                                          return (
                                            <Badge
                                              key={perm.feature}
                                              variant="outline"
                                              className="gap-1 text-xs"
                                            >
                                              <FeatureIcon className="h-2.5 w-2.5" />
                                              {FEATURE_NAMES[perm.feature as FeatureGroup]}
                                              {perm.can_edit ? (
                                                <Edit3 className="h-2.5 w-2.5 text-blue-500" />
                                              ) : (
                                                <Eye className="h-2.5 w-2.5 text-gray-500" />
                                              )}
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* ADMIN full access */}
                                  {assignment.role === InstanceRole.ADMIN && (
                                    <div className="pt-2 border-t">
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Check className="h-3 w-3 text-green-500" />
                                        Full access to all features
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Grant Access Modal */}
      <Dialog open={showGrantModal} onOpenChange={setShowGrantModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Grant Access</DialogTitle>
            <DialogDescription>
              Assign {user.name || user.email} to one or more instances
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6 overflow-y-auto">
            <div className="space-y-5 pb-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Site Selection */}
              <div className="space-y-2">
                <Label>Select Site</Label>
                <Select value={selectedSiteId} onValueChange={handleSiteChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a site..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => {
                      const instanceCount = instances.filter(i => i.siteId === site.id).length;
                      return (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name} ({instanceCount} {instanceCount === 1 ? 'instance' : 'instances'})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Instance Selection */}
              {selectedSiteId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Instances</Label>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={handleSelectAllInstances}
                    >
                      Select All
                    </Button>
                  </div>
                  <div className="border rounded-lg">
                    <ScrollArea className="max-h-40">
                      <div className="p-2 space-y-1">
                        {filteredInstances.map((instance) => (
                          <div
                            key={instance.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                          >
                            <Checkbox
                              id={`grant-instance-${instance.id}`}
                              checked={selectedInstanceIds.includes(instance.id)}
                              onCheckedChange={() => handleInstanceToggle(instance.id)}
                            />
                            <label
                              htmlFor={`grant-instance-${instance.id}`}
                              className="flex-1 cursor-pointer text-sm"
                            >
                              {instance.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  {selectedInstanceIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedInstanceIds.length} selected
                    </p>
                  )}
                </div>
              )}

              {/* Role Selection */}
              {selectedInstanceIds.length > 0 && (
                <div className="space-y-2">
                  <Label>Instance Role</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => setSelectedRole(value as InstanceRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={InstanceRole.ADMIN}>Instance ADMIN - Full access</SelectItem>
                      <SelectItem value={InstanceRole.OPERATOR}>Instance OPERATOR - Edit selected features</SelectItem>
                      <SelectItem value={InstanceRole.VIEWER}>Instance VIEWER - View selected features</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Feature Permissions */}
              {selectedRole !== InstanceRole.ADMIN && selectedInstanceIds.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <Label>Feature Permissions</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check a parent feature to grant all sub-features, or select specific sub-features individually.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {FEATURE_CATEGORIES.map((category) => {
                      const isOpen = openCategories.includes(category.name);
                      const isEditable = selectedRole === InstanceRole.OPERATOR;

                      return (
                        <Collapsible
                          key={category.name}
                          open={isOpen}
                          onOpenChange={() => toggleCategory(category.name)}
                        >
                          <div className="border rounded-lg overflow-hidden">
                            {/* Category Header */}
                            <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/70 transition-colors">
                              <div className="flex items-center gap-2">
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 transition-transform",
                                    isOpen && "rotate-180"
                                  )}
                                />
                                <div className="text-left">
                                  <p className="text-sm font-semibold">{category.name}</p>
                                  <p className="text-xs text-muted-foreground">{category.description}</p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {category.features.length} features
                              </Badge>
                            </CollapsibleTrigger>

                            {/* Category Content */}
                            <CollapsibleContent>
                              <div className="divide-y">
                                {category.features.map((item) => {
                                  const FeatureIcon = FEATURE_ICONS[item.feature];
                                  const hasChildren = item.children && item.children.length > 0;
                                  const isParentOpen = openParentFeatures.includes(item.feature);

                                  return (
                                    <div key={item.feature}>
                                      {/* Parent Feature */}
                                      <div className="p-3 flex items-center justify-between gap-4 bg-background">
                                        <div className="flex items-center gap-2">
                                          {hasChildren && (
                                            <button
                                              onClick={() => toggleParentFeature(item.feature)}
                                              className="hover:bg-muted rounded p-0.5"
                                            >
                                              <ChevronDown
                                                className={cn(
                                                  "h-3.5 w-3.5 transition-transform text-muted-foreground",
                                                  isParentOpen && "rotate-180"
                                                )}
                                              />
                                            </button>
                                          )}
                                          {!hasChildren && <div className="w-5" />}
                                          <FeatureIcon className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm font-medium">{FEATURE_NAMES[item.feature]}</span>
                                          {hasChildren && (
                                            <Badge variant="outline" className="text-xs">
                                              {item.children?.length || 0}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                          {item.binary ? (
                                            <div className="flex items-center gap-1.5">
                                              <Checkbox
                                                id={`grant-${item.feature}-access`}
                                                checked={featurePermissions[item.feature].canEdit}
                                                onCheckedChange={(checked) => {
                                                  setFeaturePermissions((prev) => ({
                                                    ...prev,
                                                    [item.feature]: { canEdit: checked === true, canView: checked === true },
                                                  }));
                                                }}
                                              />
                                              <label htmlFor={`grant-${item.feature}-access`} className="text-xs cursor-pointer">
                                                Allow access
                                              </label>
                                            </div>
                                          ) : (
                                            <>
                                              {isEditable && (
                                                <div className="flex items-center gap-1.5">
                                                  <Checkbox
                                                    id={`grant-${item.feature}-edit`}
                                                    checked={featurePermissions[item.feature].canEdit}
                                                    onCheckedChange={(checked) => {
                                                      handleParentFeatureChange(item.feature, item.children, checked === true, true);
                                                    }}
                                                  />
                                                  <label htmlFor={`grant-${item.feature}-edit`} className="text-xs cursor-pointer">
                                                    Edit
                                                  </label>
                                                </div>
                                              )}
                                              <div className="flex items-center gap-1.5">
                                                <Checkbox
                                                  id={`grant-${item.feature}-view`}
                                                  checked={featurePermissions[item.feature].canView}
                                                  onCheckedChange={(checked) => {
                                                    handleParentFeatureChange(item.feature, item.children, checked === true, false);
                                                  }}
                                                />
                                                <label htmlFor={`grant-${item.feature}-view`} className="text-xs cursor-pointer">
                                                  View
                                                </label>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Child Features (Level 2) */}
                                      {hasChildren && isParentOpen && item.children?.map((child) => {
                                        const ChildIcon = FEATURE_ICONS[child.feature];
                                        const hasGrandchildren = child.children && child.children.length > 0;
                                        const isChildOpen = openChildFeatures.includes(child.feature);

                                        return (
                                          <div key={child.feature}>
                                            <div className="p-2.5 pl-10 flex items-center justify-between gap-4 border-t border-dashed bg-muted/20">
                                              <div className="flex items-center gap-2">
                                                {hasGrandchildren && (
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleChildFeature(child.feature)}
                                                    className="hover:bg-muted rounded p-0.5"
                                                  >
                                                    <ChevronDown
                                                      className={cn(
                                                        "h-3 w-3 transition-transform text-muted-foreground",
                                                        isChildOpen && "rotate-180"
                                                      )}
                                                    />
                                                  </button>
                                                )}
                                                {!hasGrandchildren && <div className="w-4" />}
                                                <ChildIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">{FEATURE_NAMES[child.feature]}</span>
                                                {hasGrandchildren && (
                                                  <Badge variant="outline" className="text-xs">
                                                    {child.children?.length || 0}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-4">
                                                {isEditable && (
                                                  <div className="flex items-center gap-1.5">
                                                    <Checkbox
                                                      id={`grant-${child.feature}-edit`}
                                                      checked={featurePermissions[child.feature].canEdit}
                                                      onCheckedChange={(checked) => {
                                                        handleChildFeatureChange(child.feature, checked === true, true, child.children);
                                                      }}
                                                    />
                                                    <label htmlFor={`grant-${child.feature}-edit`} className="text-xs cursor-pointer">
                                                      Edit
                                                    </label>
                                                  </div>
                                                )}
                                                <div className="flex items-center gap-1.5">
                                                  <Checkbox
                                                    id={`grant-${child.feature}-view`}
                                                    checked={featurePermissions[child.feature].canView}
                                                    onCheckedChange={(checked) => {
                                                      handleChildFeatureChange(child.feature, checked === true, false, child.children);
                                                    }}
                                                  />
                                                  <label htmlFor={`grant-${child.feature}-view`} className="text-xs cursor-pointer">
                                                    View
                                                  </label>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Grandchild Features (Level 3) */}
                                            {hasGrandchildren && isChildOpen && child.children?.map((grandchild) => {
                                              const GrandchildIcon = FEATURE_ICONS[grandchild.feature];
                                              return (
                                                <div key={grandchild.feature} className="p-2.5 pl-20 flex items-center justify-between gap-4 border-t border-dashed bg-muted/30">
                                                  <div className="flex items-center gap-2">
                                                    <GrandchildIcon className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">{FEATURE_NAMES[grandchild.feature]}</span>
                                                  </div>
                                                  <div className="flex items-center gap-4">
                                                    {isEditable && (
                                                      <div className="flex items-center gap-1.5">
                                                        <Checkbox
                                                          id={`grant-${grandchild.feature}-edit`}
                                                          checked={featurePermissions[grandchild.feature].canEdit}
                                                          onCheckedChange={(checked) => {
                                                            handleChildFeatureChange(grandchild.feature, checked === true, true);
                                                          }}
                                                        />
                                                        <label htmlFor={`grant-${grandchild.feature}-edit`} className="text-xs cursor-pointer">
                                                          Edit
                                                        </label>
                                                      </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5">
                                                      <Checkbox
                                                        id={`grant-${grandchild.feature}-view`}
                                                        checked={featurePermissions[grandchild.feature].canView}
                                                        onCheckedChange={(checked) => {
                                                          handleChildFeatureChange(grandchild.feature, checked === true, false);
                                                        }}
                                                      />
                                                      <label htmlFor={`grant-${grandchild.feature}-view`} className="text-xs cursor-pointer">
                                                        View
                                                      </label>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGrantAccess} disabled={loading || selectedInstanceIds.length === 0}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Access Modal */}
      <Dialog open={!!editingAssignment} onOpenChange={(open) => !open && setEditingAssignment(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Access</DialogTitle>
            <DialogDescription>
              Modify permissions for {editingAssignment?.instance_name}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6 overflow-y-auto">
            <div className="space-y-5 pb-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Instance Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as InstanceRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={InstanceRole.ADMIN}>Instance ADMIN - Full access</SelectItem>
                    <SelectItem value={InstanceRole.OPERATOR}>Instance OPERATOR - Edit selected features</SelectItem>
                    <SelectItem value={InstanceRole.VIEWER}>Instance VIEWER - View selected features</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Feature Permissions */}
              {selectedRole !== InstanceRole.ADMIN && (
                <div className="space-y-3">
                  <div>
                    <Label>Feature Permissions</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check a parent feature to grant all sub-features, or select specific sub-features individually.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {FEATURE_CATEGORIES.map((category) => {
                      const isOpen = openCategories.includes(category.name);
                      const isEditable = selectedRole === InstanceRole.OPERATOR;

                      return (
                        <Collapsible
                          key={category.name}
                          open={isOpen}
                          onOpenChange={() => toggleCategory(category.name)}
                        >
                          <div className="border rounded-lg overflow-hidden">
                            {/* Category Header */}
                            <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/70 transition-colors">
                              <div className="flex items-center gap-2">
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 transition-transform",
                                    isOpen && "rotate-180"
                                  )}
                                />
                                <div className="text-left">
                                  <p className="text-sm font-semibold">{category.name}</p>
                                  <p className="text-xs text-muted-foreground">{category.description}</p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {category.features.length} features
                              </Badge>
                            </CollapsibleTrigger>

                            {/* Category Content */}
                            <CollapsibleContent>
                              <div className="divide-y">
                                {category.features.map((item) => {
                                  const FeatureIcon = FEATURE_ICONS[item.feature];
                                  const hasChildren = item.children && item.children.length > 0;
                                  const isParentOpen = openParentFeatures.includes(item.feature);

                                  return (
                                    <div key={item.feature}>
                                      {/* Parent Feature */}
                                      <div className="p-3 flex items-center justify-between gap-4 bg-background">
                                        <div className="flex items-center gap-2">
                                          {hasChildren && (
                                            <button
                                              onClick={() => toggleParentFeature(item.feature)}
                                              className="hover:bg-muted rounded p-0.5"
                                            >
                                              <ChevronDown
                                                className={cn(
                                                  "h-3.5 w-3.5 transition-transform text-muted-foreground",
                                                  isParentOpen && "rotate-180"
                                                )}
                                              />
                                            </button>
                                          )}
                                          {!hasChildren && <div className="w-5" />}
                                          <FeatureIcon className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm font-medium">{FEATURE_NAMES[item.feature]}</span>
                                          {hasChildren && (
                                            <Badge variant="outline" className="text-xs">
                                              {item.children?.length || 0}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                          {item.binary ? (
                                            <div className="flex items-center gap-1.5">
                                              <Checkbox
                                                id={`edit-${item.feature}-access`}
                                                checked={featurePermissions[item.feature].canEdit}
                                                onCheckedChange={(checked) => {
                                                  setFeaturePermissions((prev) => ({
                                                    ...prev,
                                                    [item.feature]: { canEdit: checked === true, canView: checked === true },
                                                  }));
                                                }}
                                              />
                                              <label htmlFor={`edit-${item.feature}-access`} className="text-xs cursor-pointer">
                                                Allow access
                                              </label>
                                            </div>
                                          ) : (
                                            <>
                                              {isEditable && (
                                                <div className="flex items-center gap-1.5">
                                                  <Checkbox
                                                    id={`edit-${item.feature}-edit`}
                                                    checked={featurePermissions[item.feature].canEdit}
                                                    onCheckedChange={(checked) => {
                                                      handleParentFeatureChange(item.feature, item.children, checked === true, true);
                                                    }}
                                                  />
                                                  <label htmlFor={`edit-${item.feature}-edit`} className="text-xs cursor-pointer">
                                                    Edit
                                                  </label>
                                                </div>
                                              )}
                                              <div className="flex items-center gap-1.5">
                                                <Checkbox
                                                  id={`edit-${item.feature}-view`}
                                                  checked={featurePermissions[item.feature].canView}
                                                  onCheckedChange={(checked) => {
                                                    handleParentFeatureChange(item.feature, item.children, checked === true, false);
                                                  }}
                                                />
                                                <label htmlFor={`edit-${item.feature}-view`} className="text-xs cursor-pointer">
                                                  View
                                                </label>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Child Features (Level 2) */}
                                      {hasChildren && isParentOpen && item.children?.map((child) => {
                                        const ChildIcon = FEATURE_ICONS[child.feature];
                                        const hasGrandchildren = child.children && child.children.length > 0;
                                        const isChildOpen = openChildFeatures.includes(child.feature);

                                        return (
                                          <div key={child.feature}>
                                            <div className="p-2.5 pl-10 flex items-center justify-between gap-4 border-t border-dashed bg-muted/20">
                                              <div className="flex items-center gap-2">
                                                {hasGrandchildren && (
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleChildFeature(child.feature)}
                                                    className="hover:bg-muted rounded p-0.5"
                                                  >
                                                    <ChevronDown
                                                      className={cn(
                                                        "h-3 w-3 transition-transform text-muted-foreground",
                                                        isChildOpen && "rotate-180"
                                                      )}
                                                    />
                                                  </button>
                                                )}
                                                {!hasGrandchildren && <div className="w-4" />}
                                                <ChildIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">{FEATURE_NAMES[child.feature]}</span>
                                                {hasGrandchildren && (
                                                  <Badge variant="outline" className="text-xs">
                                                    {child.children?.length || 0}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-4">
                                                {isEditable && (
                                                  <div className="flex items-center gap-1.5">
                                                    <Checkbox
                                                      id={`edit-${child.feature}-edit`}
                                                      checked={featurePermissions[child.feature].canEdit}
                                                      onCheckedChange={(checked) => {
                                                        handleChildFeatureChange(child.feature, checked === true, true, child.children);
                                                      }}
                                                    />
                                                    <label htmlFor={`edit-${child.feature}-edit`} className="text-xs cursor-pointer">
                                                      Edit
                                                    </label>
                                                  </div>
                                                )}
                                                <div className="flex items-center gap-1.5">
                                                  <Checkbox
                                                    id={`edit-${child.feature}-view`}
                                                    checked={featurePermissions[child.feature].canView}
                                                    onCheckedChange={(checked) => {
                                                      handleChildFeatureChange(child.feature, checked === true, false, child.children);
                                                    }}
                                                  />
                                                  <label htmlFor={`edit-${child.feature}-view`} className="text-xs cursor-pointer">
                                                    View
                                                  </label>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Grandchild Features (Level 3) */}
                                            {hasGrandchildren && isChildOpen && child.children?.map((grandchild) => {
                                              const GrandchildIcon = FEATURE_ICONS[grandchild.feature];
                                              return (
                                                <div key={grandchild.feature} className="p-2.5 pl-20 flex items-center justify-between gap-4 border-t border-dashed bg-muted/30">
                                                  <div className="flex items-center gap-2">
                                                    <GrandchildIcon className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">{FEATURE_NAMES[grandchild.feature]}</span>
                                                  </div>
                                                  <div className="flex items-center gap-4">
                                                    {isEditable && (
                                                      <div className="flex items-center gap-1.5">
                                                        <Checkbox
                                                          id={`edit-${grandchild.feature}-edit`}
                                                          checked={featurePermissions[grandchild.feature].canEdit}
                                                          onCheckedChange={(checked) => {
                                                            handleChildFeatureChange(grandchild.feature, checked === true, true);
                                                          }}
                                                        />
                                                        <label htmlFor={`edit-${grandchild.feature}-edit`} className="text-xs cursor-pointer">
                                                          Edit
                                                        </label>
                                                      </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5">
                                                      <Checkbox
                                                        id={`edit-${grandchild.feature}-view`}
                                                        checked={featurePermissions[grandchild.feature].canView}
                                                        onCheckedChange={(checked) => {
                                                          handleChildFeatureChange(grandchild.feature, checked === true, false);
                                                        }}
                                                      />
                                                      <label htmlFor={`edit-${grandchild.feature}-view`} className="text-xs cursor-pointer">
                                                        View
                                                      </label>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAssignment(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAssignment} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingAssignment} onOpenChange={(open) => !open && setDeletingAssignment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke access to {deletingAssignment?.instance_name}?
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{deletingAssignment?.instance_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{deletingAssignment?.site_name}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingAssignment(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAssignment} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
