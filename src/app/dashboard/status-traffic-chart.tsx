"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type StatusTrafficPoint = {
  date: string
  label: string
  succeeded: number
  failed: number
}

export function StatusTrafficChart({
  data,
  successLabel,
  failedLabel,
}: {
  data: StatusTrafficPoint[]
  successLabel: string
  failedLabel: string
}) {
  const successGradientId = React.useId().replace(/:/g, "")
  const failedGradientId = React.useId().replace(/:/g, "")
  const chartConfig = React.useMemo(
    () =>
      ({
        succeeded: {
          label: successLabel,
          color: "var(--chart-2)",
        },
        failed: {
          label: failedLabel,
          color: "var(--chart-5)",
        },
      }) satisfies ChartConfig,
    [failedLabel, successLabel]
  )

  return (
    <ChartContainer
      config={chartConfig}
      className="h-[220px] min-h-[220px] w-full min-w-0"
      responsiveInitialDimension={{ width: 960, height: 220 }}
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ top: 10, right: 12, bottom: 0, left: 4 }}
      >
        <defs>
          <linearGradient id={successGradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="var(--color-succeeded)" stopOpacity={0.32} />
            <stop offset="95%" stopColor="var(--color-succeeded)" stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id={failedGradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="var(--color-failed)" stopOpacity={0.24} />
            <stop offset="95%" stopColor="var(--color-failed)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis hide />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(value) => {
                const point = data.find((entry) => entry.label === value)
                return point?.date ?? value
              }}
              valueFormatter={(value) =>
                `${typeof value === "number" ? value.toLocaleString("en-US") : value}`
              }
            />
          }
        />
        <Area
          type="monotone"
          dataKey="succeeded"
          stackId="requests"
          stroke="var(--color-succeeded)"
          fill={`url(#${successGradientId})`}
          fillOpacity={1}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="failed"
          stackId="requests"
          stroke="var(--color-failed)"
          fill={`url(#${failedGradientId})`}
          fillOpacity={1}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
