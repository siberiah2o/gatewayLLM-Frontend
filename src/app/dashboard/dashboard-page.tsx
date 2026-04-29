import fs from "node:fs"
import os from "node:os"
import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"

import {
  GatewayAPIError,
  gatewayBaseURL,
  gatewayRequest,
  type APIKeyList,
  type Balance,
  type DailyUsageList,
  type HealthResponse,
  type MeResponse,
  type ModelCatalogList,
  type ModelDeploymentList,
  type ProviderCredentialList,
  type ProviderSetupList,
  type ReadyResponse,
  type RegistrationRequestList,
  type RequestLogList,
  type RuntimeResourceSnapshot,
  type UsageInsights,
  type UserList,
  type WorkspaceDepartmentList,
  type WorkspaceMemberList,
  type WorkspaceList,
} from "@/lib/gatewayllm"
import { normalizeLocale, translate } from "@/lib/i18n"
import { getSessionToken } from "@/lib/session"
import { loadDashboardWorkspaceAccess } from "./dashboard-access"
import {
  loadWorkspaceResource,
  settle,
  showPrivilegedSection,
  skippedResult,
  type Settled,
} from "./dashboard-data"
import {
  parseDashboardPagination,
  type DashboardPaginationState,
  type DashboardSearchParams,
} from "./dashboard-pagination"
import { isUserDashboardSection } from "./dashboard-permissions"
import type { DashboardSection } from "./dashboard-routes"
import {
  parseDashboardTimeRange,
  type DashboardTimeRange,
} from "./dashboard-time-range"

import { DashboardSectionContent } from "./dashboard-sections"

const RESOURCE_LIST_LIMIT = 200
const REQUEST_LOG_QUERY_PARAM = "q"
const REQUEST_LOG_STATUS_PARAM = "status"
const REQUEST_LOG_PROVIDER_PARAM = "provider"
const REQUEST_LOG_API_KEY_PARAM = "api_key_id"
const REQUEST_LOG_USER_PARAM = "user"
const REQUEST_LOG_DEPARTMENT_PARAM = "department_id"
const REQUEST_LOG_STARTED_AFTER_PARAM = "started_after"
const REQUEST_LOG_STARTED_BEFORE_PARAM = "started_before"
export async function DashboardPage({
  section = "status",
  searchParams,
}: {
  section?: DashboardSection
  searchParams?: DashboardSearchParams
}) {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const locale = normalizeLocale(
    cookieStore.get("NEXT_LOCALE")?.value ?? headerStore.get("accept-language")
  )
  const t = (key: string, values?: Record<string, string | number>) =>
    translate(locale, key, values)
  const token = await getSessionToken()
  const chatSmokeBaseUrl = publicGatewayBaseURL(headerStore, gatewayBaseURL())

  if (!token) {
    redirect("/login")
  }

  let me: MeResponse

  try {
    me = await gatewayRequest<MeResponse>("/control/v1/me", { token })
  } catch (error) {
    if (error instanceof GatewayAPIError && error.status === 401) {
      redirect("/login")
    }

    throw error
  }

  const { activeWorkspace, canManageWorkspace } =
    await loadDashboardWorkspaceAccess(token)

  if (!canManageWorkspace && !isUserDashboardSection(section)) {
    redirect("/dashboard/models")
  }

  const noWorkspaceMessage = t("dashboard.noWorkspaceAvailable")
  const needsStatus = section === "status"
  const needsUsage = section === "usage"
  const needsApiKeys =
    section === "chat-smoke" ||
    section === "api-keys" ||
    (canManageWorkspace &&
      (section === "usage-details" || needsStatus))
  const needsModelCatalogs =
    section === "models" ||
    section === "chat-smoke" ||
    (canManageWorkspace &&
      (needsStatus ||
        section === "users" ||
        section === "departments" ||
        section === "deployments"))
  const needsProviderCredentials =
    canManageWorkspace &&
    (needsStatus || section === "credentials" || section === "deployments")
  const needsProviderSetups =
    canManageWorkspace &&
    (needsStatus || section === "provider-setups" || section === "logs")
  const needsDailyUsage = needsUsage || needsStatus
  const needsRequestLogs =
    canManageWorkspace &&
    (section === "logs" || section === "usage-details" || needsUsage || needsStatus)
  const needsUsageInsights = canManageWorkspace && needsUsage
  const needsDepartments =
    canManageWorkspace &&
    (section === "users" ||
      section === "departments" ||
      section === "logs" ||
      section === "usage-details")
  const needsModelDeployments =
    canManageWorkspace &&
    (needsStatus || section === "deployments" || section === "chat-smoke")
  const workspaceUsersPage = parseDashboardPagination(
    searchParams,
    "workspace_users"
  )
  const apiKeysPage = parseDashboardPagination(searchParams, "api_keys")
  const requestLogsPage = parseDashboardPagination(searchParams, "request_logs")
  const usageDetailsPage = parseDashboardPagination(searchParams, "usage_details")
  const providerSetupsPage = parseDashboardPagination(
    searchParams,
    "provider_setups"
  )
  const modelCatalogsPage = parseDashboardPagination(
    searchParams,
    "model_catalogs"
  )
  const providerCredentialsPage = parseDashboardPagination(
    searchParams,
    "provider_credentials"
  )
  const modelDeploymentsPage = parseDashboardPagination(
    searchParams,
    "model_deployments"
  )
  const pageWorkspaceUsers = section === "users"
  const pageApiKeys = section === "api-keys"
  const pageRequestLogs = section === "logs"
  const pageUsageDetails = section === "usage-details"
  const pageProviderSetups = section === "provider-setups"
  const pageModelCatalogs = section === "models"
  const pageProviderCredentials = section === "credentials"
  const pageModelDeployments = section === "deployments"

  const requestLogFilters = parseRequestLogFilters(searchParams)
  const timeRange = parseDashboardTimeRange(searchParams)
  const dailyUsageLookbackDays = timeRange.lookbackDays

  const [health, ready, backendRuntime, frontendRuntime] = needsStatus
    ? await Promise.all([
        settle(gatewayRequest<HealthResponse>("/healthz")),
        settle(gatewayRequest<ReadyResponse>("/readyz")),
        settle(
          gatewayRequest<RuntimeResourceSnapshot>("/control/v1/runtime-status", {
            token,
          })
        ),
        settle(Promise.resolve(getFrontendRuntimeSnapshot())),
      ])
    : [
        skippedResult<HealthResponse>(),
        skippedResult<ReadyResponse>(),
        skippedResult<RuntimeResourceSnapshot>(),
        skippedResult<RuntimeResourceSnapshot>(),
      ]

  const [
    balance,
    apiKeys,
    dailyUsage,
    usageInsights,
    requestLogs,
    workspaceUsers,
    workspaceMembers,
    workspaceDepartments,
    registrationRequests,
    modelCatalogs,
    providerCredentials,
    providerSetups,
    modelDeployments,
  ] = await Promise.all([
    loadWorkspaceResource(
      needsStatus || needsUsage,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<Balance>(
          `/control/v1/me/balance?workspace_id=${encodeURIComponent(
            workspace.id
          )}`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsApiKeys,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<APIKeyList>(
          `/control/v1/me/api-keys?workspace_id=${encodeURIComponent(
            workspace.id
          )}&status=active&${paginationQuery(apiKeysPage, pageApiKeys)}`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsDailyUsage,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<DailyUsageList>(
          `/control/v1/me/daily-usage?workspace_id=${encodeURIComponent(
            workspace.id
          )}&days=${dailyUsageLookbackDays}`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsUsageInsights,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<UsageInsights>(
          `/control/v1/me/usage-insights?workspace_id=${encodeURIComponent(
            workspace.id
          )}&days=${timeRange.days}&limit=5`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsRequestLogs,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) => {
        const query = pageRequestLogs
          ? requestLogQuery(
              requestLogsPage,
              pageRequestLogs,
              requestLogFilters,
              timeRange
            )
          : pageUsageDetails
            ? requestLogQuery(
                usageDetailsPage,
                pageUsageDetails,
                requestLogFilters,
                timeRange
              )
            : requestLogLimitQuery(
                needsUsage ? RESOURCE_LIST_LIMIT : 60,
                timeRange
              )

        return gatewayRequest<RequestLogList>(
          `/control/v1/request-logs?workspace_id=${encodeURIComponent(
            workspace.id
          )}&${query}`,
          { token }
        )
      }
    ),
    loadWorkspaceResource(
      needsStatus || section === "users",
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<UserList>(
          `/control/v1/workspaces/${encodeURIComponent(
            workspace.id
          )}/users?${paginationQuery(workspaceUsersPage, pageWorkspaceUsers)}`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsStatus,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<WorkspaceMemberList>(
          `/control/v1/workspaces/${encodeURIComponent(
            workspace.id
          )}/members?limit=${RESOURCE_LIST_LIMIT}`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsDepartments,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<WorkspaceDepartmentList>(
          `/control/v1/workspaces/${encodeURIComponent(
            workspace.id
          )}/departments?limit=${RESOURCE_LIST_LIMIT}`,
          { token }
        )
    ),
    skippedResult<RegistrationRequestList>(),
    loadWorkspaceResource(
      needsModelCatalogs,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<ModelCatalogList>(
          `/control/v1/model-catalogs?workspace_id=${encodeURIComponent(
            workspace.id
          )}&${paginationQuery(modelCatalogsPage, pageModelCatalogs)}`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsProviderCredentials,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<ProviderCredentialList>(
          `/control/v1/provider-credentials?workspace_id=${encodeURIComponent(
            workspace.id
          )}&${paginationQuery(
            providerCredentialsPage,
            pageProviderCredentials
          )}`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsProviderSetups,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<ProviderSetupList>(
          `/control/v1/provider-setups?workspace_id=${encodeURIComponent(
            workspace.id
          )}&${paginationQuery(providerSetupsPage, pageProviderSetups)}`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsModelDeployments,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<ModelDeploymentList>(
          `/control/v1/model-deployments?workspace_id=${encodeURIComponent(
            workspace.id
          )}&${paginationQuery(modelDeploymentsPage, pageModelDeployments)}`,
          { token }
        )
    ),
  ])

  const [pagedApiKeys, apiKeysPagination] = finalizePaginatedResult(
    apiKeys,
    apiKeysPage,
    pageApiKeys
  )
  const [pagedRequestLogs, requestLogsPagination] = finalizePaginatedResult(
    requestLogs,
    requestLogsPage,
    pageRequestLogs
  )
  const [pagedUsageDetailsRequestLogs, usageDetailsPagination] =
    finalizePaginatedResult(requestLogs, usageDetailsPage, pageUsageDetails)
  const [pagedWorkspaceUsers, workspaceUsersPagination] =
    finalizePaginatedResult(workspaceUsers, workspaceUsersPage, pageWorkspaceUsers)
  const [pagedModelCatalogs, modelCatalogsPagination] =
    finalizePaginatedResult(modelCatalogs, modelCatalogsPage, pageModelCatalogs)
  const [pagedProviderCredentials, providerCredentialsPagination] =
    finalizePaginatedResult(
      providerCredentials,
      providerCredentialsPage,
      pageProviderCredentials
    )
  const [pagedProviderSetups, providerSetupsPagination] =
    finalizePaginatedResult(providerSetups, providerSetupsPage, pageProviderSetups)
  const [pagedModelDeployments, modelDeploymentsPagination] =
    finalizePaginatedResult(
      modelDeployments,
      modelDeploymentsPage,
      pageModelDeployments
    )

  const pendingRegistrationRequests =
    needsStatus || section === "registration"
      ? await loadRegistrationRequestsForWorkspace(
          activeWorkspace,
          token,
          noWorkspaceMessage
        )
      : registrationRequests

  const workspaceUserList = pagedWorkspaceUsers.ok
    ? pagedWorkspaceUsers.data.data
    : []
  const resolvedRequestLogs = pageUsageDetails
    ? pagedUsageDetailsRequestLogs
    : pagedRequestLogs

  const workspaceDepartmentList = workspaceDepartments.ok
    ? workspaceDepartments.data.data
    : []
  const modelCatalogList = pagedModelCatalogs.ok
    ? pagedModelCatalogs.data.data
    : []
  const providerCredentialList = pagedProviderCredentials.ok
    ? pagedProviderCredentials.data.data
    : []
  const providerSetupList = pagedProviderSetups.ok
    ? pagedProviderSetups.data.data
    : []
  const modelDeploymentList = pagedModelDeployments.ok
    ? pagedModelDeployments.data.data
    : []
  const activeModelCatalogList = modelCatalogList.filter(
    (modelCatalog) => modelCatalog.status === "active"
  )
  const activeModelCatalogIDSet = new Set(
    activeModelCatalogList.map((modelCatalog) => modelCatalog.id)
  )
  const activeModelDeploymentList = modelDeploymentList.filter(
    (deployment) =>
      deployment.status === "active" &&
      activeModelCatalogIDSet.has(deployment.model_catalog_id)
  )
  const chatSmokeModel =
    activeModelDeploymentList[0]?.model_canonical_name ??
    activeModelCatalogList[0]?.canonical_name ??
    ""
  const showUserManagement =
    canManageWorkspace &&
    (section === "users" || showPrivilegedSection(activeWorkspace, workspaceUsers))
  const showDepartmentManagement =
    canManageWorkspace &&
    (section === "departments" ||
      showPrivilegedSection(activeWorkspace, workspaceDepartments))
  const showRegistration =
    canManageWorkspace &&
    (section === "registration" ||
      showPrivilegedSection(activeWorkspace, pendingRegistrationRequests))
  const showModelCatalogManagement =
    canManageWorkspace &&
    (section === "models" || showPrivilegedSection(activeWorkspace, modelCatalogs))
  const showProviderCredentialManagement =
    canManageWorkspace &&
    (section === "credentials" ||
      showPrivilegedSection(activeWorkspace, providerCredentials))
  const showModelDeploymentManagement =
    canManageWorkspace &&
    (section === "deployments" ||
      showPrivilegedSection(activeWorkspace, modelDeployments))

  return (
    <DashboardSectionContent
      section={section}
      t={t}
      timeRange={timeRange}
      user={me.user}
      activeWorkspace={activeWorkspace}
      health={health}
      ready={ready}
      frontendRuntime={frontendRuntime}
      backendRuntime={backendRuntime}
      balance={balance}
      apiKeys={pagedApiKeys}
      dailyUsage={dailyUsage}
      usageInsights={usageInsights}
      requestLogs={resolvedRequestLogs}
      workspaceUsers={pagedWorkspaceUsers}
      workspaceUserList={workspaceUserList}
      workspaceMembers={workspaceMembers}
      workspaceDepartments={workspaceDepartments}
      workspaceDepartmentList={workspaceDepartmentList}
      registrationRequests={pendingRegistrationRequests}
      modelCatalogs={pagedModelCatalogs}
      modelCatalogList={modelCatalogList}
      providerCredentials={pagedProviderCredentials}
      providerCredentialList={providerCredentialList}
      providerSetups={pagedProviderSetups}
      providerSetupList={providerSetupList}
      modelDeployments={pagedModelDeployments}
      modelDeploymentList={modelDeploymentList}
      tablePagination={{
        workspace_users: workspaceUsersPagination,
        api_keys: apiKeysPagination,
        request_logs: requestLogsPagination,
        usage_details: usageDetailsPagination,
        provider_setups: providerSetupsPagination,
        model_catalogs: modelCatalogsPagination,
        provider_credentials: providerCredentialsPagination,
        model_deployments: modelDeploymentsPagination,
      }}
      chatSmokeModel={chatSmokeModel}
      chatSmokeBaseUrl={chatSmokeBaseUrl}
      canManageWorkspace={canManageWorkspace}
      showUserManagement={showUserManagement}
      showDepartmentManagement={showDepartmentManagement}
      showRegistration={showRegistration}
      showModelCatalogManagement={showModelCatalogManagement}
      showProviderCredentialManagement={showProviderCredentialManagement}
      showModelDeploymentManagement={showModelDeploymentManagement}
    />
  )
}

function publicGatewayBaseURL(headerStore: Headers, configuredBaseURL: string) {
  try {
    const configured = new URL(configuredBaseURL)
    const configuredHost = configured.hostname.toLowerCase()

    if (
      configuredHost !== "127.0.0.1" &&
      configuredHost !== "localhost" &&
      configuredHost !== "::1"
    ) {
      return configured.toString().replace(/\/+$/, "")
    }

    const requestHost =
      headerStore.get("x-forwarded-host") ?? headerStore.get("host")
    if (!requestHost) {
      return configured.toString().replace(/\/+$/, "")
    }

    const requestURL = new URL(`${configured.protocol}//${requestHost}`)
    const protocol =
      headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      configured.protocol.replace(":", "")

    configured.protocol = `${protocol}:`
    configured.hostname = requestURL.hostname
    configured.port = configured.port || requestURL.port

    return configured.toString().replace(/\/+$/, "")
  } catch {
    return configuredBaseURL.replace(/\/+$/, "")
  }
}

async function loadRegistrationRequestsForWorkspace(
  workspace: WorkspaceList["data"][number] | undefined,
  token: string,
  noWorkspaceMessage: string
): Promise<Settled<RegistrationRequestList>> {
  if (!workspace) {
    return {
      ok: false,
      error: noWorkspaceMessage,
    }
  }

  return settle(
    gatewayRequest<RegistrationRequestList>(
      `/control/v1/workspaces/${encodeURIComponent(
        workspace.id
      )}/registration-requests?status=pending&limit=${RESOURCE_LIST_LIMIT}`,
      { token }
    )
  )
}

type ParsedDashboardPagination = ReturnType<typeof parseDashboardPagination>

function paginationQuery(
  pagination: ParsedDashboardPagination,
  enabled: boolean
) {
  const params = new URLSearchParams({
    limit: String(enabled ? pagination.requestLimit : RESOURCE_LIST_LIMIT),
  })

  if (enabled && pagination.offset > 0) {
    params.set("offset", String(pagination.offset))
  }

  return params.toString()
}

function requestLogQuery(
  pagination: ParsedDashboardPagination,
  enabled: boolean,
  filters: ReturnType<typeof parseRequestLogFilters>,
  timeRange: DashboardTimeRange
) {
  const params = new URLSearchParams(paginationQuery(pagination, enabled))

  appendRequestLogFilters(params, filters, timeRange)

  return params.toString()
}

function requestLogLimitQuery(
  limit: number,
  timeRange: DashboardTimeRange
) {
  const params = new URLSearchParams({
    limit: String(limit),
  })

  appendRequestLogTimeRange(params, timeRange)

  return params.toString()
}

function appendRequestLogFilters(
  params: URLSearchParams,
  filters: ReturnType<typeof parseRequestLogFilters>,
  timeRange: DashboardTimeRange
) {
  appendRequestLogTimeRange(params, timeRange)
  if (filters.query) {
    params.set(REQUEST_LOG_QUERY_PARAM, filters.query)
  }
  if (filters.status) {
    params.set(REQUEST_LOG_STATUS_PARAM, filters.status)
  }
  if (filters.provider) {
    params.set(REQUEST_LOG_PROVIDER_PARAM, filters.provider)
  }
  if (filters.apiKeyID) {
    params.set(REQUEST_LOG_API_KEY_PARAM, filters.apiKeyID)
  }
  if (filters.user) {
    params.set(REQUEST_LOG_USER_PARAM, filters.user)
  }
  if (filters.departmentID) {
    params.set(REQUEST_LOG_DEPARTMENT_PARAM, filters.departmentID)
  }
}

function appendRequestLogTimeRange(
  params: URLSearchParams,
  timeRange: DashboardTimeRange
) {
  params.set(REQUEST_LOG_STARTED_AFTER_PARAM, timeRange.startedAfter)
  params.set(REQUEST_LOG_STARTED_BEFORE_PARAM, timeRange.startedBefore)
}

function parseRequestLogFilters(searchParams: DashboardSearchParams | undefined) {
  return {
    query: normalizeRequestLogParam(readSearchParam(searchParams, REQUEST_LOG_QUERY_PARAM)),
    status: normalizeRequestLogParam(readSearchParam(searchParams, REQUEST_LOG_STATUS_PARAM)),
    provider: normalizeRequestLogParam(readSearchParam(searchParams, REQUEST_LOG_PROVIDER_PARAM)),
    apiKeyID: normalizeRequestLogParam(
      readSearchParam(searchParams, REQUEST_LOG_API_KEY_PARAM)
    ),
    user: normalizeRequestLogParam(readSearchParam(searchParams, REQUEST_LOG_USER_PARAM)),
    departmentID: normalizeRequestLogParam(
      readSearchParam(searchParams, REQUEST_LOG_DEPARTMENT_PARAM)
    ),
  }
}

function readSearchParam(
  searchParams: DashboardSearchParams | undefined,
  key: string
) {
  const value = searchParams?.[key]

  return Array.isArray(value) ? value[0] : value
}

function normalizeRequestLogParam(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function finalizePaginatedResult<T extends { data: unknown[] }>(
  result: Settled<T>,
  pagination: ParsedDashboardPagination,
  enabled: boolean
): [Settled<T>, DashboardPaginationState | undefined] {
  if (!enabled || !result.ok) {
    return [result, undefined]
  }

  const pageItems = result.data.data.slice(0, pagination.pageSize)
  const hasNext =
    result.data.data.length > pagination.pageSize ||
    (pagination.pageSize >= RESOURCE_LIST_LIMIT &&
      result.data.data.length >= pagination.pageSize)

  return [
    {
      ok: true,
      data: {
        ...result.data,
        data: pageItems,
      } as T,
    },
    {
      page: pagination.page,
      pageSize: pagination.pageSize,
      offset: pagination.offset,
      itemCount: pageItems.length,
      hasNext,
    },
  ]
}

function getFrontendRuntimeSnapshot(): RuntimeResourceSnapshot {
  const memoryUsage = process.memoryUsage()
  const [loadAvg1m, loadAvg5m, loadAvg15m] = os.loadavg()
  const diskStatus = readFrontendDiskStatus("/")
  const tcpConnectionStatus = readFrontendTCPConnectionStatus()

  return {
    service: process.env.npm_package_name || "gatewayllm-frontend",
    runtime: "nodejs",
    captured_at: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    process: {
      pid: process.pid,
      rss_bytes: memoryUsage.rss,
      heap_used_bytes: memoryUsage.heapUsed,
      heap_total_bytes: memoryUsage.heapTotal,
      tcp_connection_count: tcpConnectionStatus?.total,
      tcp_established_count: tcpConnectionStatus?.established,
    },
    host: {
      cpu_count:
        typeof os.availableParallelism === "function"
          ? os.availableParallelism()
          : os.cpus().length,
      load_avg_1m: loadAvg1m,
      load_avg_5m: loadAvg5m,
      load_avg_15m: loadAvg15m,
      total_memory_bytes: os.totalmem(),
      free_memory_bytes: os.freemem(),
      disk_total_bytes: diskStatus?.total,
      disk_free_bytes: diskStatus?.free,
    },
  }
}

function readFrontendDiskStatus(path: string) {
  try {
    const stat = fs.statfsSync(path)
    const blockSize = Number(stat.bsize)
    return {
      total: Number(stat.blocks) * blockSize,
      free: Number(stat.bavail) * blockSize,
    }
  } catch {
    return undefined
  }
}

function readFrontendTCPConnectionStatus() {
  const socketInodes = readFrontendSocketInodes()
  if (!socketInodes || socketInodes.size === 0) {
    return undefined
  }

  const ipv4 = readFrontendSocketTable("/proc/net/tcp", socketInodes)
  const ipv6 = readFrontendSocketTable("/proc/net/tcp6", socketInodes)

  return {
    total: ipv4.total + ipv6.total,
    established: ipv4.established + ipv6.established,
  }
}

function readFrontendSocketInodes() {
  try {
    const entries = fs.readdirSync("/proc/self/fd")
    const inodes = new Set<string>()

    for (const entry of entries) {
      try {
        const target = fs.readlinkSync(`/proc/self/fd/${entry}`)
        if (!target.startsWith("socket:[") || !target.endsWith("]")) {
          continue
        }

        const inode = target.slice("socket:[".length, -1)
        if (inode) {
          inodes.add(inode)
        }
      } catch {}
    }

    return inodes
  } catch {
    return undefined
  }
}

function readFrontendSocketTable(path: string, socketInodes: Set<string>) {
  try {
    const lines = fs.readFileSync(path, "utf8").trim().split("\n").slice(1)
    let total = 0
    let established = 0

    for (const line of lines) {
      const fields = line.trim().split(/\s+/)
      if (fields.length < 10 || !socketInodes.has(fields[9])) {
        continue
      }

      total += 1
      if (fields[3] === "01") {
        established += 1
      }
    }

    return { total, established }
  } catch {
    return { total: 0, established: 0 }
  }
}
