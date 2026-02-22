"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoadBalancingRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/load-balancing/haproxy");
  }, [router]);
  return null;
}
