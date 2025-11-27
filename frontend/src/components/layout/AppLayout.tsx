import { Sidebar } from "./Sidebar";
import { UnsavedChangesBanner } from "../config/UnsavedChangesBanner";
import { Toaster } from "../ui/toaster";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <UnsavedChangesBanner />
        {children}
      </main>
      <Toaster />
    </div>
  );
}
