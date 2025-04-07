"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, RefreshCw, AlertTriangle, Terminal, Code, Database, FileText, DownloadCloud, Search, Filter } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

// Use regular HTML textarea instead of the missing component
const Textarea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={`w-full p-2 rounded-md ${className}`} {...props} />
);

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

const AlertDialogCancel = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <Button variant="outline" className={className}>{children}</Button>
);

export default function AdvancedPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("cli")
  const [cliCommand, setCliCommand] = useState("")
  const [cliOutput, setCliOutput] = useState<string[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [configText, setConfigText] = useState("")
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{action: string, payload?: any} | null>(null)
  const [diagnosticResults, setDiagnosticResults] = useState<{[key: string]: {status: string, output: string}}>({})
  const [tracerouteHost, setTracerouteHost] = useState("")
  const [pingHost, setPingHost] = useState("")
  const [systemProcesses, setSystemProcesses] = useState<{name: string, cpu: string, memory: string, uptime: string}[]>([])
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const executeCli = async () => {
    if (!cliCommand.trim()) return;
    
    setIsExecuting(true);
    setCliOutput(prev => [...prev, `$ ${cliCommand}`]);
    
    try {
      const response = await fetch(`${apiUrl}/api/cli`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: cliCommand }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCliOutput(prev => [...prev, data.output || 'Command executed successfully.']);
      } else {
        setCliOutput(prev => [...prev, `Error: ${data.error || 'Unknown error'}`]);
      }
    } catch (error) {
      console.error("Error executing command:", error);
      setCliOutput(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsExecuting(false);
      setCliCommand("");
    }
  };

  const runDiagnostic = async (test: string, host?: string) => {
    setDiagnosticResults(prev => ({
      ...prev,
      [test]: { status: "running", output: "" }
    }));
    
    try {
      const endpoint = test === 'ping' || test === 'traceroute' 
        ? `${apiUrl}/api/diagnostic/${test}?host=${encodeURIComponent(host || '')}`
        : `${apiUrl}/api/diagnostic/${test}`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDiagnosticResults(prev => ({
          ...prev,
          [test]: { status: "complete", output: data.output || 'Test completed successfully.' }
        }));
      } else {
        setDiagnosticResults(prev => ({
          ...prev,
          [test]: { status: "error", output: data.error || 'Unknown error' }
        }));
      }
    } catch (error) {
      console.error(`Error running diagnostic ${test}:`, error);
      setDiagnosticResults(prev => ({
        ...prev,
        [test]: { status: "error", output: error instanceof Error ? error.message : 'Unknown error' }
      }));
    }
  };

  const handleConfigSave = () => {
    setPendingAction({ action: 'saveConfig', payload: configText });
    setConfirmDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    
    try {
      switch(pendingAction.action) {
        case 'saveConfig':
          setIsLoading(true);
          const response = await fetch(`${apiUrl}/api/config`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ config: pendingAction.payload }),
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.success) {
            toast({
              title: "Configuration saved",
              description: "The configuration has been saved successfully."
            });
          } else {
            throw new Error(data.error || 'Failed to save configuration');
          }
          break;
      }
    } catch (error) {
      console.error("Error performing action:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setPendingAction(null);
      setConfirmDialogOpen(false);
      setIsLoading(false);
    }
  };

  const loadSystemProcesses = async () => {
    setIsLoadingProcesses(true);
    try {
      const response = await fetch(`${apiUrl}/api/system/processes`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSystemProcesses(data.processes || []);
      } else {
        throw new Error(data.error || 'Failed to load processes');
      }
    } catch (error) {
      console.error("Error loading processes:", error);
      toast({
        variant: "destructive",
        title: "Error loading processes",
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoadingProcesses(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
      
      if (activeTab === "processes") {
        await loadSystemProcesses();
      }
      
      toast({
        title: "Data refreshed",
        description: "Successfully refreshed system data"
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        variant: "destructive",
        title: "Error refreshing data",
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load configuration
  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/config`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setConfigText(data.config || '');
      } else {
        throw new Error(data.error || 'Failed to load configuration');
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
      toast({
        variant: "destructive",
        title: "Error loading configuration",
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data loading
  useEffect(() => {
    loadData();
  }, []);

  // Load processes when the processes tab is selected
  useEffect(() => {
    if (activeTab === "processes" && !isLoading && systemProcesses.length === 0) {
      loadSystemProcesses();
    }
  }, [activeTab, isLoading, systemProcesses.length]);

  // Update the onKeyDown handler to fix the implicit any error
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isExecuting) {
      executeCli();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading advanced configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-slate-400">Advanced system configuration and diagnostics</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700"
            disabled={true}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Advanced Mode
          </Button>
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
        </div>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4 w-[600px]">
          <TabsTrigger value="cli">
            <Terminal className="h-4 w-4 mr-2" />
            CLI
          </TabsTrigger>
          <TabsTrigger value="config">
            <Code className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="diagnostics">
            <Search className="h-4 w-4 mr-2" />
            Diagnostics
          </TabsTrigger>
          <TabsTrigger value="processes">
            <Database className="h-4 w-4 mr-2" />
            Processes
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="cli">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">Command Line Interface</CardTitle>
              <CardDescription className="text-slate-400">
                Execute VyOS CLI commands directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 rounded-md p-4 mb-4">
                <ScrollArea className="h-96 w-full">
                  <div className="font-mono text-sm text-slate-300 whitespace-pre-wrap">
                    {cliOutput.length === 0 ? (
                      <p className="text-slate-500 italic">Output will appear here. Type a command below and press Enter.</p>
                    ) : (
                      cliOutput.map((line, index) => (
                        <div key={index} className={`mb-1 ${line.startsWith('$') ? 'text-cyan-400' : ''}`}>
                          {line}
                        </div>
                      ))
                    )}
                    {isExecuting && <div className="animate-pulse text-amber-400">Executing command...</div>}
                  </div>
                </ScrollArea>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">$</span>
                  <Input
                    className="pl-7 bg-slate-900 border-slate-700 text-white font-mono"
                    placeholder="Enter command..."
                    value={cliCommand}
                    onChange={(e) => setCliCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <Button 
                  onClick={executeCli} 
                  disabled={isExecuting || !cliCommand.trim()}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Execute"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="config">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">Configuration Editor</CardTitle>
              <CardDescription className="text-slate-400">
                View and edit the full configuration in text format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 rounded-md p-4 mb-4">
                <Textarea
                  className="font-mono text-sm h-96 bg-slate-900 border-slate-700 text-white resize-none"
                  value={configText}
                  onChange={(e) => setConfigText(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  onClick={() => loadData()}
                >
                  Reset
                </Button>
                <Button 
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={handleConfigSave}
                >
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="diagnostics">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">System Diagnostics</CardTitle>
              <CardDescription className="text-slate-400">
                Tools for troubleshooting and diagnostics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-900 p-4 rounded-md">
                  <h3 className="text-lg font-medium text-white mb-2">Network Tests</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Input 
                          placeholder="Enter hostname or IP..." 
                          className="bg-slate-800 border-slate-700 text-white"
                          value={pingHost}
                          onChange={(e) => setPingHost(e.target.value)}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="whitespace-nowrap bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                          onClick={() => runDiagnostic('ping', pingHost)}
                          disabled={!pingHost.trim() || diagnosticResults.ping?.status === 'running'}
                        >
                          {diagnosticResults.ping?.status === 'running' ? 
                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 
                            null
                          }
                          Ping
                        </Button>
                      </div>
                      
                      {diagnosticResults.ping?.output && (
                        <div className="bg-slate-800 p-2 rounded-md mt-2">
                          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-32 overflow-auto">
                            {diagnosticResults.ping.output}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Input 
                          placeholder="Enter hostname or IP..." 
                          className="bg-slate-800 border-slate-700 text-white"
                          value={tracerouteHost}
                          onChange={(e) => setTracerouteHost(e.target.value)}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="whitespace-nowrap bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                          onClick={() => runDiagnostic('traceroute', tracerouteHost)}
                          disabled={!tracerouteHost.trim() || diagnosticResults.traceroute?.status === 'running'}
                        >
                          {diagnosticResults.traceroute?.status === 'running' ? 
                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 
                            null
                          }
                          Traceroute
                        </Button>
                      </div>
                      
                      {diagnosticResults.traceroute?.output && (
                        <div className="bg-slate-800 p-2 rounded-md mt-2">
                          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-32 overflow-auto">
                            {diagnosticResults.traceroute.output}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        onClick={() => runDiagnostic('dns')}
                        disabled={diagnosticResults.dns?.status === 'running'}
                      >
                        {diagnosticResults.dns?.status === 'running' ? 
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 
                          null
                        }
                        Test DNS Resolution
                      </Button>
                      
                      {diagnosticResults.dns?.output && (
                        <div className="bg-slate-800 p-2 rounded-md mt-2">
                          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-32 overflow-auto">
                            {diagnosticResults.dns.output}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        onClick={() => runDiagnostic('connections')}
                        disabled={diagnosticResults.connections?.status === 'running'}
                      >
                        {diagnosticResults.connections?.status === 'running' ? 
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 
                          null
                        }
                        Show Active Connections
                      </Button>
                      
                      {diagnosticResults.connections?.output && (
                        <div className="bg-slate-800 p-2 rounded-md mt-2">
                          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-32 overflow-auto">
                            {diagnosticResults.connections.output}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-900 p-4 rounded-md">
                  <h3 className="text-lg font-medium text-white mb-2">System Status</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        onClick={() => runDiagnostic('memory')}
                        disabled={diagnosticResults.memory?.status === 'running'}
                      >
                        {diagnosticResults.memory?.status === 'running' ? 
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 
                          null
                        }
                        Memory Usage
                      </Button>
                      
                      {diagnosticResults.memory?.output && (
                        <div className="bg-slate-800 p-2 rounded-md mt-2">
                          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-32 overflow-auto">
                            {diagnosticResults.memory.output}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        onClick={() => runDiagnostic('disk')}
                        disabled={diagnosticResults.disk?.status === 'running'}
                      >
                        {diagnosticResults.disk?.status === 'running' ? 
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 
                          null
                        }
                        Disk Usage
                      </Button>
                      
                      {diagnosticResults.disk?.output && (
                        <div className="bg-slate-800 p-2 rounded-md mt-2">
                          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-32 overflow-auto">
                            {diagnosticResults.disk.output}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">System Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-800 p-2 rounded-md">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mb-2 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      onClick={() => runDiagnostic('logs')}
                      disabled={diagnosticResults.logs?.status === 'running'}
                    >
                      {diagnosticResults.logs?.status === 'running' ? 
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 
                        <RefreshCw className="h-4 w-4 mr-2" />
                      }
                      Fetch System Logs
                    </Button>
                    
                    <ScrollArea className="h-40 w-full">
                      <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap">
                        {diagnosticResults.logs?.output ? (
                          <pre className="whitespace-pre-wrap">
                            {diagnosticResults.logs.output}
                          </pre>
                        ) : (
                          <p className="text-slate-500 italic">Click "Fetch System Logs" to display recent system logs</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="processes">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">System Processes</CardTitle>
              <CardDescription className="text-slate-400">
                View and manage running system processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProcesses ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                </div>
              ) : systemProcesses.length > 0 ? (
                <Table>
                  <TableHeader className="bg-slate-900">
                    <TableRow>
                      <TableHead className="text-cyan-400">Process</TableHead>
                      <TableHead className="text-cyan-400">CPU</TableHead>
                      <TableHead className="text-cyan-400">Memory</TableHead>
                      <TableHead className="text-cyan-400">Uptime</TableHead>
                      <TableHead className="text-cyan-400 w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemProcesses.map((process, index) => (
                      <TableRow key={index} className="hover:bg-slate-700/50">
                        <TableCell className="font-medium text-slate-200">{process.name}</TableCell>
                        <TableCell className="text-slate-300">{process.cpu}</TableCell>
                        <TableCell className="text-slate-300">{process.memory}</TableCell>
                        <TableCell className="text-slate-300">{process.uptime}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                            disabled={true}
                          >
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>No process data available</p>
                  <Button 
                    onClick={loadSystemProcesses} 
                    variant="outline" 
                    className="mt-4 bg-slate-800 border-slate-700 hover:bg-slate-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Load Processes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-cyan-400">Confirm Action</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {pendingAction?.action === 'saveConfig' 
                ? "Are you sure you want to save this configuration? This will modify your VyOS system configuration."
                : "Are you sure you want to perform this action?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="bg-cyan-600 hover:bg-cyan-700" onClick={confirmAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 