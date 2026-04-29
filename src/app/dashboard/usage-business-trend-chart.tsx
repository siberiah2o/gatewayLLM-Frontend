"use client"

import * as React from "react"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { DashboardTimeRange } from "./dashboard-time-range"

type UsageBusinessTrendPoint = {
  date: string
  label: string
  spend: number
  spendDisplay?: string
  requests: number
  failures: number
}

type UsageTrendView = "requests" | "spend"

export function UsageBusinessTrendChart({
  data,
  timeRange,
  spendLabel,
  spendSummary,
  spendCurrency = "USD",
  requestsLabel,
  failuresLabel,
  successesLabel,
}: {
  data: UsageBusinessTrendPoint[]
  timeRange: DashboardTimeRange
  spendLabel: string
  spendSummary?: string
  spendCurrency?: string
  requestsLabel: string
  failuresLabel: string
  successesLabel: string
}) {
  const [view, setView] = React.useState<UsageTrendView>("spend")
  const visibleData = React.useMemo(
    () =>
      buildTrendData(data, timeRange).map((point) => ({
        ...point,
        succeeded: Math.max(point.requests - point.failures, 0),
      })),
    [data, timeRange]
  )
  const totals = React.useMemo(
    () =>
      visibleData.reduce(
        (current, point) => ({
          spend: current.spend + point.spend,
          requests: current.requests + point.requests,
          failures: current.failures + point.failures,
        }),
        {
          spend: 0,
          requests: 0,
          failures: 0,
        }
      ),
    [visibleData]
  )
  const chartConfig = React.useMemo(
    () =>
      ({
        spend: {
          label: spendLabel,
          color: "var(--chart-2)",
        },
        succeeded: {
          label: successesLabel,
          color: "var(--chart-3)",
        },
        failures: {
          label: failuresLabel,
          color: "var(--chart-5)",
        },
        requests: {
          label: requestsLabel,
          color: "var(--chart-3)",
        },
      }) satisfies ChartConfig,
    [failuresLabel, requestsLabel, spendLabel, successesLabel]
  )

  return (
    <div className="grid gap-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1 rounded-md border border-border/70 bg-background p-1">
          <Button
            type="button"
            size="xs"
            variant={view === "spend" ? "secondary" : "ghost"}
            aria-pressed={view === "spend"}
            className="h-6 rounded-[6px] px-2"
            onClick={() => {
              setView("spend")
            }}
          >
            {spendLabel}
          </Button>
          <Button
            type="button"
            size="xs"
            variant={view === "requests" ? "secondary" : "ghost"}
            aria-pressed={view === "requests"}
            className="h-6 rounded-[6px] px-2"
            onClick={() => {
              setView("requests")
            }}
          >
            {requestsLabel}
          </Button>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground">
            {spendSummary ?? formatChartCurrency(totals.spend, spendCurrency)}
          </span>
          <span>{spendLabel}</span>
          <span className="font-mono tabular-nums text-foreground">
            {formatCompactWholeNumber(totals.requests)}
          </span>
          <span>{requestsLabel}</span>
          <span className="font-mono tabular-nums text-destructive">
            {formatCompactWholeNumber(totals.failures)}
          </span>
          <span>{failuresLabel}</span>
        </div>
      </div>
      <ChartContainer
        config={chartConfig}
        className="h-[220px] min-h-[220px] w-full min-w-0"
        responsiveInitialDimension={{ width: 960, height: 220 }}
      >
        <ComposedChart
          accessibilityLayer
          data={visibleData}
          barCategoryGap={visibleData.length > 14 ? "46%" : "34%"}
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
          <YAxis yAxisId="spend" hide />
          <YAxis yAxisId="volume" hide />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(value) => {
                  const point = visibleData.find((entry) => entry.label === value)
                  return point?.date ?? value
                }}
                valueFormatter={(value, name) => {
                  if (typeof value !== "number") {
                    return value ?? "0"
                  }

                  if (name === spendLabel) {
                    return formatChartCurrency(value, spendCurrency)
                  }

                  return Math.round(value).toLocaleString("en-US")
                }}
              />
            }
          />
          {view === "spend" ? (
            <Bar
              yAxisId="spend"
              dataKey="spend"
              fill="var(--color-spend)"
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
            />
          ) : (
            <>
              <Line
                yAxisId="volume"
                type="monotone"
                dataKey="requests"
                stroke="var(--color-requests)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="volume"
                type="monotone"
                dataKey="failures"
                stroke="var(--color-failures)"
                strokeWidth={2}
                dot={false}
              />
            </>
          )}
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}

function buildTrendData(
  data: UsageBusinessTrendPoint[],
  timeRange: DashboardTimeRange
) {
  const pointsByDate = new Map(
    data.map((point) => [
      point.date,
      point,
    ])
  )
  const startDate = new Date(`${timeRange.startDate}T00:00:00.000Z`)
  const endDate = new Date(`${timeRange.endDate}T00:00:00.000Z`)

  const points: UsageBusinessTrendPoint[] = []
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
        spend: 0,
        spendDisplay: undefined,
        requests: 0,
        failures: 0,
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

function formatChartCurrency(value: number, currency = "USD") {
  const normalizedCurrency = currency.trim().toUpperCase()
  const prefix =
    normalizedCurrency === "CNY"
      ? "¥"
      : normalizedCurrency === "USD"
        ? "$"
        : `${normalizedCurrency} `
  if (!Number.isFinite(value) || value <= 0) {
    return `${prefix}0`
  }

  if (value >= 100) {
    return `${prefix}${Math.round(value).toLocaleString("en-US")}`
  }

  return `${prefix}${value.toFixed(value >= 1 ? 2 : 4)}`
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
