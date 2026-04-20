"use client"

import * as React from "react"
import type { SessionUser, Workspace } from "@/lib/gatewayllm"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
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
  ActivityIcon,
  BotIcon,
  GalleryVerticalEndIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react"
import { useI18n } from "@/components/i18n-provider"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: SessionUser
  workspaces: Workspace[]
}

export function AppSidebar({ user, workspaces, ...props }: AppSidebarProps) {
  const { t } = useI18n()
  const data = {
    navMain: [
      {
        title: t("nav.overview"),
        url: "/dashboard",
        icon: <LayoutDashboardIcon />,
        isActive: true,
        items: [
          { title: t("nav.status"), url: "/dashboard#status" },
          { title: t("nav.usage"), url: "/dashboard#usage" },
          { title: t("nav.workspaces"), url: "/dashboard#workspaces" },
        ],
      },
      {
        title: t("nav.models"),
        url: "/dashboard#models",
        icon: <BotIcon />,
        items: [
          { title: t("nav.catalogs"), url: "/dashboard#models" },
          { title: t("nav.credentials"), url: "/dashboard#credentials" },
          { title: t("nav.deployments"), url: "/dashboard#deployments" },
          { title: t("nav.smokeTest"), url: "/dashboard#chat-smoke" },
        ],
      },
      {
        title: t("nav.access"),
        url: "/dashboard#api-keys",
        icon: <UsersIcon />,
        items: [
          { title: t("nav.members"), url: "/dashboard#members" },
          { title: t("nav.apiKeys"), url: "/dashboard#api-keys" },
          {
            title: t("nav.registrationRequests"),
            url: "/dashboard#registration",
          },
          { title: t("nav.signedInUser"), url: "/dashboard#account" },
        ],
      },
      {
        title: t("nav.workspace"),
        url: "/dashboard#workspaces",
        icon: <Settings2Icon />,
        items: [
          { title: t("nav.workspaces"), url: "/dashboard#workspaces" },
          { title: t("nav.usage"), url: "/dashboard#usage" },
        ],
      },
    ],
    projects: [
      { name: t("nav.health"), url: "/dashboard#status", icon: <ActivityIcon /> },
      {
        name: t("nav.deployments"),
        url: "/dashboard#deployments",
        icon: <BotIcon />,
      },
      {
        name: t("nav.smokeTest"),
        url: "/dashboard#chat-smoke",
        icon: <BotIcon />,
      },
      {
        name: t("nav.apiKeys"),
        url: "/dashboard#api-keys",
        icon: <KeyRoundIcon />,
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
        <NavProjects projects={data.projects} />
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
