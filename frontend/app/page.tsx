"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "@/components/ui/use-toast";
import { ConfigTree } from "@/components/config-tree";
import { ConfigEditor } from "@/components/config-editor";
import { InterfacesList } from "@/components/interfaces-list";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  RefreshCw,
  Save,
  Settings,
  Network,
  Shield,
  Route,
  Globe,
  Server,
  MoreHorizontal,
  AlertCircle,
  Home,
  Info,
  Activity,
  ChevronDown,
  ChevronRight,
  Database,
  Wifi,
  Clock,
  Terminal,
  ArrowLeftRight,
  Box,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { ConfigDisplay } from "@/components/config-display";
import { Alert, AlertDescription } from "@/components/ui/alert";
import InterfacesPage from "./interfaces/page";
import ServicesPage from "./services/page";
import FirewallPage from "./firewall/page";
import RoutingPage from "./routing/page";
import VPNPage from "./vpn/page";
import SystemPage from "./system/page";
import DashboardPage from "./dashboard/page";
import AdvancedPage from "./advanced/page";
import NatPage from "./nat/page";
import ContainersPage from "./containers/page";

// Dynamic import with loading fallbacks for service pages
import dynamic from "next/dynamic";
import { executeSavingMethod } from "./utils";


// Create simplified alert dialog components
const AlertDialog = ({ open, onOpenChange, children }: { open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }) => (
  open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">{children}</div> : null
);

const AlertDialogContent = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md ${className}`}>{children}</div>
);

const AlertDialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">{children}</div>
);

const AlertDialogFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-end gap-2 mt-6">{children}</div>
);

const AlertDialogTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>
);

const AlertDialogDescription = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <p className={`mt-2 ${className}`}>{children}</p>
);

const AlertDialogAction = ({ className, onClick, children }: { className?: string, onClick?: () => void, children: React.ReactNode }) => (
  <Button className={className} onClick={onClick}>{children}</Button>
);

const AlertDialogCancel = ({ className, onClick, children }: { className?: string, onClick?: () => void, children: React.ReactNode }) => (
  <Button variant="outline" className={className} onClick={onClick}>{children}</Button>
);

const DhcpPage = dynamic(() => import("./services/dhcp/page"), {
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Loading DHCP page...</p>
      </div>
    </div>
  ),
});

const NTPPage = dynamic(() => import("./services/ntp/page"), {
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Loading NTP page...</p>
      </div>
    </div>
  ),
});

const SSHPage = dynamic(() => import("./services/ssh/page"), {
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Loading SSH page...</p>
      </div>
    </div>
  ),
});

const HTTPSPage = dynamic(() => import("./services/https/page"), {
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Loading HTTPS page...</p>
      </div>
    </div>
  ),
});

export default function RootPage() {
  const [loading, setLoading] = useState(true);
  const [configData, setConfigData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [quickActionExpanded, setQuickActionExpanded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const revertUnsavedChanges = async () => {
    try {
      const responseState = await fetch(
        `${API_URL}/api/set-unsaved-changes/false`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
          },
        }
      );

      if (!responseState.ok) {
        throw new Error(
          `Server returned ${responseState.status} ${responseState.statusText}`
        );
      }

      const response = await fetch(`${API_URL}/api/reboot`, {
        method: "POST",
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success === true) {
        toast({
          title: "Unsaved changes will be reverted",
          description: `VyOS is rebooting...`,
        });
      } else {
        throw new Error(data.error || "Failed to reboot VyOS");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error reverting changes",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setShowRevertDialog(false);
    }
  };

  const confirmUnsavedChanges = async () => {
    const response = await fetch(`${API_URL}/api/config-file/save`, {
      method: "POST",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.success === true) {
      toast({
        title: "Configuration saved successfully",
        description: `You have confirmed saving the unsaved changes`,
      });

      const responseState = await fetch(
        `${API_URL}/api/set-unsaved-changes/false`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
          },
        }
      );

      if (!responseState.ok) {
        throw new Error(
          `Server returned ${responseState.status} ${responseState.statusText}`
        );
      }

      fetchConfig();
    } else {
      throw new Error(data.error || "Failed to save configuration");
    }
  };

  const checkForUnsavedChanges = async () => {
    try {
      const response = await fetch(`${API_URL}/api/check-unsaved-changes`);
      if (!response.ok) throw new Error("Failed to check unsaved changes");

      const data = await response.json();
      if (data.success && data.data !== null) {
        setHasUnsavedChanges(data.data);
      }
    } catch (error) {
      console.error("Error checking unsaved changes:", error);
    }
  };

  useEffect(() => {
    fetchConfig();

    // Handle initial hash in URL
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setActiveTab(hash);

      // Expand services menu if a service tab is selected
      if (["dhcp", "ntp", "ssh", "https"].includes(hash)) {
        setServicesExpanded(true);
      }
    }

    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash.replace("#", "");
      if (newHash) {
        setActiveTab(newHash);

        // Expand services menu if a service tab is selected
        if (["dhcp", "ntp", "ssh", "https"].includes(newHash)) {
          setServicesExpanded(true);
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    checkForUnsavedChanges();

    const interval = setInterval(checkForUnsavedChanges, 3000);
    return () => clearInterval(interval);
  });

  const navigateToTab = (tab: string, e?: React.MouseEvent) => {
    // Prevent default browser navigation if event is provided
    if (e) {
      e.preventDefault();
    }

    setActiveTab(tab);
    window.history.pushState(null, "", `#${tab}`);

    // Expand services menu if a service tab is selected
    if (["dhcp", "ntp", "ssh", "https"].includes(tab)) {
      setServicesExpanded(true);
    }
  };

  const fetchConfig = async () => {
    executeSavingMethod();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/config`);

      // Check if response is OK (status in the range 200-299)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `Server error: ${response.status} ${response.statusText}`,
        }));

        console.error("Error response:", errorData);

        toast({
          variant: "destructive",
          title: "Error connecting to VyOS router",
          description:
            errorData.error ||
            `Server returned ${response.status} ${response.statusText}`,
        });

        setError("Connection error");
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success === true && data.data) {
        setConfigData(data.data);
        toast({
          title: "Configuration loaded",
          description: "Successfully loaded VyOS configuration",
        });
      } else {
        console.error("API error:", data);
        toast({
          variant: "destructive",
          title: "Error loading VyOS configuration",
          description: data.error || "Could not load VyOS configuration",
        });
        setError("API error");
      }
    } catch (error) {
      console.error("Error fetching configuration:", error);
      toast({
        variant: "destructive",
        title: "Connection error",
        description:
          "Could not connect to the API server. Please check that the backend is running.",
      });
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading VyOS configuration...</p>
        </div>
      </div>
    );
  }

  // Calculate system stats
  const getSystemInfo = () => {
    const hostname = configData?.system?.["host-name"] || "VyOS Router";
    const timeZone = configData?.system?.["time-zone"] || "UTC";

    // Count configured interfaces
    const interfaceCount = configData?.interfaces
      ? Object.values(configData.interfaces).reduce(
          (count: number, typeInterfaces: any) =>
            count +
            (typeof typeInterfaces === "object"
              ? Object.keys(typeInterfaces).length
              : 0),
          0
        )
      : 0;

    // Count firewall rules
    const firewallRuleCount = configData?.firewall?.name
      ? Object.values(configData.firewall.name).reduce(
          (count: number, ruleSet: any) =>
            count + (ruleSet.rule ? Object.keys(ruleSet.rule).length : 0),
          0
        )
      : 0;

    return {
      hostname,
      timeZone,
      interfaceCount,
      firewallRuleCount,
    };
  };

  // Function to handle quick actions
  const handleQuickAction = (tab: string, action?: string) => {
    setActiveTab(tab);

    // If there's a specific action to perform on the tab, we can add that logic here
    // For future implementation when those tabs are built
    if (action) {
      // Store the action in sessionStorage to be picked up by the target component
      sessionStorage.setItem("pendingAction", action);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <div className="flex h-screen">
        <div className="w-64 border-r border-slate-700 bg-slate-900 hidden md:block">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-700 bg-slate-800">
              <h1 className="text-xl font-bold text-cyan-400">
                NextGen Manager
              </h1>
              <div className="mt-2 flex items-center">
                <StatusBadge status={error ? "disconnected" : "connected"} />
              </div>
       {/* Update the Revert button in the sidebar to show the dialog */}
       {hasUnsavedChanges && (
        <div className="mt-3 p-2 bg-amber-900/50 border border-amber-700 rounded-md">
          <div className="flex items-center gap-2 text-amber-200 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>You have unsaved changes</span>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="bg-blue-800 hover:bg-amber-700 text-slate-200 border-blue-700 h-6"
              onClick={confirmUnsavedChanges}
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button
              variant="outline"
              className="bg-red-800 hover:bg-slate-700 text-slate-200 border-slate-700 h-6"
              onClick={() => setShowRevertDialog(true)}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Revert
            </Button>
          </div>
        </div>
       )}
            </div>
            <div className="flex-1 py-4">
              <nav className="space-y-1 px-2">
                <Button
                  variant={activeTab === "dashboard" ? "default" : "ghost"}
                  className={`w-full justify-start gap-2 mb-1 ${
                    activeTab === "dashboard"
                      ? "bg-cyan-600 hover:bg-cyan-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  onClick={(e) => navigateToTab("dashboard", e)}
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
                <Button
                  variant={activeTab === "interfaces" ? "default" : "ghost"}
                  className={`w-full justify-start gap-2 mb-1 ${
                    activeTab === "interfaces"
                      ? "bg-cyan-600 hover:bg-cyan-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  onClick={(e) => navigateToTab("interfaces", e)}
                >
                  <Network className="h-4 w-4" />
                  Network Interfaces
                </Button>
                <Button
                  variant={activeTab === "containers" ? "default" : "ghost"}
                  className={`w-full justify-start gap-2 mb-1 ${
                    activeTab === "containers"
                      ? "bg-cyan-600 hover:bg-cyan-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  onClick={(e) => navigateToTab("containers", e)}
                >
                  <Box className="h-4 w-4" />
                  Containers
                </Button>
                <Button
                  variant={activeTab === "firewall" ? "default" : "ghost"}
                  className={`w-full justify-start gap-2 mb-1 ${
                    activeTab === "firewall"
                      ? "bg-cyan-600 hover:bg-cyan-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  onClick={(e) => navigateToTab("firewall", e)}
                >
                  <Shield className="h-4 w-4" />
                  Firewall
                </Button>
                <Button
                  variant={activeTab === "nat" ? "default" : "ghost"}
                  className={`w-full justify-start gap-2 mb-1 ${
                    activeTab === "nat"
                      ? "bg-cyan-600 hover:bg-cyan-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  onClick={(e) => navigateToTab("nat", e)}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  NAT
                </Button>
                <Button
                  variant={activeTab === "routing" ? "default" : "ghost"}
                  className={`w-full justify-start gap-2 mb-1 ${
                    activeTab === "routing"
                      ? "bg-cyan-600 hover:bg-cyan-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  onClick={(e) => navigateToTab("routing", e)}
                >
                  <Route className="h-4 w-4" />
                  Routing
                </Button>
                <Button
                  variant={activeTab === "vpn" ? "default" : "ghost"}
                  className={`w-full justify-start gap-2 mb-1 ${
                    activeTab === "vpn"
                      ? "bg-cyan-600 hover:bg-cyan-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  onClick={(e) => navigateToTab("vpn", e)}
                >
                  <Globe className="h-4 w-4" />
                  VPN
                </Button>

                {/* Services Dropdown */}
                <div className="mb-1">
                  <Button
                    variant="ghost"
                    className={`w-full justify-between items-center text-slate-300 hover:text-white hover:bg-slate-800 ${
                      activeTab === "dhcp" ||
                      activeTab === "ntp" ||
                      activeTab === "ssh" ||
                      activeTab === "https" ||
                      servicesExpanded
                        ? "bg-slate-800"
                        : ""
                    }`}
                    onClick={(e) => setServicesExpanded(!servicesExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      <span>Services</span>
                    </div>
                    {servicesExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>

                  {servicesExpanded && (
                    <div className="pl-4 mt-1 space-y-1">
                      <Button
                        variant={activeTab === "dhcp" ? "default" : "ghost"}
                        className={`w-full justify-start gap-2 ${
                          activeTab === "dhcp"
                            ? "bg-cyan-600 hover:bg-cyan-700"
                            : "text-slate-300 hover:text-white hover:bg-slate-800"
                        }`}
                        onClick={(e) => navigateToTab("dhcp", e)}
                      >
                        <Database className="h-4 w-4" />
                        DHCP
                      </Button>
                      <Button
                        variant={activeTab === "ntp" ? "default" : "ghost"}
                        className={`w-full justify-start gap-2 ${
                          activeTab === "ntp"
                            ? "bg-cyan-600 hover:bg-cyan-700"
                            : "text-slate-300 hover:text-white hover:bg-slate-800"
                        }`}
                        onClick={(e) => navigateToTab("ntp", e)}
                      >
                        <Clock className="h-4 w-4" />
                        NTP
                      </Button>
                      <Button
                        variant={activeTab === "ssh" ? "default" : "ghost"}
                        className={`w-full justify-start gap-2 ${
                          activeTab === "ssh"
                            ? "bg-cyan-600 hover:bg-cyan-700"
                            : "text-slate-300 hover:text-white hover:bg-slate-800"
                        }`}
                        onClick={(e) => navigateToTab("ssh", e)}
                      >
                        <Terminal className="h-4 w-4" />
                        SSH
                      </Button>
                      <Button
                        variant={activeTab === "https" ? "default" : "ghost"}
                        className={`w-full justify-start gap-2 ${
                          activeTab === "https"
                            ? "bg-cyan-600 hover:bg-cyan-700"
                            : "text-slate-300 hover:text-white hover:bg-slate-800"
                        }`}
                        onClick={(e) => navigateToTab("https", e)}
                      >
                        <Globe className="h-4 w-4" />
                        HTTPS
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  variant={activeTab === "system" ? "default" : "ghost"}
                  className={`w-full justify-start gap-2 mb-1 ${
                    activeTab === "system"
                      ? "bg-cyan-600 hover:bg-cyan-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  onClick={(e) => navigateToTab("system", e)}
                >
                  <Settings className="h-4 w-4" />
                  System
                </Button>
                <Button
                  variant={activeTab === "advanced" ? "default" : "ghost"}
                  className={`w-full justify-start gap-2 mb-1 ${
                    activeTab === "advanced"
                      ? "bg-cyan-600 hover:bg-cyan-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  onClick={() => navigateToTab("advanced")}
                >
                  <Activity className="h-4 w-4" />
                  Advanced
                </Button>
              </nav>
            </div>

            <div className="p-4 border-t border-slate-700 flex justify-between items-center">
              <div className="text-xs text-slate-500">
                Made with love by{" "}
                <a href="https://github.com/Community-VyProjects">
                  Community-VyProjects
                </a>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-6">
            {/* Select the active tab to render */}
            {activeTab === "dashboard" && <DashboardPage />}
            {activeTab === "interfaces" && <InterfacesPage />}
            {activeTab === "containers" && <ContainersPage />}
            {activeTab === "services" && <ServicesPage />}
            {activeTab === "firewall" && <FirewallPage />}
            {activeTab === "nat" && <NatPage />}
            {activeTab === "routing" && <RoutingPage />}
            {activeTab === "vpn" && <VPNPage />}
            {activeTab === "dhcp" && <DhcpPage />}
            {activeTab === "ntp" && <NTPPage />}
            {activeTab === "ssh" && <SSHPage />}
            {activeTab === "https" && <HTTPSPage />}
            {activeTab === "system" && <SystemPage />}
            {activeTab === "advanced" && <AdvancedPage />}
          </div>
        </div>
      </div>

      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will revert all unsaved changes and reboot the VyOS
              router. Any unsaved configuration will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRevertDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={revertUnsavedChanges}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Reboot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
