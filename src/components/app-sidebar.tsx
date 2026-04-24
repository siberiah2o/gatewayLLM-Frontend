"use client"

import * as React from "react"
import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"
import type { SessionUser } from "@/lib/gatewayllm"
import {
  normalizeDashboardSection,
  type DashboardSection,
} from "@/app/dashboard/dashboard-routes"
import { isUserDashboardSection } from "@/app/dashboard/dashboard-permissions"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { BotIcon, LayoutDashboardIcon, UsersIcon } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: SessionUser
  canManageAccess?: boolean
  canManageModels?: boolean
  activeSection?: DashboardSection
}

export function AppSidebar({
  user,
  canManageAccess = true,
  canManageModels = true,
  activeSection,
  ...props
}: AppSidebarProps) {
  const { t } = useI18n()
  const selectedSegment = useSelectedLayoutSegment()
  const canManageWorkspace = canManageAccess || canManageModels
  const resolvedSection =
    activeSection ??
    (selectedSegment ? normalizeDashboardSection(selectedSegment) : null) ??
    (canManageWorkspace ? "status" : "models")
  const currentSection =
    !canManageWorkspace && !isUserDashboardSection(resolvedSection)
      ? "models"
      : resolvedSection
  const homeHref = canManageWorkspace ? "/dashboard/status" : "/dashboard/models"
  const markActive = <T extends { section: DashboardSection }>(items: T[]) =>
    items.map((item) => ({
      ...item,
      isActive: item.section === currentSection,
    }))
  const modelItems = markActive([
    canManageModels
      ? {
          title: t("nav.providerSetups"),
          url: "/dashboard/provider-setups",
          section: "provider-setups" as const,
        }
      : {
          title: t("nav.catalogs"),
          url: "/dashboard/models",
          section: "models" as const,
        },
    {
      title: t("nav.smokeTest"),
      url: "/dashboard/chat-smoke",
      section: "chat-smoke" as const,
    },
  ])
  const accessItems = markActive([
    ...(canManageAccess
      ? [
          {
            title: t("nav.users"),
            url: "/dashboard/users",
            section: "users" as const,
          },
          {
            title: t("nav.departments"),
            url: "/dashboard/departments",
            section: "departments" as const,
          },
          {
            title: t("nav.registrationRequests"),
            url: "/dashboard/registration",
            section: "registration" as const,
          },
        ]
      : []),
    {
      title: t("nav.apiKeys"),
      url: "/dashboard/api-keys",
      section: "api-keys" as const,
    },
    {
      title: t("nav.signedInUser"),
      url: "/dashboard/account",
      section: "account" as const,
    },
  ])
  const overviewItems = markActive([
    ...(canManageWorkspace
      ? [
          {
            title: t("nav.status"),
            url: "/dashboard/status",
            section: "status" as const,
          },
          {
            title: t("nav.usage"),
            url: "/dashboard/usage",
            section: "usage" as const,
          },
          {
            title: t("nav.usageDetails"),
            url: "/dashboard/usage-details",
            section: "usage-details" as const,
          },
          {
            title: t("nav.logs"),
            url: "/dashboard/logs",
            section: "logs" as const,
          },
        ]
      : []),
  ])
  const data = {
    navMain: [
      ...(overviewItems.length > 0
        ? [
            {
              title: t("nav.overview"),
              url: "/dashboard/status",
              icon: <LayoutDashboardIcon />,
              isActive: overviewItems.some(
                (item) => item.section === currentSection
              ),
              items: overviewItems,
            },
          ]
        : []),
      {
        title: t("nav.models"),
        url: canManageModels ? "/dashboard/provider-setups" : "/dashboard/models",
        icon: <BotIcon />,
        isActive: modelItems.some((item) => item.section === currentSection),
        items: modelItems,
      },
      {
        title: t("nav.access"),
        url: canManageAccess ? "/dashboard/api-keys" : "/dashboard/account",
        icon: <UsersIcon />,
        isActive: accessItems.some((item) => item.section === currentSection),
        items: accessItems,
      },
    ],
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href={homeHref} />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <BotIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold">
                  GatewayLLM
                </span>
                <span className="truncate text-xs text-sidebar-foreground/65">
                  {t("nav.overview")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.display_name || user.email,
            email: user.email,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
