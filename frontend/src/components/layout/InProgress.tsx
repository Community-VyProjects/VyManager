"use client";

import { Construction, Sparkles, Zap } from "lucide-react";

export function InProgress() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="text-center space-y-6 max-w-md">
        {/* Animated Icon */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-8">
            <Construction className="h-16 w-16 text-primary mx-auto animate-bounce" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            In Progress
          </h2>
          <p className="text-muted-foreground text-lg">
            We're building something amazing
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span>Coming Soon</span>
          </div>
          <div className="w-px h-4 bg-border"></div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-blue-500" />
            <span>In Development</span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="pt-6">
          <div className="h-1 w-full bg-border rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-primary to-primary/50 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
