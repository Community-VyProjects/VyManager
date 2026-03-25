"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RebootModal } from "@/components/system/RebootModal";
import { PoweroffModal } from "@/components/system/PoweroffModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Power, PowerOff, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  const [rebootModalOpen, setRebootModalOpen] = useState(false);
  const [poweroffModalOpen, setPoweroffModalOpen] = useState(false);

  const handleRebootSuccess = () => {
    // Modal will close automatically
    // Optionally show a toast notification
  };

  const handlePoweroffSuccess = () => {
    // Modal will close automatically
    // Optionally show a toast notification
  };

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage system power and configuration settings
          </p>
        </div>

        {/* Power Management Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Power Management</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Reboot Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-5 w-5 text-orange-500" />
                  Reboot System
                </CardTitle>
                <CardDescription>
                  Restart the VyOS system to apply changes or troubleshoot issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setRebootModalOpen(true)}
                >
                  <Power className="h-4 w-4 mr-2" />
                  Schedule Reboot
                </Button>
              </CardContent>
            </Card>

            {/* Poweroff Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PowerOff className="h-5 w-5 text-red-500" />
                  Poweroff System
                </CardTitle>
                <CardDescription>
                  Completely shut down the VyOS system (requires manual power-on)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setPoweroffModalOpen(true)}
                >
                  <PowerOff className="h-4 w-4 mr-2" />
                  Schedule Poweroff
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RebootModal
        open={rebootModalOpen}
        onOpenChange={setRebootModalOpen}
        onSuccess={handleRebootSuccess}
      />
      <PoweroffModal
        open={poweroffModalOpen}
        onOpenChange={setPoweroffModalOpen}
        onSuccess={handlePoweroffSuccess}
      />
    </AppLayout>
  );
}
