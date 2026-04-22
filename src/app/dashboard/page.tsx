import { DashboardPage } from "./dashboard-page"
import type { DashboardSearchParams } from "./dashboard-pagination"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>
}) {
  return <DashboardPage searchParams={await searchParams} />
}
