// components/dashboard/report-ui.tsx
//
// The pieces every page is built from: status pills, meters, section
// headings, cards, tables and the shared tooltip.
//
// Deliberately not marked "use client" and free of Recharts, so the
// server-rendered landing page can use the same components as the two
// interactive dashboards. The plots live in report-charts.tsx.

import { type ReactNode } from "react";

import { Card } from "@/components/ui/card";

import { VIZ, scoreColor, scoreTrack } from "@/lib/chart-theme";

export function showScore(score: number | null) {
  if (score === null) return "\u2014";
  return `${score}%`;
}

// A signed difference. The sign carries the meaning, so the colour is
// reinforcement rather than the only channel.
export function Delta({
  value,
  className = "tabular-nums",
}: {
  value: number | null;
  /** Columns want tabular figures; a large standalone number does not. */
  className?: string;
}) {
  if (value === null) {
    return <span className="text-muted-foreground">{"\u2014"}</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={className}
      style={{
        color: positive
          ? "var(--status-good-inline)"
          : "var(--status-critical-inline)",
      }}
    >
      {positive ? "+" : "\u2212"}
      {Math.abs(value)}
    </span>
  );
}

// A status always ships with its written label; the dot is only a cue.
export function StatusPill({ status }: { status: string }) {
  const needsWork = status === "Improvement Required";
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: needsWork
          ? "var(--status-critical-wash)"
          : "var(--status-good-wash)",
        color: needsWork
          ? "var(--status-critical-inline)"
          : "var(--status-good-inline)",
      }}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{
          backgroundColor: needsWork
            ? "var(--status-critical)"
            : "var(--status-good)",
        }}
      />
      {needsWork ? "Improvement required" : "Acceptable"}
    </span>
  );
}

// A score against the threshold. The track is a lighter step of the
// fill's own colour, so the state reads across the whole bar.
export function Meter({
  score,
  target,
  benchmark = null,
  className = "h-2",
}: {
  score: number | null;
  target: number;
  /** An optional second marker, e.g. the institutional average. */
  benchmark?: number | null;
  className?: string;
}) {
  if (score === null) return null;
  return (
    <div
      className={"relative w-full overflow-hidden rounded-full " + className}
      style={{ backgroundColor: scoreTrack(score, target) }}
      role="img"
      aria-label={`${score}% against a ${target}% threshold`}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(score, 100)}%`,
          backgroundColor: scoreColor(score, target),
        }}
      />
      <div
        aria-hidden
        className="absolute inset-y-0 w-px bg-foreground/45"
        style={{ left: `${target}%` }}
      />
      {benchmark !== null && (
        <div
          aria-hidden
          className="absolute inset-y-0 w-px"
          style={{
            left: `${Math.min(benchmark, 100)}%`,
            backgroundColor: VIZ.benchmark,
          }}
        />
      )}
    </div>
  );
}

export function SectionHeader({ title, lede }: { title: string; lede: ReactNode }) {
  return (
    <div className="mb-6 border-b pb-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{lede}</p>
    </div>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold tracking-tight">{children}</h3>
  );
}

// A card built to hold a chart: a title, the plot, then an optional
// key and caption underneath.
export function Panel({
  title,
  children,
  keyItems,
  caption,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  keyItems?: KeyItem[];
  caption?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={"gap-0 p-5 " + className}>
      {title ? (
        <p className="mb-4 text-sm font-medium leading-snug">{title}</p>
      ) : null}
      {children}
      {keyItems ? <ChartKey items={keyItems} /> : null}
      {caption ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {caption}
        </p>
      ) : null}
    </Card>
  );
}

export type KeyItem = { label: string; color: string; dashed?: boolean };

// The identity channel. Every chart that encodes something in colour
// says so here in words, so colour never carries meaning alone.
export function ChartKey({ items }: { items: KeyItem[] }) {
  return (
    <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          {item.dashed ? (
            <span
              aria-hidden
              className="h-0 w-4 shrink-0 border-t-2 border-dashed"
              style={{ borderColor: item.color }}
            />
          ) : (
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

// The threshold key, used by every chart that draws the line
export function thresholdKey(target: number): KeyItem {
  return { label: `${target}% threshold`, color: VIZ.threshold, dashed: true };
}

// The pass/fail key, used by every chart whose marks are coloured by
// where they sit against the threshold
export function statusKeys(target: number): KeyItem[] {
  return [
    { label: `Meets the ${target}% threshold`, color: VIZ.meets },
    { label: "Improvement required", color: VIZ.below },
  ];
}

// One tooltip for the whole dashboard, styled like the cards.
export type TooltipRow = { full?: string; answers?: number };

export function ChartTooltip({
  active,
  payload,
  label,
  valueLabel = "Average",
}: {
  active?: boolean;
  payload?: { value?: number | string; payload?: TooltipRow }[];
  label?: string | number;
  valueLabel?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload ?? {};
  const value = payload[0]?.value;
  return (
    <div className="rounded-lg bg-card px-3 py-2 shadow-lg ring-1 ring-foreground/10">
      <p className="text-xs font-medium">{row.full ?? label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">{valueLabel}</span>
        <span className="text-sm font-semibold tabular-nums">{value}%</span>
      </p>
      {row.answers !== undefined ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {row.answers.toLocaleString()} answers
        </p>
      ) : null}
    </div>
  );
}

// Only the final point on a line is labelled; the axis and the tooltip
// carry the rest. A number beside every dot goes unread.
//
// This has to be a valueAccessor rather than a formatter: Recharts
// calls a label formatter with the value alone, so there is no index
// to test. valueAccessor receives one, but only when the LabelList
// carries no dataKey of its own.
export function endpointOnly(length: number) {
  return (entry: { payload?: { score?: number } }, index: number) =>
    index === length - 1 ? `${entry.payload?.score}%` : "";
}

// Table styling, kept in one place so every table matches.
// The alignment utilities are held apart rather than concatenated onto
// one base string, since two conflicting Tailwind classes on the same
// element resolve by stylesheet order, not by the order written.
export const TH = "px-4 py-2.5 text-xs font-medium uppercase tracking-wide";
export const TH_L = TH + " text-left";
export const TH_R = TH + " text-right";
export const TD = "px-4 py-2.5 align-middle";
export const TD_R = TD + " text-right tabular-nums";
export const TR = "border-b transition-colors last:border-0 hover:bg-muted/40";

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b bg-muted/40 text-muted-foreground">
      {children}
    </thead>
  );
}

// A supporting figure beside the headline. Big numbers take the font's
// proportional figures; tabular digits are for columns that align.
export function StatTile({
  label,
  value,
  note,
  flagged = false,
}: {
  label: string;
  value: number;
  note: string;
  flagged?: boolean;
}) {
  return (
    <Card className="gap-2 p-5">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {flagged ? (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: "var(--status-critical)" }}
          />
        ) : null}
        {label}
      </p>
      <p className="text-4xl font-semibold leading-none tracking-tight">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-muted-foreground">{note}</p>
    </Card>
  );
}
