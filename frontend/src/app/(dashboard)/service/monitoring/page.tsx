"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { ServiceMonitoringContent } from "@/components/service-monitoring/ServiceMonitoringContent";

export default function ServiceMonitoringPage() {
  return (
    <AppLayout>
      <ServiceMonitoringContent />
    </AppLayout>
  );
}
