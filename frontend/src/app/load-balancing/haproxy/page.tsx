"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { HAProxyContent } from "@/components/load-balancing/HAProxyContent";

export default function HAProxyPage() {
  return (
    <AppLayout>
      <HAProxyContent />
    </AppLayout>
  );
}
