"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import {
  Loader2,
  RefreshCw,
  Clock,
  User,
  Server,
  Download,
  Upload,
  Save,
  Settings,
  Globe,
  Calendar,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function SystemPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [hostnameDialogOpen, setHostnameDialogOpen] = useState(false);
  const [newHostname, setNewHostname] = useState("");
  const [isChangingSavingMethod, setIsChangingSavingMethod] = useState(false);
  const [isChangingHostname, setIsChangingHostname] = useState(false);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/config`);

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success === true && data.data) {
        setConfig(data.data);
        if (data.data.system?.["host-name"]) {
          setNewHostname(data.data.system["host-name"]);
        }
      } else {
        throw new Error(data.error || "Failed to load configuration");
      }
    } catch (error) {
      console.error("Error fetching configuration:", error);
      toast({
        variant: "destructive",
        title: "Error loading configuration",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savingMethod = sessionStorage.getItem("savingMethod") || "confirmation";

  const changeSavingMethod = async (newSavingMethod: string) => {
    setIsChangingSavingMethod(true);

    try {
      // Set new saving method in session storage
      sessionStorage.setItem("savingMethod", newSavingMethod);

      toast({
        title: "Saving Method Changed",
        description: `Saving method has been updated to: ${newSavingMethod}`,
      });

      await fetchConfig(); // Refresh configuration

      // No need to fetch config as this is a client-side only change
    } catch (error) {
      console.error("Error changing saving method:", error);
      toast({
        variant: "destructive",
        title: "Failed to change saving method",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsChangingSavingMethod(false);
    }
  };

  const changeHostname = async () => {
    if (!newHostname) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Hostname cannot be empty",
      });
      return;
    }

    setIsChangingHostname(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      // Set hostname
      const response = await fetch(
        `${apiUrl}/api/configure/set/system/host-name?value=${encodeURIComponent(
          newHostname
        )}`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to change hostname: ${response.statusText}`);
      }

      toast({
        title: "Hostname Changed",
        description: `System hostname has been updated to: ${newHostname}`,
      });

      setHostnameDialogOpen(false);
      fetchConfig();
    } catch (error) {
      console.error("Error changing hostname:", error);
      toast({
        variant: "destructive",
        title: "Failed to change hostname",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsChangingHostname(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading system configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">System</h1>
          <p className="text-slate-400">
            Manage system settings and maintenance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          onClick={fetchConfig}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="grid grid-cols-4 w-[600px]">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="users">
            <User className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="services">
            <Server className="h-4 w-4 mr-2" />
            Services
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Download className="h-4 w-4 mr-2" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-cyan-400">
                  System Information
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Basic system settings and identity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-4 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Save className="h-4 w-4 mr-2 text-slate-400" />
                          <p className="text-sm text-slate-400">
                            Saving Method
                          </p>
                        </div>
                        <Select
                          value={savingMethod}
                          onValueChange={changeSavingMethod}
                          disabled={isChangingSavingMethod}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            {isChangingSavingMethod ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <SelectValue placeholder="Select saving method" />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            <SelectItem value="direct">
                              Direct Save (high lockout risk)
                            </SelectItem>
                            <SelectItem value="timer">
                              Timer (medium lockout risk)
                            </SelectItem>
                            <SelectItem value="confirmation">
                              Manual confirmation (low lockout risk)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 mr-2 text-slate-400" />
                          <p className="text-sm text-slate-400">Hostname</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-slate-400 hover:text-white hover:bg-slate-700"
                          onClick={() => setHostnameDialogOpen(true)}
                        >
                          Change
                        </Button>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {config?.system?.["host-name"] || "Not configured"}
                      </p>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-md">
                      <div className="flex items-center mb-2">
                        <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                        <p className="text-sm text-slate-400">Time Zone</p>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {config?.system?.["time-zone"] || "UTC"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <Clock className="h-4 w-4 mr-2 text-slate-400" />
                      <p className="text-sm text-slate-400">NTP Settings</p>
                    </div>
                    <Table>
                      <TableHeader className="bg-slate-800">
                        <TableRow>
                          <TableHead className="text-cyan-400">
                            NTP Server
                          </TableHead>
                          <TableHead className="text-cyan-400 w-[150px]">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.service?.ntp?.server ? (
                          Object.keys(config.service.ntp.server).map(
                            (server) => (
                              <TableRow
                                key={server}
                                className="hover:bg-slate-700/50"
                              >
                                <TableCell className="font-medium text-slate-200">
                                  {server}
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-green-600">Active</Badge>
                                </TableCell>
                              </TableRow>
                            )
                          )
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              className="text-center text-slate-400"
                            >
                              No NTP servers configured
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-cyan-400">System Logging</CardTitle>
                <CardDescription className="text-slate-400">
                  Log settings and configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="bg-slate-900 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <p className="text-sm text-slate-400">
                        Logging Facilities
                      </p>
                    </div>
                    <Table>
                      <TableHeader className="bg-slate-800">
                        <TableRow>
                          <TableHead className="text-cyan-400">
                            Facility
                          </TableHead>
                          <TableHead className="text-cyan-400">Level</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.system?.syslog?.global?.facility ? (
                          Object.entries(
                            config.system.syslog.global.facility
                          ).map(([facility, value]: [string, any]) => (
                            <TableRow
                              key={facility}
                              className="hover:bg-slate-700/50"
                            >
                              <TableCell className="font-medium text-slate-200">
                                {facility}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    value.level === "debug"
                                      ? "bg-purple-600"
                                      : value.level === "info"
                                      ? "bg-blue-600"
                                      : value.level === "warning"
                                      ? "bg-amber-600"
                                      : value.level === "error"
                                      ? "bg-red-600"
                                      : "bg-slate-600"
                                  }
                                >
                                  {value.level}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              className="text-center text-slate-400"
                            >
                              No logging facilities configured
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">User Management</CardTitle>
              <CardDescription className="text-slate-400">
                System users and authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-900">
                  <TableRow>
                    <TableHead className="text-cyan-400">Username</TableHead>
                    <TableHead className="text-cyan-400">
                      Authentication
                    </TableHead>
                    <TableHead className="text-cyan-400 w-[150px]">
                      SSH Keys
                    </TableHead>
                    <TableHead className="text-cyan-400 w-[100px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config?.system?.login?.user ? (
                    Object.entries(config.system.login.user).map(
                      ([username, userConfig]: [string, any]) => (
                        <TableRow
                          key={username}
                          className="hover:bg-slate-700/50"
                        >
                          <TableCell className="font-medium text-slate-200">
                            {username}
                          </TableCell>
                          <TableCell>
                            {userConfig.authentication?.[
                              "encrypted-password"
                            ] ? (
                              <Badge className="bg-green-600">Password</Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-red-400 border-red-800"
                              >
                                No Password
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {userConfig.authentication?.["public-keys"] ? (
                              <Badge className="bg-blue-600">
                                {
                                  Object.keys(
                                    userConfig.authentication["public-keys"]
                                  ).length
                                }{" "}
                                key(s)
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-slate-400 border-slate-600"
                              >
                                None
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                              >
                                <svg
                                  className="h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    )
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-slate-400"
                      >
                        No users configured
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">System Services</CardTitle>
              <CardDescription className="text-slate-400">
                Network and system services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900 p-4 rounded-md">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <svg
                          className="h-5 w-5 mr-2 text-cyan-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"></path>
                        </svg>
                        <p className="text-white font-medium">SSH</p>
                      </div>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <p className="text-slate-400">Port:</p>
                      <p className="text-slate-200">
                        {config?.service?.ssh?.port || "22"}
                      </p>
                      <p className="text-slate-400">Password Auth:</p>
                      <p className="text-slate-200">
                        {config?.service?.ssh?.[
                          "disable-password-authentication"
                        ]
                          ? "Disabled"
                          : "Enabled"}
                      </p>
                      <p className="text-slate-400">Keepalive:</p>
                      <p className="text-slate-200">
                        {config?.service?.ssh?.["client-keepalive-interval"] ||
                          "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-md">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <svg
                          className="h-5 w-5 mr-2 text-cyan-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <p className="text-white font-medium">HTTPS</p>
                      </div>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <p className="text-slate-400">API Keys:</p>
                      <p className="text-slate-200">
                        {config?.service?.https?.api?.keys?.id
                          ? Object.keys(config.service.https.api.keys.id).length
                          : "0"}
                      </p>
                      <p className="text-slate-400">Allowed Clients:</p>
                      <p className="text-slate-200">
                        {config?.service?.https?.["allow-client"]?.address
                          ? Array.isArray(
                              config.service.https["allow-client"].address
                            )
                            ? config.service.https["allow-client"].address
                                .length
                            : "1"
                          : "0"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-md">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <svg
                          className="h-5 w-5 mr-2 text-cyan-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <p className="text-white font-medium">NTP</p>
                      </div>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <p className="text-slate-400">Servers:</p>
                      <p className="text-slate-200">
                        {config?.service?.ntp?.server
                          ? Object.keys(config.service.ntp.server).length
                          : "0"}
                      </p>
                      <p className="text-slate-400">Allow Clients:</p>
                      <p className="text-slate-200">
                        {config?.service?.ntp?.["allow-client"]?.address
                          ? "Yes"
                          : "No"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900 p-4 rounded-md">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <svg
                          className="h-5 w-5 mr-2 text-cyan-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path>
                          <rect
                            x="9"
                            y="9"
                            width="12"
                            height="10"
                            rx="2"
                          ></rect>
                        </svg>
                        <p className="text-white font-medium">DHCP Server</p>
                      </div>
                      <Badge
                        className={
                          config?.service?.["dhcp-server"]
                            ? "bg-green-600"
                            : "bg-slate-600"
                        }
                      >
                        {config?.service?.["dhcp-server"]
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <p className="text-slate-400">Networks:</p>
                      <p className="text-slate-200">
                        {config?.service?.["dhcp-server"]?.[
                          "shared-network-name"
                        ]
                          ? Object.keys(
                              config.service["dhcp-server"][
                                "shared-network-name"
                              ]
                            ).length
                          : "0"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">
                System Maintenance
              </CardTitle>
              <CardDescription className="text-slate-400">
                Backup, restore, and firmware management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-6 rounded-md flex flex-col items-center justify-center text-center">
                  <Save className="h-12 w-12 text-cyan-400 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    Backup Configuration
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Save your current configuration to a file
                  </p>
                  <Button
                    className="bg-slate-600 hover:bg-slate-600 cursor-not-allowed"
                    disabled
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Backup
                  </Button>
                </div>

                <div className="bg-slate-900 p-6 rounded-md flex flex-col items-center justify-center text-center">
                  <Upload className="h-12 w-12 text-amber-400 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    Restore Configuration
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Restore a previously saved configuration
                  </p>
                  <Button
                    variant="outline"
                    className="border-slate-700 bg-slate-600 text-slate-400 hover:bg-slate-600 cursor-not-allowed"
                    disabled
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Backup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hostname Dialog */}
      <Dialog open={hostnameDialogOpen} onOpenChange={setHostnameDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Change Hostname</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update the system hostname
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hostname" className="text-slate-300">
                Hostname
              </Label>
              <Input
                id="hostname"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newHostname}
                onChange={(e) => setNewHostname(e.target.value)}
                placeholder="e.g. vyos-router"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHostnameDialogOpen(false)}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={changeHostname}
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={isChangingHostname}
            >
              {isChangingHostname ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
