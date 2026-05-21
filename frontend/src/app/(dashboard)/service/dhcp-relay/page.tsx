"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { DHCPRelayContent } from "@/components/dhcp-relay/DHCPRelayContent";

export default function DHCPRelayPage() {
  return (
    <AppLayout>
      <DHCPRelayContent />
    </AppLayout>
  );
}
