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
import type { SessionUser, Workspace } from "@/lib/gatewayllm";
import { cn } from "@/lib/utils";
import {
  dashboardSectionTitleKey,
  normalizeDashboardSection,
  type DashboardSection,
} from "./dashboard-routes";

type DashboardShellProps = {
  user: SessionUser;
  workspaces: Workspace[];
  children: React.ReactNode;
};

export function DashboardShell({
  user,
  workspaces,
  children,
}: DashboardShellProps) {
  const { t } = useI18n();
  const selectedSegment = useSelectedLayoutSegment();
  const section = resolveDashboardSection(selectedSegment);
  const isChatSmokeSection = section === "chat-smoke";

  return (
    <SidebarProvider className={isChatSmokeSection ? "h-svh overflow-hidden" : undefined}>
      <AppSidebar user={user} workspaces={workspaces} activeSection={section} />
      <SidebarInset className={isChatSmokeSection ? "min-h-0 h-svh overflow-hidden" : "min-h-0"}>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full min-w-0 items-center justify-between gap-3 px-4">
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
                      <BreadcrumbLink href="/dashboard/status">
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
            "flex min-h-0 flex-1 flex-col p-4",
            isChatSmokeSection
              ? "overflow-hidden"
              : "gap-4",
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function resolveDashboardSection(segment: string | null): DashboardSection {
  return segment ? (normalizeDashboardSection(segment) ?? "status") : "status";
}
