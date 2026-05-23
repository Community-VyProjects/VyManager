"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { DNSDynamicContent } from "@/components/dns-dynamic/DNSDynamicContent";

export default function DNSDynamicPage() {
  return (
    <AppLayout>
      <DNSDynamicContent />
    </AppLayout>
  );
}
