"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { DHCPv6RelayContent } from "@/components/dhcpv6-relay/DHCPv6RelayContent";

export default function DHCPv6RelayPage() {
  return (
    <AppLayout>
      <DHCPv6RelayContent />
    </AppLayout>
  );
}
