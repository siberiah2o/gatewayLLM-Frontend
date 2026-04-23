"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    icon?: React.ComponentType<{ className?: string }>
    color?: string
    theme?: Record<keyof typeof THEMES, string>
  }
}

type ChartContextValue = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("Chart components must be used inside <ChartContainer />")
  }

  return context
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  responsiveInitialDimension = { width: 640, height: 320 },
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ReactElement
  responsiveInitialDimension?: {
    width: number
    height: number
  }
}) {
  const uniqueId = React.useId().replace(/:/g, "")
  const chartId = `chart-${id ?? uniqueId}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex min-w-0 justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/50",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={responsiveInitialDimension}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({
  id,
  config,
}: {
  id: string
  config: ChartConfig
}) {
  const colorConfig = Object.entries(config).filter(
    ([, item]) => item.theme || item.color
  )

  if (colorConfig.length === 0) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(([theme, prefix]) => {
            const tokens = colorConfig
              .map(([key, item]) => {
                const color =
                  item.theme?.[theme as keyof typeof THEMES] ?? item.color

                return color ? `  --color-${key}: ${color};` : null
              })
              .filter(Boolean)
              .join("\n")

            if (!tokens) {
              return ""
            }

            return `${prefix} [data-chart=${id}] {\n${tokens}\n}`
          })
          .join("\n"),
      }}
    />
  )
}

type ChartTooltipEntry = {
  color?: string
  dataKey?: string | number
  fill?: string
  name?: string
  payload?: Record<string, unknown>
  stroke?: string
  value?: number | string | null
}

export const ChartTooltip = RechartsPrimitive.Tooltip

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  hideIndicator = false,
  indicator = "dot",
  labelFormatter,
  valueFormatter,
}: React.ComponentProps<"div"> & {
  active?: boolean
  payload?: ChartTooltipEntry[]
  label?: number | string
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "dot" | "line"
  labelFormatter?: (value: number | string) => React.ReactNode
  valueFormatter?: (
    value: number | string | null | undefined,
    name: string
  ) => React.ReactNode
}) {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  const renderedLabel =
    hideLabel || label === undefined || label === null
      ? null
      : (labelFormatter?.(label) ?? label)

  return (
    <div
      className={cn(
        "grid min-w-[9rem] gap-2 rounded-lg border border-border/70 bg-background/95 px-3 py-2 shadow-xl backdrop-blur-sm",
        className
      )}
    >
      {renderedLabel ? (
        <div className="text-xs font-medium text-foreground">{renderedLabel}</div>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const itemKey = String(item.dataKey ?? item.name ?? index)
          const itemConfig =
            config[itemKey] ?? (item.name ? config[item.name] : undefined)
          const indicatorColor =
            item.color ||
            item.fill ||
            item.stroke ||
            `var(--color-${itemKey})`
          const itemName =
            typeof itemConfig?.label === "string"
              ? itemConfig.label
              : item.name ?? itemKey

          return (
            <div
              key={`${itemKey}-${index}`}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                {hideIndicator ? null : indicator === "line" ? (
                  <span
                    className="h-0.5 w-3 rounded-full"
                    style={{ backgroundColor: indicatorColor }}
                  />
                ) : (
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: indicatorColor }}
                  />
                )}
                <span>{itemName}</span>
              </div>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {valueFormatter?.(item.value, String(itemName)) ?? item.value ?? "0"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
