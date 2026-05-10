"use client";

import * as React from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Margin = Partial<{ left: number; right: number; top: number; bottom: number }>;

export default function RechartsBarChart(props: {
  data: Record<string, unknown>[];
  xKey: string;
  valueKey: string;
  tooltipLabel: string;
  layout?: "horizontal" | "vertical";
  xType?: "number" | "category";
  yType?: "number" | "category";
  yKey?: string;
  yWidth?: number;
  margin?: Margin;
  xTickFontSize?: number;
  xInterval?: number;
  xTickFormatter?: (value: unknown) => string;
  tooltipFormatter?: (value: unknown) => React.ReactNode;
  barRadius?: [number, number, number, number];
}) {
  const isVertical = props.layout === "vertical";
  const xInterval = props.xInterval ?? 0;
  const xTickFontSize = props.xTickFontSize ?? 12;
  const margin: Margin = props.margin ?? (isVertical ? { left: 6, right: 18, top: 6, bottom: 6 } : { left: 0, right: 18, top: 10, bottom: 6 });
  const barRadius: [number, number, number, number] = props.barRadius ?? (isVertical ? [0, 8, 8, 0] : [8, 8, 0, 0]);

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
      <BarChart data={props.data} layout={isVertical ? "vertical" : "horizontal"} margin={margin}>
        <XAxis
          dataKey={isVertical ? undefined : props.xKey}
          type={props.xType ?? (isVertical ? "number" : "category")}
          interval={isVertical ? undefined : xInterval}
          tick={isVertical ? undefined : { fontSize: xTickFontSize }}
          tickFormatter={props.xTickFormatter}
        />
        <YAxis dataKey={isVertical ? props.yKey : undefined} type={props.yType ?? (isVertical ? "category" : "number")} width={props.yWidth} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgba(24,24,27,0.10)",
            boxShadow: "0 16px 40px -24px rgba(0,0,0,0.35)",
          }}
          formatter={(v) => [props.tooltipFormatter ? props.tooltipFormatter(v) : v, props.tooltipLabel]}
        />
        <Bar dataKey={props.valueKey} fill="rgb(24 24 27)" radius={barRadius} />
      </BarChart>
    </ResponsiveContainer>
  );
}
