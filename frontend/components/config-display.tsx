import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ConfigDisplayProps {
  config: any;
}

export function ConfigDisplay({ config }: ConfigDisplayProps) {
  if (!config) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Configuration Data Available</AlertTitle>
        <AlertDescription>
          Unable to connect to VyOS router. Please check your connection settings and ensure the VyOS router is accessible.
        </AlertDescription>
      </Alert>
    );
  }

  const sections = [
    { key: "interfaces", title: "Network Interfaces" },
    { key: "system", title: "System Configuration" },
    { key: "service", title: "Services" },
    { key: "firewall", title: "Firewall Rules" },
    { key: "nat", title: "NAT Settings" },
    { key: "protocols", title: "Routing Protocols" },
    { key: "vpn", title: "VPN Configuration" },
  ];

  const hasSections = sections.some(section => config[section.key] && Object.keys(config[section.key]).length > 0);
  
  if (!hasSections) {
    return (
      <Alert className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Limited Configuration Data</AlertTitle>
        <AlertDescription>
          The VyOS router returned configuration data, but none of the expected sections were found.
          Please check your VyOS router configuration.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 mt-6">
      {sections.map(({ key, title }) => 
        config[key] && Object.keys(config[key]).length > 0 ? (
          <Card key={key} className="mb-4">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(config[key], null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : null
      )}
    </div>
  );
} 