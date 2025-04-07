"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, RefreshCw, Globe, Wifi, ShieldCheck, Save, Upload, Download, AlertTriangle, Users } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface HTTPSConfig {
  'listen-address'?: string[];
  port?: number;
  'certificates'?: {
    'certificate'?: {
      [key: string]: {
        'certificate'?: string;
        'private'?: {
          'key-file'?: string;
        }
      }
    }
  };
  'api'?: {
    'keys'?: {
      'id'?: {
        [key: string]: {
          'key'?: string;
        }
      }
    }
  };
  'allow-client'?: {
    'address'?: string[];
    'network'?: string[];
  }
}

export default function HTTPSPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [config, setConfig] = useState<any>(null)
  const [httpsConfig, setHttpsConfig] = useState<HTTPSConfig | null>(null)
  const [httpsStatus, setHttpsStatus] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("general")
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newApiKeyData, setNewApiKeyData] = useState({
    id: '',
    key: '',
    description: ''
  })
  const [certificateData, setCertificateData] = useState({
    name: '',
    certificate: '',
    privateKey: ''
  })

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchConfig = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/config`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === true && data.data) {
        setConfig(data.data);
        const https = data.data.service?.https || null;
        setHttpsConfig(https);
        
        // If HTTPS config exists, consider the service active
        if (https) {
          setHttpsStatus({ active: true });
        } else {
          setHttpsStatus({ active: false });
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

  // Fetch HTTPS status - fallback function if the API provides actual status
  const fetchHTTPSStatus = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/service/status/https`);
      
      if (!response.ok) {
        // If 404, use the config-based status detection instead (already set in fetchConfig)
        if (response.status === 404) {
          return;
        }
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === true) {
        setHttpsStatus(data.data);
      } else {
        throw new Error(data.error || "Failed to load HTTPS status");
      }
    } catch (error) {
      console.error("Error fetching HTTPS status:", error);
      // Don't update httpsStatus here as we're using config-based detection
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchConfig(), fetchHTTPSStatus()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchConfig(), fetchHTTPSStatus()]);
  }, []);

  const getListenAddresses = (): string[] => {
    if (!httpsConfig || !httpsConfig['listen-address']) return [];
    return Array.isArray(httpsConfig['listen-address']) 
      ? httpsConfig['listen-address'] 
      : [httpsConfig['listen-address']];
  };

  const getCertificates = () => {
    const certs: { name: string; info: any }[] = [];
    
    if (!httpsConfig?.certificates?.certificate) return certs;
    
    Object.entries(httpsConfig.certificates.certificate).forEach(([name, certData]) => {
      certs.push({
        name,
        info: certData
      });
    });
    
    return certs;
  };

  const getApiKeys = () => {
    const keys: { id: string; key: string }[] = [];
    
    if (!httpsConfig?.api?.keys?.id) return keys;
    
    Object.entries(httpsConfig.api.keys.id).forEach(([id, keyData]) => {
      if (keyData.key) {
        keys.push({
          id,
          key: keyData.key
        });
      }
    });
    
    return keys;
  };
  
  const getAllowedClients = (): string[] => {
    const clients: string[] = [];
    
    if (!httpsConfig || !httpsConfig['allow-client']) return clients;
    
    if (httpsConfig['allow-client'].address) {
      clients.push(...(Array.isArray(httpsConfig['allow-client'].address) 
        ? httpsConfig['allow-client'].address 
        : [httpsConfig['allow-client'].address]));
    }
    
    if (httpsConfig['allow-client'].network) {
      clients.push(...(Array.isArray(httpsConfig['allow-client'].network) 
        ? httpsConfig['allow-client'].network 
        : [httpsConfig['allow-client'].network]));
    }
    
    return clients;
  };

  const addApiKey = async () => {
    if (!newApiKeyData.id || !newApiKeyData.key) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Key ID and Key value are required"
      });
      return;
    }

    setIsUpdating(true);

    try {
      // Set API key
      const keyPath = `service/https/api/keys/id/${encodeURIComponent(newApiKeyData.id)}/key`;
      const response = await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(keyPath)}?value=${encodeURIComponent(newApiKeyData.key)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to add API key: ${response.statusText}`);
      }

      toast({
        title: "API Key Added",
        description: `Successfully added API key: ${newApiKeyData.id}`
      });

      setApiKeyDialogOpen(false);
      setNewApiKeyData({
        id: '',
        key: '',
        description: ''
      });

      refreshData();
    } catch (error) {
      console.error("Error adding API key:", error);
      toast({
        variant: "destructive",
        title: "Failed to add API key",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const keyPath = `service/https/api/keys/id/${encodeURIComponent(keyId)}`;
      const response = await fetch(`${apiUrl}/api/configure/delete/${encodeURIComponent(keyPath)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete API key: ${response.statusText}`);
      }

      toast({
        title: "API Key Deleted",
        description: `Successfully deleted API key: ${keyId}`
      });

      refreshData();
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete API key",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  const uploadCertificate = async () => {
    if (!certificateData.name || !certificateData.certificate || !certificateData.privateKey) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Certificate name, certificate data, and private key are required"
      });
      return;
    }

    setIsUpdating(true);

    try {
      // Set certificate
      const certPath = `service/https/certificates/certificate/${encodeURIComponent(certificateData.name)}/certificate`;
      const certResponse = await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(certPath)}?value=${encodeURIComponent(certificateData.certificate)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!certResponse.ok) {
        throw new Error(`Failed to set certificate: ${certResponse.statusText}`);
      }

      // Set private key
      const keyPath = `service/https/certificates/certificate/${encodeURIComponent(certificateData.name)}/private/key-file`;
      const keyResponse = await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(keyPath)}?value=${encodeURIComponent(certificateData.privateKey)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!keyResponse.ok) {
        throw new Error(`Failed to set private key: ${keyResponse.statusText}`);
      }

      toast({
        title: "Certificate Uploaded",
        description: `Successfully uploaded certificate: ${certificateData.name}`
      });

      setCertificateDialogOpen(false);
      setCertificateData({
        name: '',
        certificate: '',
        privateKey: ''
      });

      refreshData();
    } catch (error) {
      console.error("Error uploading certificate:", error);
      toast({
        variant: "destructive",
        title: "Failed to upload certificate",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCertificate = async (certName: string) => {
    try {
      const certPath = `service/https/certificates/certificate/${encodeURIComponent(certName)}`;
      const response = await fetch(`${apiUrl}/api/configure/delete/${encodeURIComponent(certPath)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete certificate: ${response.statusText}`);
      }

      toast({
        title: "Certificate Deleted",
        description: `Successfully deleted certificate: ${certName}`
      });

      refreshData();
    } catch (error) {
      console.error("Error deleting certificate:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete certificate",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading HTTPS configuration...</p>
        </div>
      </div>
    );
  }

  const listenAddresses = getListenAddresses();
  const certificates = getCertificates();
  const apiKeys = getApiKeys();
  const allowedClients = getAllowedClients();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">HTTPS Service</h1>
          <p className="text-slate-400">Configure and manage HTTPS server settings</p>
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
            disabled={true}
          >
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start mb-6">
          <TabsTrigger value="general">
            <Globe className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="certificates">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="api">
            <Wifi className="h-4 w-4 mr-2" />
            API
          </TabsTrigger>
          <TabsTrigger value="access">
            <Users className="h-4 w-4 mr-2" />
            Access Control
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Card */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  HTTPS Status
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Current status of the HTTPS server
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-md bg-slate-900 p-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-400">Status</span>
                      <Badge className={httpsConfig ? "bg-green-700" : "bg-red-700"}>
                        {httpsConfig ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-400">Port</span>
                      <span className="text-white font-medium">{httpsConfig?.port || 443}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-400">API Access</span>
                      <Badge className={apiKeys.length > 0 ? "bg-green-700" : "bg-red-700"}>
                        {apiKeys.length > 0 ? "Configured" : "Not Configured"}
                      </Badge>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-400">Certificates</span>
                      <Badge className={certificates.length > 0 ? "bg-green-700" : "bg-red-700"}>
                        {certificates.length > 0 ? "Configured" : "Not Configured"}
                      </Badge>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-400">Client Access Rules</span>
                      <Badge className={allowedClients.length > 0 ? "bg-green-700" : "bg-amber-700"}>
                        {allowedClients.length > 0 ? `${allowedClients.length} Rules` : "Any"}
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
                  <Wifi className="h-5 w-5" />
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
          </div>

          {/* Warning if not properly configured */}
          {(!httpsConfig || certificates.length === 0) && (
            <Alert className="bg-amber-900/30 border-amber-800 text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>HTTPS service not fully configured</AlertTitle>
              <AlertDescription>
                {certificates.length === 0 ? 
                  "No SSL certificates have been configured for HTTPS. This service requires at least one certificate to function properly." : 
                  "The HTTPS service appears to be inactive. Check your configuration and ensure the service is running."}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                SSL Certificates
              </CardTitle>
              <CardDescription className="text-slate-400">
                Manage SSL certificates for the HTTPS server
              </CardDescription>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>No SSL certificates have been configured</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 bg-slate-700 hover:bg-slate-600"
                    onClick={() => setCertificateDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Certificate
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader className="bg-slate-900">
                      <TableRow>
                        <TableHead className="text-cyan-400">Name</TableHead>
                        <TableHead className="text-cyan-400">Certificate</TableHead>
                        <TableHead className="text-cyan-400">Private Key</TableHead>
                        <TableHead className="text-cyan-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificates.map((cert) => (
                        <TableRow key={cert.name} className="hover:bg-slate-700/50">
                          <TableCell className="font-medium text-slate-200">{cert.name}</TableCell>
                          <TableCell className="text-slate-300">
                            {cert.info.certificate ? 
                              <Badge className="bg-green-700">Configured</Badge> : 
                              <Badge className="bg-red-700">Missing</Badge>}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {cert.info.private?.['key-file'] ? 
                              <Badge className="bg-green-700">Configured</Badge> : 
                              <Badge className="bg-red-700">Missing</Badge>}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-slate-700 hover:bg-slate-600"
                              onClick={() => deleteCertificate(cert.name)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end">
                    <Button 
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => setCertificateDialogOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Certificate
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription className="text-slate-400">
                Manage API access keys for VyOS REST API
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>No API keys have been configured</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 bg-slate-700 hover:bg-slate-600"
                    onClick={() => setApiKeyDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add API Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader className="bg-slate-900">
                      <TableRow>
                        <TableHead className="text-cyan-400">ID</TableHead>
                        <TableHead className="text-cyan-400">Key (Masked)</TableHead>
                        <TableHead className="text-cyan-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((apiKey) => (
                        <TableRow key={apiKey.id} className="hover:bg-slate-700/50">
                          <TableCell className="font-medium text-slate-200">{apiKey.id}</TableCell>
                          <TableCell className="text-slate-300 font-mono">
                            {apiKey.key.substring(0, 4)}...{apiKey.key.substring(apiKey.key.length - 4)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-slate-700 hover:bg-slate-600"
                              onClick={() => deleteApiKey(apiKey.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end">
                    <Button 
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => setApiKeyDialogOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Add API Key
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Access Control Tab */}
        <TabsContent value="access" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Client Access Rules
              </CardTitle>
              <CardDescription className="text-slate-400">
                IP addresses and networks allowed to access the HTTPS service
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allowedClients.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Alert className="bg-amber-900/30 border-amber-800 text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No access restrictions configured</AlertTitle>
                    <AlertDescription>
                      No client access rules have been configured. By default, this means all clients can access the HTTPS service.
                      Consider adding access restrictions for improved security.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader className="bg-slate-900">
                      <TableRow>
                        <TableHead className="text-cyan-400">Allowed Client</TableHead>
                        <TableHead className="text-cyan-400">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allowedClients.map((client, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-700/50">
                          <TableCell className="font-medium text-slate-200">{client}</TableCell>
                          <TableCell className="text-slate-300">
                            <Badge className={client.includes('/') ? "bg-blue-700" : "bg-green-700"}>
                              {client.includes('/') ? "Network" : client === "0.0.0.0/0" ? "Any IPv4" : client === "::/0" ? "Any IPv6" : "IP Address"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {allowedClients.some(client => client === "0.0.0.0/0" || client === "::/0") && (
                    <Alert className="bg-amber-900/30 border-amber-800 text-amber-300">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Wide open access detected</AlertTitle>
                      <AlertDescription>
                        Your configuration allows access from any IP address. For improved security, consider restricting access to specific IP addresses or networks.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* API Key Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Add API Key</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new API key for VyOS REST API access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="api-id" className="text-white">Key ID</Label>
              <Input
                id="api-id"
                placeholder="my-api-key"
                className="bg-slate-900 border-slate-700 text-white"
                value={newApiKeyData.id}
                onChange={(e) => setNewApiKeyData({ ...newApiKeyData, id: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-white">API Key</Label>
              <Input
                id="api-key"
                placeholder="Enter a secure API key"
                className="bg-slate-900 border-slate-700 text-white"
                value={newApiKeyData.key}
                onChange={(e) => setNewApiKeyData({ ...newApiKeyData, key: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                This key will be used to authenticate API requests. Make sure it's secure.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-description" className="text-white">Description (optional)</Label>
              <Input
                id="api-description"
                placeholder="API key for application XYZ"
                className="bg-slate-900 border-slate-700 text-white"
                value={newApiKeyData.description}
                onChange={(e) => setNewApiKeyData({ ...newApiKeyData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApiKeyDialogOpen(false)}
              className="bg-slate-700 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={addApiKey}
              disabled={isUpdating}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Upload Dialog */}
      <Dialog open={certificateDialogOpen} onOpenChange={setCertificateDialogOpen}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Upload SSL Certificate</DialogTitle>
            <DialogDescription className="text-slate-400">
              Upload a certificate and private key for HTTPS server
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cert-name" className="text-white">Certificate Name</Label>
              <Input
                id="cert-name"
                placeholder="my-certificate"
                className="bg-slate-900 border-slate-700 text-white"
                value={certificateData.name}
                onChange={(e) => setCertificateData({ ...certificateData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="certificate" className="text-white">Certificate Data</Label>
              <Input
                id="certificate"
                placeholder="Path to certificate file"
                className="bg-slate-900 border-slate-700 text-white"
                value={certificateData.certificate}
                onChange={(e) => setCertificateData({ ...certificateData, certificate: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                Enter the path to the certificate file on the VyOS router
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="private-key" className="text-white">Private Key</Label>
              <Input
                id="private-key"
                placeholder="Path to private key file"
                className="bg-slate-900 border-slate-700 text-white"
                value={certificateData.privateKey}
                onChange={(e) => setCertificateData({ ...certificateData, privateKey: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                Enter the path to the private key file on the VyOS router
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCertificateDialogOpen(false)}
              className="bg-slate-700 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={uploadCertificate}
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