"use client";

// components/dashboard/report-charts.tsx
//
// The two plots both dashboards draw with. They live apart from the
// rest of report-ui because they pull in Recharts, and the landing
// page uses the shared cards and meters without needing any of it.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  AXIS_TICK,
  BAR_SIZE,
  DOT_RADIUS,
  GRID,
  LINE_WIDTH,
  VIZ,
  degreeColor,
  scoreColor,
} from "@/lib/chart-theme";

import { ChartTooltip, endpointOnly } from "@/components/dashboard/report-ui";

// Score over time. The same plot serves the institution, a department
// and a tracked question, so they stay identical to read.
export type TrendPoint = { label: string; score: number; answers: number };

export function TrendChart({
  data,
  target,
  valueLabel = "Average",
}: {
  data: TrendPoint[];
  target: number;
  valueLabel?: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 24, right: 44, left: 0, bottom: 4 }}>
          <CartesianGrid {...GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: VIZ.grid }}
            tick={AXIS_TICK}
            tickMargin={8}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            unit="%"
            width={44}
          />
          <Tooltip
            content={<ChartTooltip valueLabel={valueLabel} />}
            cursor={{ stroke: VIZ.grid, strokeWidth: 1 }}
          />
          <ReferenceLine y={target} stroke={VIZ.threshold} strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="score"
            stroke={VIZ.meets}
            strokeWidth={LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{
              r: DOT_RADIUS,
              fill: VIZ.meets,
              stroke: VIZ.surface,
              strokeWidth: 2,
            }}
            activeDot={{
              r: DOT_RADIUS + 2,
              fill: VIZ.meets,
              stroke: VIZ.surface,
              strokeWidth: 2,
            }}
            animationDuration={700}
          >
            <LabelList
              position="top"
              offset={12}
              fill={VIZ.ink}
              fontSize={12}
              fontWeight={600}
              valueAccessor={endpointOnly(data.length)}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// A ranked horizontal comparison. The value rides each bar, so the
// x-axis is dropped: direct labels come before gridlines.
export type RankedRow = { label: string; full: string; score: number };

export function RankedBars({
  data,
  target,
  height,
  barSize = BAR_SIZE,
  labelWidth,
  fontSize = 12,
  benchmark = null,
}: {
  data: RankedRow[];
  target: number;
  height: string;
  barSize?: number;
  labelWidth: number;
  fontSize?: number;
  benchmark?: number | null;
}) {
  return (
    <div className={"w-full " + height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 56, left: 0, bottom: 4 }}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={labelWidth}
            tickLine={false}
            axisLine={false}
            tick={{ ...AXIS_TICK, fontSize }}
          />
          <Tooltip
            content={<ChartTooltip valueLabel="Average" />}
            cursor={{ fill: "var(--chart-grid)", fillOpacity: 0.5 }}
          />
          <ReferenceLine x={target} stroke={VIZ.threshold} strokeDasharray="4 4" />
          {benchmark !== null && (
            <ReferenceLine
              x={benchmark}
              stroke={VIZ.benchmark}
              strokeDasharray="2 3"
            />
          )}
          <Bar
            dataKey="score"
            radius={[0, 4, 4, 0]}
            maxBarSize={barSize}
            animationDuration={700}
          >
            {data.map((entry) => (
              <Cell key={entry.full} fill={scoreColor(entry.score, target)} />
            ))}
            <LabelList
              dataKey="score"
              position="right"
              offset={10}
              fill={VIZ.ink}
              fontSize={fontSize}
              fontWeight={600}
              formatter={(value: unknown) => `${Number(value)}%`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// The share of a department's survey answers that came from each of
// its degree levels. Answers rather than score, because a score is not
// a part of a whole and a ring drawn from one would be a lie; the
// score for each level is printed beside the ring instead.
export type DegreeSlice = {
  degree: string;
  answers: number;
  share: number;
  score: number | null;
  /** False when the level rests on too few answers to lean on. */
  reliable: boolean;
};

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: DegreeSlice }[];
}) {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;
  return (
    <div className="rounded-lg bg-card px-3 py-2 shadow-lg ring-1 ring-foreground/10">
      <p className="text-xs font-medium">{slice.degree}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">Answers</span>
        <span className="text-sm font-semibold tabular-nums">
          {slice.answers.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {slice.share}% of the department
        </span>
      </p>
      {slice.score !== null && (
        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          Average {slice.score}%
        </p>
      )}
      {!slice.reliable && (
        <p
          className="mt-0.5 text-xs"
          style={{ color: "var(--status-caution-inline)" }}
        >
          Few answers, treat with caution
        </p>
      )}
    </div>
  );
}

export function DegreeDonut({
  data,
  total,
  size = 148,
}: {
  data: DegreeSlice[];
  /** Printed in the hole, where a donut otherwise wastes its middle. */
  total: number;
  size?: number;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<DonutTooltip />} />
          <Pie
            data={data}
            dataKey="answers"
            nameKey="degree"
            innerRadius="62%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
            // Drawn in one go. Recharts renders no sector path at all
            // on the first frame of a pie animation, so a ring that is
            // captured or printed before the animation runs comes out
            // empty; a 148px ring gains nothing from a spin-in anyway.
            isAnimationActive={false}
          >
            {data.map((slice) => (
              <Cell key={slice.degree} fill={degreeColor(slice.degree)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-semibold leading-none tabular-nums">
          {total.toLocaleString()}
        </span>
        <span className="mt-1 text-[11px] leading-none text-muted-foreground">
          answers
        </span>
      </div>
    </div>
  );
}
