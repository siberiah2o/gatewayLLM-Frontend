"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ReactNode } from "react"

import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DASHBOARD_DEFAULT_PAGE_SIZE,
  DASHBOARD_PAGE_SIZE_OPTIONS,
  type DashboardPaginationState,
} from "./dashboard-pagination"

export function DashboardTablePagination({
  children,
  paginationId,
  pagination,
}: {
  children: ReactNode
  paginationId: string
  pagination?: DashboardPaginationState
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const rows = React.Children.toArray(children)
  const pageParam = `${paginationId}_page`
  const pageSizeParam = `${paginationId}_page_size`
  const pageSize =
    pagination?.pageSize ?? parsePageSize(searchParams.get(pageSizeParam))
  const page = pagination?.page ?? parsePage(searchParams.get(pageParam))
  const totalRows = rows.length
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePageIndex = pagination
    ? Math.max(0, page - 1)
    : Math.min(page - 1, pageCount - 1)
  const startIndex = pagination ? pagination.offset : safePageIndex * pageSize
  const endIndex = pagination
    ? pagination.offset + pagination.itemCount
    : Math.min(startIndex + pageSize, totalRows)
  const visibleRows = pagination
    ? rows
    : rows.slice(startIndex, endIndex)
  const hasPreviousPage = safePageIndex > 0
  const hasNextPage = pagination
    ? pagination.hasNext
    : safePageIndex < pageCount - 1
  const showPagination = pagination
    ? hasPreviousPage || hasNextPage || pagination.itemCount > DASHBOARD_DEFAULT_PAGE_SIZE
    : totalRows > DASHBOARD_DEFAULT_PAGE_SIZE

  function updatePagination(nextPage: number, nextPageSize: number) {
    const params = new URLSearchParams(searchParams)
    params.set(pageParam, String(nextPage))
    params.set(pageSizeParam, String(nextPageSize))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  if (!showPagination) {
    return <>{rows}</>
  }

  return (
    <>
      {visibleRows}
      <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0">{t("dashboard.rowsPerPage")}</span>
          <Select
            value={pageSize}
            onValueChange={(value) => {
              updatePagination(1, parsePageSize(String(value)))
            }}
          >
            <SelectTrigger
              size="sm"
              aria-label={t("dashboard.rowsPerPage")}
              className="h-7 min-w-20 bg-background"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" className="min-w-24">
              <SelectGroup>
                {DASHBOARD_PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="min-w-0 truncate tabular-nums">
            {pagination
              ? t("dashboard.paginationOpenRange", {
                  start: pagination.itemCount > 0 ? startIndex + 1 : startIndex,
                  end: endIndex,
                  more: pagination.hasNext ? "+" : "",
                })
              : t("dashboard.paginationRange", {
                  start: startIndex + 1,
                  end: endIndex,
                  total: totalRows,
                })}
            <span className="mx-1 text-muted-foreground/60">/</span>
            {pagination
              ? t("dashboard.paginationPageSimple", {
                  page: safePageIndex + 1,
                })
              : t("dashboard.paginationPage", {
                  page: safePageIndex + 1,
                  pages: pageCount,
                })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              disabled={!hasPreviousPage}
              aria-label={t("dashboard.previousPage")}
              onClick={() => updatePagination(safePageIndex, pageSize)}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              disabled={!hasNextPage}
              aria-label={t("dashboard.nextPage")}
              onClick={() =>
                updatePagination(
                  pagination
                    ? safePageIndex + 2
                    : Math.min(pageCount, safePageIndex + 2),
                  pageSize
                )
              }
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function parsePageSize(value: string | null) {
  const parsed = Number(value)

  return DASHBOARD_PAGE_SIZE_OPTIONS.includes(
    parsed as (typeof DASHBOARD_PAGE_SIZE_OPTIONS)[number]
  )
    ? parsed
    : DASHBOARD_DEFAULT_PAGE_SIZE
}

function parsePage(value: string | null) {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}
