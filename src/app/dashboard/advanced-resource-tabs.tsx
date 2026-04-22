"use client"

import { Tabs } from "@base-ui/react/tabs"
import { BotIcon, KeyRoundIcon, ShieldCheckIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type AdvancedResourceTabValue = "models" | "credentials" | "deployments"

type AdvancedResourceTabsProps = {
  ariaLabel: string
  labels: Record<AdvancedResourceTabValue, string>
  counts: Record<AdvancedResourceTabValue, ReactNode>
  models: ReactNode
  credentials: ReactNode
  deployments: ReactNode
}

const tabItems: Array<{
  value: AdvancedResourceTabValue
  icon: ReactNode
}> = [
  {
    value: "models",
    icon: <BotIcon className="size-4" />,
  },
  {
    value: "credentials",
    icon: <KeyRoundIcon className="size-4" />,
  },
  {
    value: "deployments",
    icon: <ShieldCheckIcon className="size-4" />,
  },
]

export function AdvancedResourceTabs({
  ariaLabel,
  labels,
  counts,
  models,
  credentials,
  deployments,
}: AdvancedResourceTabsProps) {
  const panels: Record<AdvancedResourceTabValue, ReactNode> = {
    models,
    credentials,
    deployments,
  }

  return (
    <Tabs.Root defaultValue="models" className="grid min-w-0 gap-3">
      <Tabs.List
        aria-label={ariaLabel}
        activateOnFocus
        className="grid min-w-0 grid-cols-3 gap-1 rounded-lg border bg-muted/35 p-1"
      >
        {tabItems.map((item) => (
          <Tabs.Tab
            key={item.value}
            value={item.value}
            className={cn(
              "inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground outline-none transition-colors",
              "hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
              "data-active:bg-background data-active:text-foreground data-active:shadow-sm"
            )}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="min-w-0 truncate">{labels[item.value]}</span>
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border bg-background px-1 text-[0.72rem] tabular-nums">
              {counts[item.value]}
            </span>
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {tabItems.map((item) => (
        <Tabs.Panel
          key={item.value}
          value={item.value}
          className="min-w-0 outline-none"
        >
          {panels[item.value]}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  )
}
