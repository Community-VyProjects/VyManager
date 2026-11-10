"use client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConntrackSyncContent } from "@/components/service/conntrack-sync/ConntrackSyncContent";

export default function ConntrackSyncPage() {
  return (
    <AppLayout>
      <ConntrackSyncContent />
    </AppLayout>
  );
}
