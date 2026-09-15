import type { PPPoESession, PPPoESessionLabelDefinition } from "@/lib/api/pppoe-server";

export type SessionWithRates = PPPoESession & {
  rxRate?: number;
  txRate?: number;
  rxPps?: number;
  txPps?: number;
};

export const DEFAULT_PPPoE_SESSION_LABELS: PPPoESessionLabelDefinition[] = [
  {
    code: "traffic-skew",
    name: "Traffic skew",
    description:
      "Flag a session when upload (RX) bytes exceed 10% of download (TX) bytes, as a generic traffic-skew indicator.",
    severity: "warning",
    priority: 10,
    enabled: true,
    rules: {
      type: "ratio",
      numerator: "rx_bytes",
      denominator: "tx_bytes",
      operator: ">",
      factor: 0.1,
    },
  },
];

export function sessionMetricValue(session: SessionWithRates, field?: string): number {
  if (field === "tx_bytes") return session.tx_bytes ?? 0;
  if (field === "rx_bytes") return session.rx_bytes ?? 0;
  if (field === "txRate") return session.txRate ?? 0;
  if (field === "rxRate") return session.rxRate ?? 0;
  return 0;
}

export function sessionLabelMatches(
  session: SessionWithRates,
  label: PPPoESessionLabelDefinition
): boolean {
  const rules = label.rules;
  if (!rules || rules.type !== "ratio") return false;

  const lhs = sessionMetricValue(session, rules.numerator);
  const rhs = sessionMetricValue(session, rules.denominator);
  const factor = Number(rules.factor ?? 0.1);
  if (!Number.isFinite(factor)) return false;
  if (rhs === 0) return false;

  const ratio = lhs / rhs;
  if (rules.operator === ">") return ratio > factor;
  if (rules.operator === ">=") return ratio >= factor;
  if (rules.operator === "<") return ratio < factor;
  if (rules.operator === "<=") return ratio <= factor;
  return false;
}

export function sessionMatchingLabels(
  session: SessionWithRates,
  labels: PPPoESessionLabelDefinition[]
): PPPoESessionLabelDefinition[] {
  return labels
    .filter((label) => label.enabled !== false)
    .filter((label) => sessionLabelMatches(session, label))
    .sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));
}

export function sessionKey(session: SessionWithRates): string {
  return `${session.interface}:${session.username}:${session.calling_sid ?? ""}`;
}
