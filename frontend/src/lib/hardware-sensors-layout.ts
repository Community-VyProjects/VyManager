/**
 * Inner layout for HardwareSensorsCard.
 * Dashboard span is the width signal. Viewport breakpoints (sm:) are not,
 * because a 1-column card on a wide monitor is still a narrow card.
 */
export function hardwareSensorsLayout(span: number | undefined) {
  const wide = (span ?? 1) >= 2;
  return {
    wide,
    tileGridClass: wide ? "grid gap-3 grid-cols-2" : "grid gap-3 grid-cols-1",
    statusClass: wide
      ? "flex flex-row items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3"
      : "flex flex-col items-stretch gap-3 rounded-lg border bg-muted/30 p-3",
    tileClass: wide
      ? "flex flex-row items-start justify-between gap-3 p-3 rounded-lg border bg-card"
      : "flex flex-col gap-2 p-3 rounded-lg border bg-card",
    nameClass: "break-words font-medium text-sm",
    showLiveLabel: wide,
  };
}
