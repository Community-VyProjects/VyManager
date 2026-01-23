"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Activity, Clock, Construction } from "lucide-react";

export default function FailoverTrackingPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Failover & Tracking</h1>
            <p className="text-muted-foreground mt-2">
              Route failover and health tracking configuration
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-amber-500/10">
                <Construction className="h-12 w-12 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
                <p className="text-muted-foreground">
                  Route failover and health tracking features are currently under development.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Planned features:</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  Interface tracking
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  ICMP/TCP health checks
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  Route failover automation
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
