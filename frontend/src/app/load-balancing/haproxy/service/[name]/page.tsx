import { AppLayout } from "@/components/layout/AppLayout";
import { HAProxyServiceDetail } from "@/components/load-balancing/HAProxyServiceDetail";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function HAProxyServicePage({ params }: Props) {
  const { name } = await params;
  return (
    <AppLayout>
      <HAProxyServiceDetail serviceName={decodeURIComponent(name)} />
    </AppLayout>
  );
}
