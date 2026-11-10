"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { DHCPRelayContent } from "@/components/service/dhcp-relay/DHCPRelayContent";

export default function DHCPRelayPage() {
  return (
    <AppLayout>
      <DHCPRelayContent />
    </AppLayout>
  );
}
