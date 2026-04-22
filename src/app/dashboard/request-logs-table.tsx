"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Clock3Icon, FileTextIcon, LoaderCircleIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import type { RequestLog } from "@/lib/gatewayllm"
import { cn } from "@/lib/utils"
import type { DashboardPaginationState } from "./dashboard-pagination"
import { DashboardTablePagination } from "./dashboard-table-pagination"

type DetailStatus = "idle" | "loading" | "ready" | "error"

const REQUEST_LOG_SORT_PARAM = "request_logs_sort"
const REQUEST_LOG_FIRST_TOKEN_LATENCY_MIN_PARAM =
  "request_logs_first_token_latency_min"
const REQUEST_LOG_FIRST_TOKEN_LATENCY_MAX_PARAM =
  "request_logs_first_token_latency_max"
const REQUEST_LOG_PAGE_PARAM = "request_logs_page"
const REQUEST_LOG_SORT_RECENT = "recent"
const REQUEST_LOG_SORT_FIRST_TOKEN_LATENCY_ASC = "first_token_latency_asc"
const REQUEST_LOG_SORT_FIRST_TOKEN_LATENCY_DESC = "first_token_latency_desc"

export function RequestLogsTable({
  logs,
  pagination,
  workspaceID,
  emptyMessage,
}: {
  logs: RequestLog[]
  pagination?: DashboardPaginationState
  workspaceID: string
  emptyMessage: string
}) {
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, RequestLog>>({})
  const [detailStatus, setDetailStatus] = useState<DetailStatus>("idle")
  const [detailError, setDetailError] = useState<string | null>(null)
  const { t } = useI18n()

  const selectedSummary = useMemo(
    () => logs.find((log) => log.id === selectedID) ?? null,
    [logs, selectedID]
  )
  const selectedLog = selectedID ? detailCache[selectedID] ?? selectedSummary : null

  useEffect(() => {
    if (!selectedID || !workspaceID || detailCache[selectedID]) {
      return
    }

    let cancelled = false

    fetch(
      `/api/control/request-logs/${encodeURIComponent(
        selectedID
      )}?workspace_id=${encodeURIComponent(workspaceID)}`,
      {
        cache: "no-store",
      }
    )
      .then(async (response) => {
        const text = await response.text()
        const payload = text ? safeParseJSON(text) : null

        if (!response.ok) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "object" &&
            payload.error !== null &&
            "message" in payload.error &&
            typeof payload.error.message === "string"
              ? payload.error.message
              : response.statusText
          throw new Error(message || t("dashboard.failedRequestLog"))
        }

        return payload as RequestLog
      })
      .then((payload) => {
        if (cancelled || !payload) {
          return
        }
        setDetailCache((current) => ({ ...current, [payload.id]: payload }))
        setDetailStatus("ready")
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        setDetailStatus("error")
        setDetailError(
          error instanceof Error && error.message
            ? error.message
            : t("dashboard.failedRequestLog")
        )
      })

    return () => {
      cancelled = true
    }
  }, [detailCache, selectedID, t, workspaceID])

  return (
    <>
      <div className="flex min-w-0 flex-col gap-2">
        <RequestLogsToolbar />
        <div className="hidden min-w-0 grid-cols-[minmax(13rem,1.2fr)_minmax(10rem,0.8fr)_minmax(9rem,0.7fr)_minmax(8rem,0.6fr)_minmax(8rem,0.7fr)_auto] gap-2.5 px-2.5 text-[0.72rem] font-medium text-muted-foreground xl:grid">
          <div>{t("dashboard.requestUID")}</div>
          <div>{t("forms.model")}</div>
          <div>{t("nav.status")}</div>
          <div>{t("dashboard.totalTokens")}</div>
          <div>{t("dashboard.latency")}</div>
          <div className="text-right">{t("actions.view")}</div>
        </div>

        {logs.length > 0 ? (
          <DashboardTablePagination
            paginationId="request_logs"
            pagination={pagination}
          >
            {logs.map((log) => {
              const firstTokenLatencyMS = getDisplayedFirstTokenLatencyMS(log)

              return (
                <button
                  key={log.id}
                  type="button"
                  className="grid min-w-0 gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors hover:border-foreground/15 hover:bg-muted/40 xl:grid-cols-[minmax(13rem,1.2fr)_minmax(10rem,0.8fr)_minmax(9rem,0.7fr)_minmax(8rem,0.6fr)_minmax(8rem,0.7fr)_auto] xl:items-center"
                  onClick={() => {
                    setSelectedID(log.id)
                    setDetailError(null)
                    setDetailStatus(detailCache[log.id] ? "ready" : "loading")
                  }}
                >
                  <div className="min-w-0">
                    <MobileLabel>{t("dashboard.requestUID")}</MobileLabel>
                    <div className="truncate font-mono text-xs font-medium text-foreground/90">
                      {log.request_uid}
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <FileTextIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{log.endpoint}</span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <MobileLabel>{t("forms.model")}</MobileLabel>
                    <div className="truncate text-xs font-medium">
                      {log.model_canonical_name || t("dashboard.notSet")}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {log.api_key_display_name || log.api_key_id || t("dashboard.notSet")}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <MobileLabel>{t("nav.status")}</MobileLabel>
                    <StatusPill status={log.status} />
                  </div>

                  <div className="min-w-0">
                    <MobileLabel>{t("dashboard.totalTokens")}</MobileLabel>
                    <div className="font-mono text-xs tabular-nums">
                      {formatNumber(log.total_tokens)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      ${log.spend_usd}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <MobileLabel>{t("dashboard.latency")}</MobileLabel>
                    <div className="font-mono text-xs tabular-nums">
                      {formatDuration(log.duration_ms)}
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock3Icon className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {firstTokenLatencyMS !== undefined
                          ? `${t("dashboard.firstTokenLatency")} ${formatDuration(firstTokenLatencyMS)}`
                          : formatDate(log.completed_at ?? log.request_started_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <span className="inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium text-foreground/80">
                      {t("actions.view")}
                    </span>
                  </div>
                </button>
              )
            })}
          </DashboardTablePagination>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(selectedID)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedID(null)
            setDetailStatus("idle")
            setDetailError(null)
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-6xl">
          {selectedLog ? (
            <RequestLogDetails
              log={selectedLog}
              detailStatus={detailStatus}
              detailError={detailError}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function RequestLogsToolbar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const initialSort =
    searchParams.get(REQUEST_LOG_SORT_PARAM) ?? REQUEST_LOG_SORT_RECENT
  const initialMinLatency =
    searchParams.get(REQUEST_LOG_FIRST_TOKEN_LATENCY_MIN_PARAM) ?? ""
  const initialMaxLatency =
    searchParams.get(REQUEST_LOG_FIRST_TOKEN_LATENCY_MAX_PARAM) ?? ""
  const toolbarKey = [
    initialSort,
    initialMinLatency,
    initialMaxLatency,
    searchParams.toString(),
  ].join(":")

  function applyFilters(nextSort: string, nextMin: string, nextMax: string) {
    const params = new URLSearchParams(searchParams.toString())
    const normalized = normalizeLatencyRange(nextMin, nextMax)

    if (nextSort === REQUEST_LOG_SORT_RECENT) {
      params.delete(REQUEST_LOG_SORT_PARAM)
    } else {
      params.set(REQUEST_LOG_SORT_PARAM, nextSort)
    }

    updateSearchParam(
      params,
      REQUEST_LOG_FIRST_TOKEN_LATENCY_MIN_PARAM,
      normalized.min
    )
    updateSearchParam(
      params,
      REQUEST_LOG_FIRST_TOKEN_LATENCY_MAX_PARAM,
      normalized.max
    )
    params.set(REQUEST_LOG_PAGE_PARAM, "1")

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <RequestLogsToolbarForm
      key={toolbarKey}
      initialSort={initialSort}
      initialMinLatency={initialMinLatency}
      initialMaxLatency={initialMaxLatency}
      onApply={applyFilters}
      t={t}
    />
  )
}

function RequestLogsToolbarForm({
  initialSort,
  initialMinLatency,
  initialMaxLatency,
  onApply,
  t,
}: {
  initialSort: string
  initialMinLatency: string
  initialMaxLatency: string
  onApply: (nextSort: string, nextMin: string, nextMax: string) => void
  t: ReturnType<typeof useI18n>["t"]
}) {
  const [sort, setSort] = useState(initialSort)
  const [minLatency, setMinLatency] = useState(initialMinLatency)
  const [maxLatency, setMaxLatency] = useState(initialMaxLatency)

  return (
    <form
      className="grid gap-2 rounded-lg border border-border/70 bg-muted/20 p-2.5 md:grid-cols-[minmax(0,13rem)_minmax(0,8rem)_minmax(0,8rem)_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        onApply(sort, minLatency, maxLatency)
      }}
    >
      <div className="grid gap-1">
        <label className="text-[0.72rem] font-medium text-muted-foreground">
          {t("dashboard.requestLogSort")}
        </label>
        <Select
          value={sort}
          onValueChange={(value) => setSort(value ?? REQUEST_LOG_SORT_RECENT)}
        >
          <SelectTrigger size="sm" className="w-full bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              <SelectItem value={REQUEST_LOG_SORT_RECENT}>
                {t("dashboard.requestLogSortRecent")}
              </SelectItem>
              <SelectItem value={REQUEST_LOG_SORT_FIRST_TOKEN_LATENCY_ASC}>
                {t("dashboard.requestLogSortFirstTokenLatencyAsc")}
              </SelectItem>
              <SelectItem value={REQUEST_LOG_SORT_FIRST_TOKEN_LATENCY_DESC}>
                {t("dashboard.requestLogSortFirstTokenLatencyDesc")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1">
        <label className="text-[0.72rem] font-medium text-muted-foreground">
          {t("dashboard.firstTokenLatencyMin")}
        </label>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={minLatency}
          onChange={(event) => setMinLatency(event.target.value)}
          className="bg-background font-mono"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-[0.72rem] font-medium text-muted-foreground">
          {t("dashboard.firstTokenLatencyMax")}
        </label>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={maxLatency}
          onChange={(event) => setMaxLatency(event.target.value)}
          className="bg-background font-mono"
        />
      </div>

      <div className="flex items-end justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setSort(REQUEST_LOG_SORT_RECENT)
            setMinLatency("")
            setMaxLatency("")
            onApply(REQUEST_LOG_SORT_RECENT, "", "")
          }}
        >
          {t("actions.clear")}
        </Button>
        <Button type="submit" size="sm">
          {t("actions.apply")}
        </Button>
      </div>
    </form>
  )
}

function RequestLogDetails({
  log,
  detailStatus,
  detailError,
}: {
  log: RequestLog
  detailStatus: DetailStatus
  detailError: string | null
}) {
  const { t } = useI18n()
  const latest = log.latest_attempt
  const firstTokenLatencyMS = getDisplayedFirstTokenLatencyMS(log)
  const rows: Array<[string, string | number | boolean | null | undefined]> = [
    [t("dashboard.requestUID"), log.request_uid],
    [t("forms.endpointType"), log.endpoint],
    [t("nav.status"), log.status],
    [t("forms.model"), log.model_canonical_name],
    [t("dashboard.provider"), log.model_provider],
    [t("dashboard.apiKey"), log.api_key_display_name ?? log.api_key_id],
    [t("dashboard.requestStartedAt"), formatDate(log.request_started_at)],
    [t("dashboard.firstTokenAt"), formatDate(log.first_token_at)],
    [t("dashboard.firstTokenLatency"), formatDuration(firstTokenLatencyMS)],
    [t("dashboard.completedAt"), formatDate(log.completed_at)],
    [t("dashboard.latency"), formatDuration(log.duration_ms)],
    [t("dashboard.promptTokens"), formatNumber(log.prompt_tokens)],
    [t("dashboard.completionTokens"), formatNumber(log.completion_tokens)],
    [t("dashboard.totalTokens"), formatNumber(log.total_tokens)],
    [t("dashboard.spend"), `$${log.spend_usd}`],
    [t("dashboard.traceID"), log.trace_id],
    [t("dashboard.clientIP"), log.client_ip],
    [t("dashboard.stream"), log.stream ? t("dashboard.yes") : t("dashboard.no")],
  ]
  const attemptPayloads = log.attempts.filter((attempt) => attempt.response_payload)

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("dashboard.requestLogDetailsTitle")}</DialogTitle>
        <DialogDescription>{log.request_uid}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label={t("nav.status")} value={log.status} />
          <MetricCard
            label={t("dashboard.firstTokenLatency")}
            value={formatDuration(firstTokenLatencyMS)}
          />
          <MetricCard
            label={t("dashboard.latency")}
            value={formatDuration(log.duration_ms)}
          />
          <MetricCard
            label={t("dashboard.totalTokens")}
            value={formatNumber(log.total_tokens)}
          />
          <MetricCard label={t("dashboard.spend")} value={`$${log.spend_usd}`} />
          <MetricCard
            label={t("dashboard.attempts")}
            value={String(log.attempt_count)}
          />
        </div>

        <KeyValueTable rows={rows} fallback={t("dashboard.notSet")} />

        {latest?.error_message ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm leading-6 text-destructive">
            {latest.error_message}
          </div>
        ) : null}

        {detailStatus === "loading" ? (
          <PayloadNotice>
            <LoaderCircleIcon className="size-4 animate-spin" />
            <span>{t("dashboard.loadingRequestLog")}</span>
          </PayloadNotice>
        ) : detailStatus === "error" ? (
          <PayloadNotice destructive>{detailError || t("dashboard.failedRequestLog")}</PayloadNotice>
        ) : (
          <>
            <div className="grid gap-3 xl:grid-cols-2">
              <PayloadCard
                title={t("dashboard.requestPayload")}
                payload={log.request_payload}
                fallback={t("dashboard.noRequestPayload")}
              />
              <PayloadCard
                title={t("dashboard.latestResponsePayload")}
                payload={latest?.response_payload}
                contentType={latest?.response_content_type}
                fallback={t("dashboard.noResponsePayload")}
              />
            </div>

            <div className="grid gap-3">
              <div className="text-sm font-medium">{t("dashboard.attemptOutputs")}</div>
              {attemptPayloads.length > 0 ? (
                attemptPayloads.map((attempt) => (
                  <PayloadCard
                    key={attempt.id}
                    title={`#${attempt.attempt_no} ${attempt.provider}`}
                    payload={attempt.response_payload}
                    contentType={attempt.response_content_type}
                    fallback={t("dashboard.noResponsePayload")}
                  />
                ))
              ) : (
                <PayloadNotice>{t("dashboard.noResponsePayload")}</PayloadNotice>
              )}
            </div>
          </>
        )}

        <div className="grid gap-2">
          <div className="text-sm font-medium">{t("dashboard.attempts")}</div>
          <div className="overflow-hidden rounded-lg border bg-background">
            <Table>
              <TableBody>
                {log.attempts.length > 0 ? (
                  log.attempts.map((attempt) => (
                    <TableRow key={attempt.id} className="align-top">
                      <TableCell className="w-20 font-mono text-xs">
                        #{attempt.attempt_no}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{attempt.provider}</div>
                        <div className="text-xs text-muted-foreground">
                          {attempt.deployment_name ||
                            attempt.deployment_id ||
                            t("dashboard.notSet")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={attempt.status} />
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {formatDuration(attempt.latency_ms)}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {formatNumber(
                          (attempt.prompt_tokens ?? 0) +
                            (attempt.completion_tokens ?? 0)
                        )}
                      </TableCell>
                      <TableCell className="max-w-56 text-xs text-muted-foreground">
                        {attempt.error_message || attempt.error_code || ""}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-sm text-muted-foreground">
                      {t("dashboard.noRequestAttempts")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  )
}

function MobileLabel({ children }: { children: string }) {
  return (
    <div className="mb-1 text-[0.72rem] text-muted-foreground xl:hidden">
      {children}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-md border px-1.5 text-[0.72rem] font-medium",
        (normalized === "success" || normalized === "succeeded") &&
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        (normalized === "failed" || normalized === "error") &&
          "border-destructive/25 bg-destructive/10 text-destructive",
        normalized === "in_progress" &&
          "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      )}
    >
      {status}
    </span>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2.5">
      <div className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate font-mono text-sm font-semibold tabular-nums">
        {value}
      </div>
    </div>
  )
}

function KeyValueTable({
  rows,
  fallback,
}: {
  rows: Array<[string, string | number | boolean | null | undefined]>
  fallback: string
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <Table>
        <TableBody>
          {rows.map(([label, value]) => (
            <TableRow key={label} className="hover:bg-transparent">
              <th className="w-40 px-3 py-2 text-left text-[0.72rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {label}
              </th>
              <TableCell className="px-3 py-2 font-mono text-xs break-all">
                {value === undefined || value === null || value === ""
                  ? fallback
                  : String(value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PayloadCard({
  title,
  payload,
  contentType,
  fallback,
}: {
  title: string
  payload?: string
  contentType?: string
  fallback: string
}) {
  const { t } = useI18n()
  const formatted = formatPayload(payload, contentType)

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-3 py-2">
        <div className="text-sm font-medium">{title}</div>
        {contentType ? (
          <div className="text-[0.72rem] text-muted-foreground">
            {t("dashboard.responseContentType")}: {contentType}
          </div>
        ) : null}
      </div>
      <pre className="max-h-[24rem] overflow-auto px-4 py-3 font-mono text-[0.76rem] leading-6 whitespace-pre-wrap break-all">
        {formatted || fallback}
      </pre>
    </div>
  )
}

function PayloadNotice({
  children,
  destructive = false,
}: {
  children: React.ReactNode
  destructive?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3.5 py-3 text-sm",
        destructive
          ? "border-destructive/20 bg-destructive/5 text-destructive"
          : "border-border bg-muted/20 text-muted-foreground"
      )}
    >
      {children}
    </div>
  )
}

function formatDuration(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toLocaleString()} ms`
    : "-"
}

function formatNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "0"
}

function formatDate(value?: string) {
  if (!value) {
    return "-"
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString()
}

function getDisplayedFirstTokenLatencyMS(log: RequestLog) {
  if (typeof log.first_token_latency_ms === "number") {
    return log.first_token_latency_ms
  }

  const firstTokenAt = getTimestamp(log.first_token_at)
  if (firstTokenAt === null) {
    return undefined
  }

  const attemptStartedAt = log.attempts.reduce<number | null>((current, attempt) => {
    const startedAt = getTimestamp(attempt.started_at)
    if (startedAt === null || startedAt > firstTokenAt) {
      return current
    }
    if (current === null || startedAt > current) {
      return startedAt
    }
    return current
  }, null)

  const requestStartedAt = getTimestamp(log.request_started_at)
  const baseline = attemptStartedAt ?? requestStartedAt
  if (baseline === null) {
    return undefined
  }

  const latency = firstTokenAt - baseline
  return latency >= 0 ? latency : undefined
}

function getTimestamp(value?: string) {
  if (!value) {
    return null
  }
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function normalizeLatencyRange(minValue: string, maxValue: string) {
  let min = normalizeLatencyInput(minValue)
  let max = normalizeLatencyInput(maxValue)

  if (min && max && Number(min) > Number(max)) {
    ;[min, max] = [max, min]
  }

  return { min, max }
}

function normalizeLatencyInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }

  const parsed = Number(trimmed)
  if (!Number.isInteger(parsed) || parsed < 0) {
    return ""
  }

  return String(parsed)
}

function updateSearchParam(
  params: URLSearchParams,
  key: string,
  value: string
) {
  if (value) {
    params.set(key, value)
    return
  }
  params.delete(key)
}

function formatPayload(payload?: string, contentType?: string) {
  if (!payload) {
    return ""
  }

  const trimmed = payload.trim()
  const looksLikeJSON =
    contentType?.toLowerCase().includes("json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")

  if (!looksLikeJSON) {
    return payload
  }

  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  } catch {
    return payload
  }
}

function safeParseJSON(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}
