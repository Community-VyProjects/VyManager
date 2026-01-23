"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { OpenVPNPanel } from "@/components/vpn/OpenVPNPanel";

export default function OpenVPNPage() {
  return (
    <AppLayout>
      <OpenVPNPanel />
    </AppLayout>
  );
}
