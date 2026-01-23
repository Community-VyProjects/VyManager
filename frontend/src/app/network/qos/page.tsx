"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { QoSPanel } from "@/components/network/QoSPanel";

export default function QoSPage() {
  return (
    <AppLayout>
      <QoSPanel />
    </AppLayout>
  );
}
