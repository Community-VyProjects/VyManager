"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, RefreshCw, Key, Shield, Save } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"
import { executeSavingMethod } from "@/app/utils"

interface SSHConfig {
  port?: number;
  'listen-address'?: string[];
  'disable-password-authentication'?: boolean;
  'disable-host-validation'?: boolean;
  'loglevel'?: string;
  'client-keepalive-interval'?: number;
  'key-exchange'?: string[];
  'mac'?: string[];
  'ciphers'?: string[];
  'access-control'?: {
    'allow'?: {
      'user'?: string[];
      'group'?: string[];
    };
    'deny'?: {
      'user'?: string[];
      'group'?: string[];
    };
  };
}

export default function SSHPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [config, setConfig] = useState<any>(null)
  const [sshConfig, setSSHConfig] = useState<SSHConfig | null>(null)
  const [sshStatus, setSSHStatus] = useState<any>(null)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editedSettings, setEditedSettings] = useState<Partial<SSHConfig>>({
    port: 22,
    'disable-password-authentication': false,
    'loglevel': 'INFO',
    'client-keepalive-interval': 180,
  })

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchConfig = async () => {
    executeSavingMethod();
    setIsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/config`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === true && data.data) {
        setConfig(data.data);
        
        // Extract SSH configuration from the data
        const ssh = data.data.service?.ssh;
        if (ssh) {
          setSSHConfig(ssh);
          
          // Initialize edited settings with current values
          setEditedSettings({
            port: ssh.port || 22,
            'disable-password-authentication': 'disable-password-authentication' in ssh,
            'loglevel': ssh.loglevel || 'INFO',
            'client-keepalive-interval': ssh['client-keepalive-interval'] || 180
          });
          
          // If SSH config exists, consider the service active
          setSSHStatus({ active: true });
        } else {
          setSSHStatus({ active: false });
        }
      } else {
        throw new Error(data.error || "Failed to load configuration");
      }
    } catch (error) {
      console.error("Error fetching configuration:", error);
      toast({
        variant: "destructive",
        title: "Error loading configuration",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch SSH status - fallback function if the API provides actual status
  const fetchSSHStatus = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/service/status/ssh`);
      
      if (!response.ok) {
        // If 404, use the config-based status detection instead (already set in fetchConfig)
        if (response.status === 404) {
          return;
        }
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === true) {
        setSSHStatus(data.data);
      } else {
        throw new Error(data.error || "Failed to load SSH status");
      }
    } catch (error) {
      console.error("Error fetching SSH status:", error);
      // Don't update sshStatus here as we're using config-based detection
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchConfig(), fetchSSHStatus()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchConfig(), fetchSSHStatus()]);
  }, []);

  const updateSSHSettings = async () => {
    setIsUpdating(true);
    
    try {
      // Update port setting
      if (editedSettings.port !== undefined && editedSettings.port !== sshConfig?.port) {
        await fetch(`${apiUrl}/api/configure/set/service/ssh/port?value=${editedSettings.port}`, {
          method: 'POST',
          headers: { 'accept': 'application/json' }
        });
      }
      
      // Update password authentication setting
      const currentDisablePasswordAuth = 'disable-password-authentication' in (sshConfig || {});
      if (editedSettings['disable-password-authentication'] !== currentDisablePasswordAuth) {
        if (editedSettings['disable-password-authentication']) {
          await fetch(`${apiUrl}/api/configure/set/service/ssh/disable-password-authentication`, {
            method: 'POST',
            headers: { 'accept': 'application/json' }
          });
        } else {
          await fetch(`${apiUrl}/api/configure/delete/service/ssh/disable-password-authentication`, {
            method: 'POST',
            headers: { 'accept': 'application/json' }
          });
        }
      }
      
      // Update log level
      if (editedSettings.loglevel !== undefined && editedSettings.loglevel !== sshConfig?.loglevel) {
        await fetch(`${apiUrl}/api/configure/set/service/ssh/loglevel?value=${editedSettings.loglevel}`, {
          method: 'POST',
          headers: { 'accept': 'application/json' }
        });
      }
      
      // Update client keepalive interval
      if (editedSettings['client-keepalive-interval'] !== undefined && 
          editedSettings['client-keepalive-interval'] !== sshConfig?.['client-keepalive-interval']) {
        await fetch(`${apiUrl}/api/configure/set/service/ssh/client-keepalive-interval?value=${editedSettings['client-keepalive-interval']}`, {
          method: 'POST',
          headers: { 'accept': 'application/json' }
        });
      }
      
      toast({
        title: "SSH Settings Updated",
        description: "Successfully updated SSH server settings"
      });
      
      setSettingsDialogOpen(false);
      refreshData();
    } catch (error) {
      console.error("Error updating SSH settings:", error);
      toast({
        variant: "destructive",
        title: "Failed to update SSH settings",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getListenAddresses = (): string[] => {
    if (!sshConfig || !sshConfig['listen-address']) return [];
    return Array.isArray(sshConfig['listen-address']) 
      ? sshConfig['listen-address'] 
      : [sshConfig['listen-address']];
  };
  
  const getCiphers = (): string[] => {
    if (!sshConfig || !sshConfig.ciphers) return [];
    return Array.isArray(sshConfig.ciphers) 
      ? sshConfig.ciphers 
      : [sshConfig.ciphers];
  };
  
  const getMacAlgorithms = (): string[] => {
    if (!sshConfig || !sshConfig.mac) return [];
    return Array.isArray(sshConfig.mac) 
      ? sshConfig.mac 
      : [sshConfig.mac];
  };
  
  const getKeyExchanges = (): string[] => {
    if (!sshConfig || !sshConfig['key-exchange']) return [];
    return Array.isArray(sshConfig['key-exchange']) 
      ? sshConfig['key-exchange'] 
      : [sshConfig['key-exchange']];
  };
  
  const getAccessControlUsers = (): { allow: string[], deny: string[] } => {
    const result = { allow: [] as string[], deny: [] as string[] };
    
    if (!sshConfig || !sshConfig['access-control']) return result;
    
    if (sshConfig['access-control'].allow?.user) {
      result.allow = Array.isArray(sshConfig['access-control'].allow.user)
        ? sshConfig['access-control'].allow.user
        : [sshConfig['access-control'].allow.user];
    }
    
    if (sshConfig['access-control'].deny?.user) {
      result.deny = Array.isArray(sshConfig['access-control'].deny.user)
        ? sshConfig['access-control'].deny.user
        : [sshConfig['access-control'].deny.user];
    }
    
    return result;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading SSH configuration...</p>
        </div>
      </div>
    );
  }

  const listenAddresses = getListenAddresses();
  const ciphers = getCiphers();
  const macAlgorithms = getMacAlgorithms();
  const keyExchanges = getKeyExchanges();
  const accessControl = getAccessControlUsers();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">SSH Service</h1>
          <p className="text-slate-400">Configure and manage SSH remote access</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700"
            onClick={() => setSettingsDialogOpen(true)}
          >
            Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* SSH Status Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
              <Key className="h-5 w-5" />
              SSH Status
            </CardTitle>
            <CardDescription className="text-slate-400">
              Current status of the SSH server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-md bg-slate-900 p-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-slate-400">Status</span>
                  <Badge className={sshStatus?.active ? "bg-green-700" : "bg-red-700"}>
                    {sshStatus?.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-slate-400">Port</span>
                  <span className="text-white font-medium">{sshConfig?.port || 22}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-slate-400">Password Auth</span>
                  <Badge className={!sshConfig?.['disable-password-authentication'] ? "bg-green-700" : "bg-red-700"}>
                    {!sshConfig?.['disable-password-authentication'] ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listen Addresses Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Network
            </CardTitle>
            <CardDescription className="text-slate-400">
              Network interfaces and addresses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Listen Addresses</h3>
                {listenAddresses.length === 0 ? (
                  <p className="text-sm text-slate-400">Listening on all addresses</p>
                ) : (
                  <ul className="space-y-1">
                    {listenAddresses.map((address, idx) => (
                      <li key={idx} className="text-sm text-slate-300 bg-slate-900 rounded p-2">
                        {address}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription className="text-slate-400">
              Security configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Advanced Settings</h3>
                <ul className="space-y-1">
                  <li className="flex justify-between text-sm">
                    <span className="text-slate-400">Log Level</span>
                    <span className="text-white">{sshConfig?.loglevel || "INFO"}</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span className="text-slate-400">Keepalive</span>
                    <span className="text-white">{sshConfig?.['client-keepalive-interval'] || 180}s</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span className="text-slate-400">Host Validation</span>
                    <Badge className={!sshConfig?.['disable-host-validation'] ? "bg-green-700" : "bg-amber-700"}>
                      {!sshConfig?.['disable-host-validation'] ? "Enabled" : "Disabled"}
                    </Badge>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Encryption Settings */}
      <div className="mb-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Encryption Settings
            </CardTitle>
            <CardDescription className="text-slate-400">
              SSH security algorithms and ciphers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ciphers */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Ciphers</h3>
                {ciphers.length === 0 ? (
                  <p className="text-sm text-slate-400">Using system defaults</p>
                ) : (
                  <ul className="space-y-1">
                    {ciphers.map((cipher, idx) => (
                      <li key={idx} className="text-sm text-slate-300 bg-slate-900 rounded p-2">
                        {cipher}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* MAC Algorithms */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">MAC Algorithms</h3>
                {macAlgorithms.length === 0 ? (
                  <p className="text-sm text-slate-400">Using system defaults</p>
                ) : (
                  <ul className="space-y-1">
                    {macAlgorithms.map((mac, idx) => (
                      <li key={idx} className="text-sm text-slate-300 bg-slate-900 rounded p-2">
                        {mac}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Key Exchange */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Key Exchange</h3>
                {keyExchanges.length === 0 ? (
                  <p className="text-sm text-slate-400">Using system defaults</p>
                ) : (
                  <ul className="space-y-1">
                    {keyExchanges.map((kex, idx) => (
                      <li key={idx} className="text-sm text-slate-300 bg-slate-900 rounded p-2">
                        {kex}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Access Control */}
      <div className="mb-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Control
            </CardTitle>
            <CardDescription className="text-slate-400">
              Users and groups allowed to access SSH
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accessControl.allow.length === 0 && accessControl.deny.length === 0 ? (
              <Alert className="bg-slate-900 border-amber-800 text-amber-300">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>No access control rules</AlertTitle>
                <AlertDescription>
                  All users with valid credentials can access the SSH server. Consider adding access control rules for improved security.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Allowed Users */}
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Allowed Users</h3>
                  {accessControl.allow.length === 0 ? (
                    <p className="text-sm text-slate-400">No specific allow rules (all users allowed)</p>
                  ) : (
                    <ul className="space-y-1">
                      {accessControl.allow.map((user, idx) => (
                        <li key={idx} className="text-sm text-slate-300 bg-slate-900 rounded p-2">
                          {user}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Denied Users */}
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Denied Users</h3>
                  {accessControl.deny.length === 0 ? (
                    <p className="text-sm text-slate-400">No deny rules</p>
                  ) : (
                    <ul className="space-y-1">
                      {accessControl.deny.map((user, idx) => (
                        <li key={idx} className="text-sm text-slate-300 bg-slate-900 rounded p-2 text-red-400">
                          {user}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">SSH Settings</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure basic SSH server settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ssh-port" className="text-white">Port</Label>
              <Input
                id="ssh-port"
                type="number"
                placeholder="22"
                className="bg-slate-900 border-slate-700 text-white"
                value={editedSettings.port || ''}
                onChange={(e) => setEditedSettings({ 
                  ...editedSettings, 
                  port: parseInt(e.target.value) || 22
                })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="password-auth-switch" className="text-white flex-1">
                Password Authentication
              </Label>
              <Switch
                id="password-auth-switch"
                checked={!editedSettings['disable-password-authentication']}
                onCheckedChange={(checked) => setEditedSettings({ 
                  ...editedSettings, 
                  'disable-password-authentication': !checked 
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="loglevel-select" className="text-white">Log Level</Label>
              <Select 
                value={editedSettings.loglevel || 'INFO'} 
                onValueChange={(value) => setEditedSettings({
                  ...editedSettings, 
                  loglevel: value
                })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Select log level" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="QUIET">QUIET</SelectItem>
                  <SelectItem value="FATAL">FATAL</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="VERBOSE">VERBOSE</SelectItem>
                  <SelectItem value="DEBUG">DEBUG</SelectItem>
                  <SelectItem value="DEBUG1">DEBUG1</SelectItem>
                  <SelectItem value="DEBUG2">DEBUG2</SelectItem>
                  <SelectItem value="DEBUG3">DEBUG3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="keepalive" className="text-white">Keepalive Interval (seconds)</Label>
              <Input
                id="keepalive"
                type="number"
                placeholder="180"
                className="bg-slate-900 border-slate-700 text-white"
                value={editedSettings['client-keepalive-interval'] || ''}
                onChange={(e) => setEditedSettings({ 
                  ...editedSettings, 
                  'client-keepalive-interval': parseInt(e.target.value) || 180
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettingsDialogOpen(false)}
              className="bg-slate-700 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={updateSSHSettings}
              disabled={isUpdating}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 