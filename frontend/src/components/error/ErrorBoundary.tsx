"use client";

import { Component, type ReactNode } from "react";
import { useTranslations } from "next-intl";
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

/** Fallback text and actions; a function component so it can use translations. */
function ErrorFallbackContent({ onReport, onReset }: { onReport: () => void; onReset: () => void }) {
  const t = useTranslations("sharedMisc");
  return (
    <>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("error.title")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("error.description")}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="default" className="gap-2" onClick={onReport}>
          <Bug className="h-4 w-4" />
          {t("error.report")}
        </Button>
        <Button variant="outline" className="gap-2" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {t("error.tryAgain")}
        </Button>
      </div>
    </>
  );
}

/**
 * Catches render-time errors in the page subtree so a crash shows a friendly
 * fallback (with a one-click bug report) instead of a blank screen. The error
 * is pushed into the capture buffer so the report auto-attaches the stack.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, reportOpen: false };

  static getDerivedStateFromError(): Partial<State> {
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
        <ErrorFallbackContent
          onReport={() => this.setState({ reportOpen: true })}
          onReset={this.reset}
        />
        <BugReportModal
          open={this.state.reportOpen}
          onOpenChange={(open) => this.setState({ reportOpen: open })}
        />
      </div>
    );
  }
}
