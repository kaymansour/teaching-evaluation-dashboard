// lib/chart-theme.ts
//
// The colours and shared chart settings the dashboards draw with.
//
// The values are CSS variables declared in app/globals.css, so a change
// there moves every chart at once and dark mode needs no second set of
// values here. Recharts hands these straight to SVG fill and stroke
// attributes, which accept var() the same way CSS does.

export const VIZ = {
  // A score that meets the threshold, and the track behind it
  meets: "var(--viz-meets)",
  meetsTrack: "var(--viz-meets-track)",

  // A score below the threshold, and the track behind it
  below: "var(--viz-below)",
  belowTrack: "var(--viz-below-track)",

  // The threshold rule, and the institutional average rule
  threshold: "var(--viz-threshold)",
  benchmark: "var(--viz-benchmark)",

  // Chart chrome
  surface: "var(--chart-surface)",
  ink: "var(--chart-ink)",
  inkMuted: "var(--chart-ink-muted)",
  grid: "var(--chart-grid)",
} as const;

// Which colour a score takes, given where it sits against the threshold.
// Blue for meeting it, red for falling short. Every chart uses this one
// function so nothing drifts.
export function scoreColor(score: number | null, target: number) {
  if (score === null) return VIZ.inkMuted;
  return score < target ? VIZ.below : VIZ.meets;
}

export function scoreTrack(score: number | null, target: number) {
  if (score === null) return VIZ.grid;
  return score < target ? VIZ.belowTrack : VIZ.meetsTrack;
}

// Shared axis styling. Hairline, recessive, out of the data's way.
export const AXIS_TICK = {
  fill: VIZ.inkMuted,
  fontSize: 12,
} as const;

export const GRID = {
  stroke: VIZ.grid,
  strokeWidth: 1,
} as const;

// Marks are thin by house rule: bars never fill their slot, and the
// leftover band is the air that keeps a chart calm.
export const BAR_SIZE = 22;
export const LINE_WIDTH = 2;
export const DOT_RADIUS = 4;
