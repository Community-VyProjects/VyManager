"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bug, RotateCcw } from "lucide-react";
import { recordError } from "@/lib/error-capture";
import { BugReportModal } from "@/components/bug-report/BugReportModal";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  reportOpen: boolean;
}

/**
 * Catches render-time errors in the page subtree so a crash shows a friendly
 * fallback (with a one-click bug report) instead of a blank screen. The error
 * is pushed into the capture buffer so the report auto-attaches the stack.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, reportOpen: false };

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    recordError({
      time: Date.now(),
      kind: "react",
      message: error.message || "React render error",
      stack: `${error.stack ?? ""}${info.componentStack ? `\n\nComponent stack:${info.componentStack}` : ""}`,
    });
  }

  private reset = () => this.setState({ hasError: false, reportOpen: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            This part of the app hit an unexpected error. You can report it (the error
            details are attached automatically) or try reloading.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" className="gap-2" onClick={() => this.setState({ reportOpen: true })}>
            <Bug className="h-4 w-4" />
            Report a Bug
          </Button>
          <Button variant="outline" className="gap-2" onClick={this.reset}>
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>
        <BugReportModal
          open={this.state.reportOpen}
          onOpenChange={(open) => this.setState({ reportOpen: open })}
        />
      </div>
    );
  }
}
