import { notFound } from "next/navigation"

import { DashboardPage } from "../dashboard-page"
import type { DashboardSearchParams } from "../dashboard-pagination"
import { normalizeDashboardSection } from "../dashboard-routes"

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>
  searchParams: Promise<DashboardSearchParams>
}) {
  const { section } = await params
  const dashboardSection = normalizeDashboardSection(section)

  if (!dashboardSection) {
    notFound()
  }

  return (
    <DashboardPage
      section={dashboardSection}
      searchParams={await searchParams}
    />
  )
}
