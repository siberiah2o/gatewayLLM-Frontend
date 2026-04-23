"use client"

import * as React from "react"
import { useSelectedLayoutSegment } from "next/navigation"
import type { SessionUser, Workspace } from "@/lib/gatewayllm"
import {
  normalizeDashboardSection,
  type DashboardSection,
} from "@/app/dashboard/dashboard-routes"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  BotIcon,
  GalleryVerticalEndIcon,
  LayoutDashboardIcon,
  UsersIcon,
} from "lucide-react"
import { useI18n } from "@/components/i18n-provider"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: SessionUser
  workspaces: Workspace[]
  canManageAccess?: boolean
  canManageModels?: boolean
  activeSection?: DashboardSection
}

export function AppSidebar({
  user,
  workspaces,
  canManageAccess = true,
  canManageModels = true,
  activeSection,
  ...props
}: AppSidebarProps) {
  const { t } = useI18n()
  const selectedSegment = useSelectedLayoutSegment()
  const currentSection =
    activeSection ??
    (selectedSegment ? normalizeDashboardSection(selectedSegment) : null) ??
    "status"
  const markActive = <T extends { section: DashboardSection }>(items: T[]) =>
    items.map((item) => ({
      ...item,
      isActive: item.section === currentSection,
    }))
  const modelItems = markActive([
    ...(canManageModels
      ? [
          {
            title: t("nav.providerSetups"),
            url: "/dashboard/provider-setups",
            section: "provider-setups" as const,
          },
        ]
      : []),
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
            title: t("nav.members"),
            url: "/dashboard/members",
            section: "members" as const,
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
    {
      title: t("nav.workspaces"),
      url: "/dashboard/workspaces",
      section: "workspaces" as const,
    },
  ])
  const data = {
    navMain: [
      {
        title: t("nav.overview"),
        url: "/dashboard/status",
        icon: <LayoutDashboardIcon />,
        isActive: overviewItems.some((item) => item.section === currentSection),
        items: overviewItems,
      },
      {
        title: t("nav.models"),
        url: "/dashboard/provider-setups",
        icon: <BotIcon />,
        isActive: modelItems.some((item) => item.section === currentSection),
        items: modelItems,
      },
      {
        title: t("nav.access"),
        url: "/dashboard/api-keys",
        icon: <UsersIcon />,
        isActive: accessItems.some((item) => item.section === currentSection),
        items: accessItems,
      },
    ],
  }
  const teams =
    workspaces.length > 0
      ? workspaces.map((workspace) => ({
          name: workspace.name,
          logo: <GalleryVerticalEndIcon />,
          plan: `${workspace.billing_currency} - ${localizeValue(
            t,
            workspace.status
          )}`,
        }))
      : [
          {
            name: "GatewayLLM",
            logo: <BotIcon />,
            plan: t("nav.noWorkspace"),
          },
        ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
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

function localizeValue(
  t: (key: string, values?: Record<string, string | number>) => string,
  value: string
) {
  const key = `values.${value.toLowerCase().replaceAll(" ", "_")}`
  const translated = t(key)

  return translated === key ? value : translated
}
