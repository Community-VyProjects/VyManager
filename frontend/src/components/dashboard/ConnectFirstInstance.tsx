"use client";

import Link from "next/link";
import { Router, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Zero-instance dashboard state: shown when the user is logged in but no
 * VyOS instance exists yet anywhere they can see. Users who do have
 * instances but are simply disconnected are redirected to the site manager
 * instead (see app/page.tsx).
 */
export function ConnectFirstInstance() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Router className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Connect your first VyOS instance</h2>
          <p className="text-sm text-muted-foreground">
            VyManager is running, but no router has been added yet. Add a VyOS
            instance in the Site Manager and connect to it to start managing
            your network. You will need the router&apos;s address and its HTTP
            API key.
          </p>
          <Button asChild className="mt-2">
            <Link href="/sites">
              Open Site Manager
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
