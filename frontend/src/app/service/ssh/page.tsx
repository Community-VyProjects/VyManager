"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { SSHContent } from "@/components/service/ssh/SSHContent";

export default function SSHPage() {
  return (
    <AppLayout>
      <SSHContent />
    </AppLayout>
  );
}
