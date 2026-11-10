"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { SaltMinionContent } from "@/components/service/salt-minion/SaltMinionContent";

export default function SaltMinionPage() {
  return (
    <AppLayout>
      <SaltMinionContent />
    </AppLayout>
  );
}
