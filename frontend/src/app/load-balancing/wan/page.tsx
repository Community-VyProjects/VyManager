"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { WANContent } from "@/components/load-balancing/WANContent";

export default function WANPage() {
  return (
    <AppLayout>
      <WANContent />
    </AppLayout>
  );
}
