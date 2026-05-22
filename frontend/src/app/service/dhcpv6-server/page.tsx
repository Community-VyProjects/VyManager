"use client";
import { AppLayout } from "@/components/layout/AppLayout";
import { DHCPv6ServerContent } from "@/components/dhcpv6-server/DHCPv6ServerContent";

export default function DHCPv6ServerPage() {
  return (
    <AppLayout>
      <DHCPv6ServerContent />
    </AppLayout>
  );
}
