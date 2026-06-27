import { DashboardCard } from "./api/dashboard";

// ============================================================================
// Grid geometry
// ============================================================================

/** Number of columns in the dashboard grid. */
export const GRID_COLUMNS = 3;

/** Height (px) of a single grid row-unit. Cards span an integer number of these. */
export const ROW_UNIT = 46;

/** Gap (px) between grid tracks — must match the `gap-6` class on the grid. */
export const GRID_GAP = 24;

/**
 * Height presets, expressed as a count of row-units. Rendered pixel height of a
 * card is `n*ROW_UNIT + (n-1)*GRID_GAP`, so:
 *   compact  ≈ 6*46 + 5*24  = 396px
 *   standard ≈ 8*46 + 7*24  = 536px  (≈ the old fixed 520px height)
 *   tall     ≈ 11*46 + 10*24 = 746px
 */
export const CARD_HEIGHTS = {
  compact: 6,
  standard: 8,
  tall: 12,
} as const;

/** Default height for new cards and legacy cards that predate the height field. */
export const DEFAULT_HEIGHT = CARD_HEIGHTS.standard;

/** Ordered presets for the card size menu. */
export const HEIGHT_PRESETS: { label: string; value: number }[] = [
  { label: "Compact", value: CARD_HEIGHTS.compact },
  { label: "Standard", value: CARD_HEIGHTS.standard },
  { label: "Tall", value: CARD_HEIGHTS.tall },
];

/** Resolved pixel height of a card given its row-unit height. */
export function cardPixelHeight(height: number): number {
  const h = Math.max(height, 1);
  return h * ROW_UNIT + (h - 1) * GRID_GAP;
}

// ============================================================================
// Placement engine
// ============================================================================

/**
 * Pack cards into the grid with no overlaps, pulling everything upward
 * (column-respecting vertical compaction, like react-grid-layout's vertical
 * compactType). Each card occupies a rectangle of columns
 * `[column .. column+span-1]` × row-units `[position .. position+height-1]`.
 *
 * A card's column is preserved (clamped to fit the grid width); its vertical
 * position is recomputed as the lowest free row in that column range. Process
 * order — and therefore who claims the top slots — follows each card's current
 * `(position, column)`, so callers steer placement by setting a tentative
 * `position` before calling (e.g. a fractional value to insert above a target).
 *
 * Returns new card objects; inputs are not mutated.
 */
export function compactLayout(cards: DashboardCard[]): DashboardCard[] {
  // Occupancy: row-unit index -> set of occupied columns.
  const occ: Map<number, Set<number>> = new Map();

  const isFree = (col: number, row: number, span: number, height: number): boolean => {
    const endCol = col + span - 1;
    for (let r = row; r < row + height; r++) {
      const set = occ.get(r);
      if (!set) continue;
      for (let c = col; c <= endCol; c++) {
        if (set.has(c)) return false;
      }
    }
    return true;
  };

  const mark = (col: number, row: number, span: number, height: number): void => {
    const endCol = col + span - 1;
    for (let r = row; r < row + height; r++) {
      let set = occ.get(r);
      if (!set) {
        set = new Set();
        occ.set(r, set);
      }
      for (let c = col; c <= endCol; c++) set.add(c);
    }
  };

  const ordered = [...cards].sort((a, b) => {
    const pa = a.position ?? 0;
    const pb = b.position ?? 0;
    if (pa !== pb) return pa - pb;
    return (a.column ?? 0) - (b.column ?? 0);
  });

  return ordered.map((card) => {
    const span = Math.min(Math.max(card.span ?? 1, 1), GRID_COLUMNS);
    const height = Math.max(card.height ?? DEFAULT_HEIGHT, 1);
    // Clamp the start column so the card fits within the grid width.
    const col = Math.min(Math.max(card.column ?? 0, 0), GRID_COLUMNS - span);

    let row = 0;
    while (!isFree(col, row, span, height)) row++;
    mark(col, row, span, height);

    return { ...card, span, height, column: col, position: row };
  });
}
