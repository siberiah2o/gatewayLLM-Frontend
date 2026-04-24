"use client";

import * as React from "react";
import { useSelectedLayoutSegment } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useI18n } from "@/components/i18n-provider";
import type { SessionUser } from "@/lib/gatewayllm";
import { cn } from "@/lib/utils";
import {
  dashboardSectionTitleKey,
  normalizeDashboardSection,
  type DashboardSection,
} from "./dashboard-routes";
import { isUserDashboardSection } from "./dashboard-permissions";

type DashboardShellProps = {
  user: SessionUser;
  children: React.ReactNode;
  canManageWorkspace: boolean;
};

export function DashboardShell({
  user,
  children,
  canManageWorkspace,
}: DashboardShellProps) {
  const { t } = useI18n();
  const selectedSegment = useSelectedLayoutSegment();
  const section = resolveDashboardSection(selectedSegment, canManageWorkspace);
  const isChatSmokeSection = section === "chat-smoke";
  const homeHref = canManageWorkspace ? "/dashboard/status" : "/dashboard/models";

  return (
    <SidebarProvider
      className={isChatSmokeSection ? "h-svh overflow-hidden" : undefined}
    >
      <AppSidebar
        user={user}
        activeSection={section}
        canManageAccess={canManageWorkspace}
        canManageModels={canManageWorkspace}
      />
      <SidebarInset
        className={
          isChatSmokeSection ? "h-svh min-h-0 overflow-hidden" : "min-h-0"
        }
      >
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full min-w-0 items-center justify-between gap-3 px-3 md:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <div className="min-w-0">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href={homeHref}>
                        GatewayLLM
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {t(dashboardSectionTitleKey(section))}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
            <LanguageSwitcher className="shrink-0" />
          </div>
        </header>
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col p-3 md:p-4",
            isChatSmokeSection
              ? "overflow-hidden"
              : "gap-3",
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function resolveDashboardSection(
  segment: string | null,
  canManageWorkspace: boolean,
): DashboardSection {
  const fallback = canManageWorkspace ? "status" : "models";
  const section = segment
    ? (normalizeDashboardSection(segment) ?? fallback)
    : fallback;

  if (!canManageWorkspace && !isUserDashboardSection(section)) {
    return fallback;
  }

  return section;
}
