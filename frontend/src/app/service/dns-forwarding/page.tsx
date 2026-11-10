"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { DNSForwardingContent } from "@/components/service/dns-forwarding/DNSForwardingContent";

export default function DNSForwardingPage() {
  return (
    <AppLayout>
      <DNSForwardingContent />
    </AppLayout>
  );
}
