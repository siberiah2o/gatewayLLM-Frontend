"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { FileTextIcon, LoaderCircleIcon } from "lucide-react"
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import type {
  ProviderSetup,
  RequestLog,
  WorkspaceDepartment,
} from "@/lib/gatewayllm"
import { cn } from "@/lib/utils"
import type { DashboardPaginationState } from "./dashboard-pagination"
import { DashboardTablePagination } from "./dashboard-table-pagination"

type DetailStatus = "idle" | "loading" | "ready" | "error"

const REQUEST_LOGS_GRID_CLASS =
  "xl:grid-cols-[minmax(13rem,1.1fr)_minmax(10rem,0.75fr)_minmax(9rem,0.7fr)_minmax(8rem,0.65fr)_minmax(8rem,0.55fr)_minmax(8rem,0.6fr)_minmax(8rem,0.6fr)_auto]"
const REQUEST_LOG_QUERY_PARAM = "q"
const REQUEST_LOG_STATUS_PARAM = "status"
const REQUEST_LOG_PROVIDER_PARAM = "provider"
const REQUEST_LOG_DEPARTMENT_PARAM = "department_id"
const REQUEST_LOG_STATUS_OPTIONS = ["in_progress", "succeeded", "failed"]

export function RequestLogsTable({
  logs,
  pagination,
  providerSetupList,
  departments,
  workspaceID,
  emptyMessage,
}: {
  logs: RequestLog[]
  pagination?: DashboardPaginationState
  providerSetupList: ProviderSetup[]
  departments: WorkspaceDepartment[]
  workspaceID: string
  emptyMessage: string
}) {
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, RequestLog>>({})
  const [detailStatus, setDetailStatus] = useState<DetailStatus>("idle")
  const [detailError, setDetailError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const appliedQuery = searchParams.get(REQUEST_LOG_QUERY_PARAM) ?? ""
  const appliedStatus = searchParams.get(REQUEST_LOG_STATUS_PARAM) ?? ""
  const appliedProvider = searchParams.get(REQUEST_LOG_PROVIDER_PARAM) ?? ""
  const appliedDepartmentID =
    searchParams.get(REQUEST_LOG_DEPARTMENT_PARAM) ?? ""
  const statusOptions = useMemo(() => {
    const options = new Set(REQUEST_LOG_STATUS_OPTIONS)
    if (appliedStatus) {
      options.add(appliedStatus)
    }
    for (const log of logs) {
      if (log.status) {
        options.add(log.status)
      }
    }
    return Array.from(options)
  }, [appliedStatus, logs])
  const providerOptions = useMemo(() => {
    const options = new Set<string>()
    if (appliedProvider) {
      options.add(appliedProvider)
    }
    for (const setup of providerSetupList) {
      if (setup.provider) {
        options.add(setup.provider)
      }
    }
    for (const log of logs) {
      if (log.model_provider) {
        options.add(log.model_provider)
      }
    }
    return Array.from(options).sort()
  }, [appliedProvider, logs, providerSetupList])
  const departmentOptions = useMemo(
    () => buildDepartmentOptions(departments, logs, appliedDepartmentID, t),
    [appliedDepartmentID, departments, logs, t]
  )

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
        <RequestLogFilters
          key={`${appliedQuery}:${appliedStatus}:${appliedProvider}:${appliedDepartmentID}`}
          appliedQuery={appliedQuery}
          appliedStatus={appliedStatus}
          appliedProvider={appliedProvider}
          appliedDepartmentID={appliedDepartmentID}
          statusOptions={statusOptions}
          providerOptions={providerOptions}
          departmentOptions={departmentOptions}
        />

        <div
          className={cn(
            "hidden min-w-0 gap-2 px-2.5 text-xs font-medium text-muted-foreground xl:grid",
            REQUEST_LOGS_GRID_CLASS
          )}
        >
          <div className="min-w-0 truncate">{t("dashboard.requestUID")}</div>
          <div className="min-w-0 truncate">{t("forms.model")}</div>
          <div className="min-w-0 truncate">{t("dashboard.department")}</div>
          <div className="min-w-0 truncate">{t("nav.status")}</div>
          <div className="min-w-0 truncate">{t("dashboard.totalTokens")}</div>
          <div className="min-w-0 truncate">{t("dashboard.latency")}</div>
          <div className="min-w-0 truncate">{t("dashboard.firstTokenLatency")}</div>
          <div className="min-w-0 justify-self-end truncate text-right">
            {t("actions.view")}
          </div>
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
                  className={cn(
                    "grid min-w-0 gap-2 rounded-md border p-2 text-left text-sm transition-colors hover:border-foreground/15 hover:bg-muted/40 xl:items-center",
                    REQUEST_LOGS_GRID_CLASS
                  )}
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
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <FileTextIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{log.endpoint}</span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <MobileLabel>{t("forms.model")}</MobileLabel>
                    <div className="truncate text-xs font-medium">
                      {log.model_canonical_name || t("dashboard.notSet")}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {log.api_key_display_name || log.api_key_id || t("dashboard.notSet")}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <MobileLabel>{t("dashboard.department")}</MobileLabel>
                    <div className="truncate text-xs font-medium">
                      {getDepartmentLabel(log, t)}
                    </div>
                    {log.department_id ? (
                      <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {log.department_id}
                      </div>
                    ) : null}
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
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      ${log.spend_usd}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <MobileLabel>{t("dashboard.latency")}</MobileLabel>
                    <div className="font-mono text-xs tabular-nums">
                      {formatDuration(log.duration_ms)}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatDate(log.completed_at ?? log.request_started_at)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <MobileLabel>{t("dashboard.firstTokenLatency")}</MobileLabel>
                    <div className="font-mono text-xs tabular-nums">
                      {firstTokenLatencyMS !== undefined
                        ? formatDuration(firstTokenLatencyMS)
                        : t("dashboard.notSet")}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatDate(log.first_token_at ?? log.request_started_at)}
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <span className="inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium text-foreground/80">
                      {t("actions.view")}
                    </span>
                  </div>
                </button>
              )
            })}
          </DashboardTablePagination>
        ) : (
          <div className="rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground">
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

function RequestLogFilters({
  appliedQuery,
  appliedStatus,
  appliedProvider,
  appliedDepartmentID,
  statusOptions,
  providerOptions,
  departmentOptions,
}: {
  appliedQuery: string
  appliedStatus: string
  appliedProvider: string
  appliedDepartmentID: string
  statusOptions: string[]
  providerOptions: string[]
  departmentOptions: Array<{ value: string; label: string }>
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const [queryInput, setQueryInput] = useState(appliedQuery)
  const [statusInput, setStatusInput] = useState(appliedStatus)
  const [providerInput, setProviderInput] = useState(appliedProvider)
  const [departmentInput, setDepartmentInput] = useState(appliedDepartmentID)
  const hasFilters = Boolean(
    appliedQuery ||
      appliedStatus ||
      appliedProvider ||
      appliedDepartmentID ||
      queryInput ||
      statusInput ||
      providerInput ||
      departmentInput
  )

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const params = new URLSearchParams(searchParams)
    syncRequestLogParam(params, REQUEST_LOG_QUERY_PARAM, queryInput)
    syncRequestLogParam(params, REQUEST_LOG_STATUS_PARAM, statusInput)
    syncRequestLogParam(params, REQUEST_LOG_PROVIDER_PARAM, providerInput)
    syncRequestLogParam(
      params,
      REQUEST_LOG_DEPARTMENT_PARAM,
      departmentInput
    )
    params.delete("request_logs_page")

    const nextQuery = params.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    })
  }

  function clearFilters() {
    setQueryInput("")
    setStatusInput("")
    setProviderInput("")
    setDepartmentInput("")

    const params = new URLSearchParams(searchParams)
    params.delete(REQUEST_LOG_QUERY_PARAM)
    params.delete(REQUEST_LOG_STATUS_PARAM)
    params.delete(REQUEST_LOG_PROVIDER_PARAM)
    params.delete(REQUEST_LOG_DEPARTMENT_PARAM)
    params.delete("request_logs_page")

    const nextQuery = params.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    })
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border/70 bg-muted/20 p-2 md:flex-row md:items-center"
      onSubmit={submitFilters}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:flex-row lg:items-center">
        <Input
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          className="h-7 w-full min-w-0 flex-1 text-xs"
          placeholder={t("dashboard.requestLogQuery")}
          aria-label={t("dashboard.requestLogQuery")}
        />
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-xs text-muted-foreground">
            {t("nav.status")}
          </span>
          <Select
            value={statusInput || "__all__"}
            onValueChange={(value) =>
              setStatusInput(!value || value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger
              size="sm"
              className="h-7 w-full text-xs sm:w-36"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="__all__">{t("dashboard.allStatuses")}</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-xs text-muted-foreground">
            {t("forms.provider")}
          </span>
          <Select
            value={providerInput || "__all__"}
            onValueChange={(value) =>
              setProviderInput(!value || value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger
              size="sm"
              className="h-7 w-full text-xs sm:w-36"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="__all__">{t("dashboard.allProviders")}</SelectItem>
              {providerOptions.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-xs text-muted-foreground">
            {t("dashboard.department")}
          </span>
          <Select
            value={departmentInput || "__all__"}
            onValueChange={(value) =>
              setDepartmentInput(!value || value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger size="sm" className="h-7 w-full text-xs sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="__all__">
                {t("dashboard.allDepartments")}
              </SelectItem>
              {departmentOptions.map((department) => (
                <SelectItem key={department.value} value={department.value}>
                  {department.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-1.5 md:ml-auto">
        <Button type="submit" size="sm" className="h-7 px-2.5">
          {t("actions.apply")}
        </Button>
        {hasFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5"
            onClick={clearFilters}
          >
            {t("actions.clear")}
          </Button>
        ) : null}
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
    [t("dashboard.department"), getDepartmentLabel(log, t)],
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

      <div className="grid gap-2.5">
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
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm leading-6 text-destructive">
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
            <div className="grid gap-2.5 xl:grid-cols-2">
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

            <div className="grid gap-2">
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
          <div className="overflow-hidden rounded-md border bg-background">
            <Table>
              <TableBody>
                {log.attempts.length > 0 ? (
                  log.attempts.map((attempt) => (
                    <TableRow key={attempt.id} className="align-top">
                      <TableCell className="w-20 py-1.5 font-mono text-xs">
                        #{attempt.attempt_no}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="font-medium">{attempt.provider}</div>
                        <div className="text-xs text-muted-foreground">
                          {attempt.deployment_name ||
                            attempt.deployment_id ||
                            t("dashboard.notSet")}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <StatusPill status={attempt.status} />
                      </TableCell>
                      <TableCell className="py-1.5 font-mono text-xs tabular-nums">
                        {formatDuration(attempt.latency_ms)}
                      </TableCell>
                      <TableCell className="py-1.5 font-mono text-xs tabular-nums">
                        {formatNumber(
                          (attempt.prompt_tokens ?? 0) +
                            (attempt.completion_tokens ?? 0)
                        )}
                      </TableCell>
                      <TableCell className="max-w-56 py-1.5 text-xs text-muted-foreground">
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
    <div className="mb-1 text-xs text-muted-foreground xl:hidden">
      {children}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-md border px-1.5 text-xs font-medium",
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
    <div className="rounded-md border bg-background px-2.5 py-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 truncate font-mono text-sm font-semibold tabular-nums">
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
    <div className="overflow-hidden rounded-md border bg-background">
      <Table>
        <TableBody>
          {rows.map(([label, value]) => (
            <TableRow key={label} className="hover:bg-transparent">
              <th className="w-40 px-2.5 py-1.5 text-left text-xs font-medium uppercase text-muted-foreground">
                {label}
              </th>
              <TableCell className="px-2.5 py-1.5 font-mono text-xs break-all">
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
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="flex items-center justify-between gap-2.5 border-b bg-muted/20 px-2.5 py-1.5">
        <div className="text-sm font-medium">{title}</div>
        {contentType ? (
          <div className="text-xs text-muted-foreground">
            {t("dashboard.responseContentType")}: {contentType}
          </div>
        ) : null}
      </div>
      <pre className="max-h-[20rem] overflow-auto px-3 py-2 font-mono text-xs leading-5 whitespace-pre-wrap break-all">
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
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
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
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
  ].join("-") +
    ` ${padDatePart(date.getUTCHours())}:${padDatePart(
      date.getUTCMinutes()
    )}:${padDatePart(date.getUTCSeconds())} UTC`
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0")
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

function buildDepartmentOptions(
  departments: WorkspaceDepartment[],
  logs: RequestLog[],
  appliedDepartmentID: string,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  const options = new Map<string, string>()

  for (const department of departments) {
    options.set(department.id, department.name || department.id)
  }

  for (const log of logs) {
    const departmentID = log.department_id?.trim()
    if (!departmentID || options.has(departmentID)) {
      continue
    }
    options.set(departmentID, getDepartmentLabel(log, t))
  }

  if (appliedDepartmentID && !options.has(appliedDepartmentID)) {
    options.set(appliedDepartmentID, appliedDepartmentID)
  }

  return Array.from(options.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

function getDepartmentLabel(
  log: RequestLog,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  return (
    log.department_name?.trim() ||
    log.department_id?.trim() ||
    t("dashboard.noDepartment")
  )
}

function syncRequestLogParam(
  params: URLSearchParams,
  key: string,
  value: string
) {
  const trimmed = value.trim()
  if (trimmed) {
    params.set(key, trimmed)
    return
  }

  params.delete(key)
}
