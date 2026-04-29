"use client"

import * as React from "react"
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { DashboardTimeRange } from "./dashboard-time-range"

type StatusTrafficPoint = {
  date: string
  label: string
  succeeded: number
  failed: number
}

export function StatusTrafficChart({
  data,
  timeRange,
  requestsLabel,
  failedLabel,
}: {
  data: StatusTrafficPoint[]
  timeRange: DashboardTimeRange
  requestsLabel: string
  failedLabel: string
}) {
  const visibleData = React.useMemo(
    () =>
      buildTrafficData(data, timeRange).map((point) => ({
        ...point,
        requests: point.succeeded + point.failed,
      })),
    [data, timeRange]
  )
  const totals = React.useMemo(
    () =>
      visibleData.reduce(
        (current, point) => ({
          requests: current.requests + point.requests,
          failed: current.failed + point.failed,
        }),
        {
          requests: 0,
          failed: 0,
        }
      ),
    [visibleData]
  )
  const chartConfig = React.useMemo(
    () =>
      ({
        requests: {
          label: requestsLabel,
          color: "var(--chart-3)",
        },
        failed: {
          label: failedLabel,
          color: "var(--chart-5)",
        },
      }) satisfies ChartConfig,
    [failedLabel, requestsLabel]
  )

  return (
    <div className="grid gap-2">
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums text-foreground">
          {formatCompactWholeNumber(totals.requests)}
        </span>
        <span>{requestsLabel}</span>
        <span className="font-mono tabular-nums text-destructive">
          {formatCompactWholeNumber(totals.failed)}
        </span>
        <span>{failedLabel}</span>
      </div>
      <ChartContainer
        config={chartConfig}
        className="h-[220px] min-h-[220px] w-full min-w-0"
        responsiveInitialDimension={{ width: 960, height: 220 }}
      >
        <ComposedChart
          accessibilityLayer
          data={visibleData}
          margin={{ top: 10, right: 12, bottom: 0, left: 4 }}
        >
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
                indicator="dot"
                labelFormatter={(value) => {
                  const point = visibleData.find((entry) => entry.label === value)
                  return point?.date ?? value
                }}
                valueFormatter={(value) =>
                  typeof value === "number"
                    ? Math.round(value).toLocaleString("en-US")
                    : value
                }
              />
            }
          />
          <Line
            type="monotone"
            dataKey="requests"
            stroke="var(--color-requests)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="failed"
            stroke="var(--color-failed)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}

function buildTrafficData(data: StatusTrafficPoint[], timeRange: DashboardTimeRange) {
  const pointsByDate = new Map(data.map((point) => [point.date, point]))
  const startDate = new Date(`${timeRange.startDate}T00:00:00.000Z`)
  const endDate = new Date(`${timeRange.endDate}T00:00:00.000Z`)

  const points: StatusTrafficPoint[] = []
  for (
    let cursor = new Date(startDate);
    cursor < endDate;
    cursor = addUTCDays(cursor, 1)
  ) {
    const date = getUTCDateString(cursor)
    const point = pointsByDate.get(date)

    points.push(
      point ?? {
        date,
        label: date.slice(5),
        succeeded: 0,
        failed: 0,
      }
    )
  }

  return points
}

function addUTCDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return nextDate
}

function getUTCDateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatCompactWholeNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0"
  }

  return Math.round(value).toLocaleString("en-US", {
    maximumFractionDigits: 1,
    notation: value >= 10_000 ? "compact" : "standard",
  })
}
