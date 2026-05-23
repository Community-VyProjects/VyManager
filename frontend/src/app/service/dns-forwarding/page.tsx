"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { DNSForwardingContent } from "@/components/dns-forwarding/DNSForwardingContent";

export default function DNSForwardingPage() {
  return (
    <AppLayout>
      <DNSForwardingContent />
    </AppLayout>
  );
}
