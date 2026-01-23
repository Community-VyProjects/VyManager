"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { IPsecPanel } from "@/components/vpn/IPsecPanel";

export default function IPsecPage() {
  return (
    <AppLayout>
      <IPsecPanel />
    </AppLayout>
  );
}
