export const DASHBOARD_PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100, 200] as const
export const DASHBOARD_DEFAULT_PAGE_SIZE = 5

export type DashboardPaginationState = {
  page: number
  pageSize: number
  offset: number
  itemCount: number
  hasNext: boolean
}

export type DashboardSearchParams = Record<
  string,
  string | string[] | undefined
>

export function parseDashboardPagination(
  searchParams: DashboardSearchParams | undefined,
  paginationId: string
) {
  const page = parsePositiveInt(readSearchParam(searchParams, `${paginationId}_page`), 1)
  const pageSize = parsePageSize(readSearchParam(searchParams, `${paginationId}_page_size`))

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    requestLimit:
      pageSize >= DASHBOARD_PAGE_SIZE_OPTIONS[DASHBOARD_PAGE_SIZE_OPTIONS.length - 1]
        ? pageSize
        : pageSize + 1,
  }
}

function readSearchParam(
  searchParams: DashboardSearchParams | undefined,
  key: string
) {
  const value = searchParams?.[key]

  return Array.isArray(value) ? value[0] : value
}

function parsePageSize(value: string | undefined) {
  const parsed = Number(value)

  return DASHBOARD_PAGE_SIZE_OPTIONS.includes(
    parsed as (typeof DASHBOARD_PAGE_SIZE_OPTIONS)[number]
  )
    ? parsed
    : DASHBOARD_DEFAULT_PAGE_SIZE
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
