import { notFound } from "next/navigation"

import { DashboardPage } from "../dashboard-page"
import { normalizeDashboardSection } from "../dashboard-routes"

export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  const dashboardSection = normalizeDashboardSection(section)

  if (!dashboardSection) {
    notFound()
  }

  return <DashboardPage section={dashboardSection} />
}
