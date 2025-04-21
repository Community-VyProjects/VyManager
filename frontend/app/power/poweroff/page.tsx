"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { executeSavingMethod } from "@/app/utils";

export default function PoweroffPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const executePoweroff = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/poweroff`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success === true) {
        toast({
            variant: "default",
            title: "Poweroff signal received",
            description: "VyOS has received the poweroff command",
          });
      } else {
        throw new Error(data.error || "Poweroff unsuccessful");
      }
    } catch (error) {
      console.error("Error sending poweroff command:", error);
      toast({
        variant: "destructive",
        title: "Error sending poweroff command",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConfig = async () => {
    executeSavingMethod();
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/config`);

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success === true && data.data) {
        setConfig(data.data);
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

  useEffect(() => {
    Promise.all([fetchConfig()]);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading Poweroff page...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">Poweroff</h1>
          <p className="text-slate-400">Shut down your VyOS router</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700"
            onClick={() => executePoweroff()}
          >
            Poweroff Now
          </Button>
        </div>
      </div>
    </div>
  );
}
