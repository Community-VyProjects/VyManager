"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigSyncContent } from "@/components/service/config-sync/ConfigSyncContent";

export default function ConfigSyncPage() {
  return (
    <AppLayout>
      <ConfigSyncContent />
    </AppLayout>
  );
}
