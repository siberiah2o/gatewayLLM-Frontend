"use client"

import * as React from "react"
import Link from "next/link"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useI18n } from "@/components/i18n-provider"
import { ChevronRightIcon } from "lucide-react"
import type { DashboardSection } from "@/app/dashboard/dashboard-routes"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
      section: DashboardSection
      isActive?: boolean
    }[]
  }[]
}) {
  const { t } = useI18n()
  const [openGroups, setOpenGroups] = React.useState<
    Partial<Record<string, boolean>>
  >({})

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("nav.platform")}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isOpen = openGroups[item.title] ?? Boolean(item.isActive)

          return (
            <Collapsible
              key={item.title}
              open={isOpen}
              onOpenChange={(open) =>
                setOpenGroups((current) => ({
                  ...current,
                  [item.title]: open,
                }))
              }
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger
                render={
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={item.isActive}
                  />
                }
              >
                {item.icon}
                <span>{item.title}</span>
                <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        isActive={subItem.isActive}
                        render={<Link href={subItem.url} />}
                      >
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
