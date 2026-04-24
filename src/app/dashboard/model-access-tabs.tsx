"use client"

import { Tabs } from "@base-ui/react/tabs"
import { BotIcon, PlusCircleIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ModelAccessTabValue = "all-models" | "add-model"

type ModelAccessTabsProps = {
  ariaLabel: string
  labels: Record<ModelAccessTabValue, string>
  allModelsCount: ReactNode
  allModels: ReactNode
  addModel: ReactNode
}

const tabItems: Array<{
  value: ModelAccessTabValue
  icon: ReactNode
}> = [
  {
    value: "all-models",
    icon: <BotIcon className="size-4" />,
  },
  {
    value: "add-model",
    icon: <PlusCircleIcon className="size-4" />,
  },
]

export function ModelAccessTabs({
  ariaLabel,
  labels,
  allModelsCount,
  allModels,
  addModel,
}: ModelAccessTabsProps) {
  const panels: Record<ModelAccessTabValue, ReactNode> = {
    "all-models": allModels,
    "add-model": addModel,
  }

  return (
    <Tabs.Root defaultValue="all-models" className="grid min-w-0 gap-2.5">
      <Tabs.List
        aria-label={ariaLabel}
        activateOnFocus
        className="grid min-w-0 grid-cols-2 gap-1 rounded-md border bg-muted/35 p-1"
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
            {item.value === "all-models" ? (
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border bg-background px-1 text-xs tabular-nums">
                {allModelsCount}
              </span>
            ) : null}
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
