"use client";

import { BarChart } from "@mantine/charts";
import { Text } from "@mantine/core";
import type { Tally } from "@/lib/reports";

const series = [{ name: "count", label: "Children", color: "tile.6" }];

// Whole children, and it also has to be given: Mantine formats the number on the bar with
// this and draws nothing without it.
const whole = (value: number) => String(value);

// One report as bars of whole children (DESIGN §4.13): one colour, no legend, no grid — the
// number is on the bar, so lines behind it would only cross the figures. "words" reads
// across, so long labels stay level and legible; "numbers" reads up, because a scale —
// ages, a day of the week — belongs along the bottom.
export function CountChart({ data, shape }: { data: Tally[]; shape: "words" | "numbers" }) {
  if (data.length === 0) return <Text c="dimmed">Nothing to count yet.</Text>;
  if (shape === "words")
    return (
      <BarChart
        h={Math.max(140, data.length * 34)}
        data={data}
        dataKey="label"
        orientation="vertical"
        series={series}
        gridAxis="none"
        tickLine="none"
        withTooltip={false}
        withBarValueLabel
        maxBarWidth={18}
        valueFormatter={whole}
        yAxisProps={{ width: 180 }}
        xAxisProps={{ allowDecimals: false }}
        // Room at the end for the number on the longest bar.
        barChartProps={{ margin: { right: 28 } }}
      />
    );
  return (
    <BarChart
      h={220}
      data={data}
      dataKey="label"
      series={series}
      gridAxis="none"
      tickLine="none"
      withTooltip={false}
      withBarValueLabel
      maxBarWidth={44}
      valueFormatter={whole}
      yAxisProps={{ allowDecimals: false, width: 40 }}
      // Room above for the number on the tallest bar.
      barChartProps={{ margin: { top: 16 } }}
    />
  );
}
