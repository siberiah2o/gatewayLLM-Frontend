"use client"

import { usePathname } from "next/navigation"

import { DashboardSectionSkeleton } from "./dashboard-skeleton"
import { normalizeDashboardSection } from "./dashboard-routes"

export default function Loading() {
  const pathname = usePathname()
  const [, dashboardSegment, sectionSegment] = pathname.split("/")
  const section =
    dashboardSegment === "dashboard"
      ? normalizeDashboardSection(sectionSegment ?? "") ?? "status"
      : "status"

  return <DashboardSectionSkeleton section={section} />
}
