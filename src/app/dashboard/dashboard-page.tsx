import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"

import {
  GatewayAPIError,
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
  type UserList,
  type WorkspaceMemberList,
  type WorkspaceList,
} from "@/lib/gatewayllm"
import { normalizeLocale, translate } from "@/lib/i18n"
import { getSessionToken } from "@/lib/session"
import {
  loadWorkspaceResource,
  settle,
  showPrivilegedSection,
  skippedResult,
  type Settled,
} from "./dashboard-data"
import type { DashboardSection } from "./dashboard-routes"
import { DashboardSectionContent } from "./dashboard-sections"

const RESOURCE_LIST_LIMIT = 100

export async function DashboardPage({
  section = "status",
}: {
  section?: DashboardSection
}) {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const locale = normalizeLocale(
    cookieStore.get("NEXT_LOCALE")?.value ?? headerStore.get("accept-language")
  )
  const t = (key: string, values?: Record<string, string | number>) =>
    translate(locale, key, values)
  const token = await getSessionToken()

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

  const workspaces = await settle(
    gatewayRequest<WorkspaceList>("/control/v1/me/workspaces?limit=20", {
      token,
    })
  )

  const workspaceList = workspaces.ok ? workspaces.data.data : []
  const activeWorkspace = workspaceList[0]
  const noWorkspaceMessage = t("dashboard.noWorkspaceAvailable")
  const needsStatus = section === "status"
  const needsModelCatalogs =
    section === "members" ||
    section === "advanced" ||
    section === "models" ||
    section === "deployments" ||
    section === "chat-smoke"
  const needsProviderCredentials =
    section === "advanced" ||
    section === "credentials" ||
    section === "deployments"
  const needsProviderSetups = section === "provider-setups"
  const needsModelDeployments =
    section === "status" ||
    section === "advanced" ||
    section === "deployments" ||
    section === "chat-smoke"

  const [health, ready] = needsStatus
    ? await Promise.all([
        settle(gatewayRequest<HealthResponse>("/healthz")),
        settle(gatewayRequest<ReadyResponse>("/readyz")),
      ])
    : [skippedResult<HealthResponse>(), skippedResult<ReadyResponse>()]

  const [
    balance,
    apiKeys,
    dailyUsage,
    workspaceUsers,
    workspaceMembers,
    registrationRequests,
    modelCatalogs,
    providerCredentials,
    providerSetups,
    modelDeployments,
  ] = await Promise.all([
    loadWorkspaceResource(
      needsStatus,
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
      section === "api-keys",
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<APIKeyList>(
          `/control/v1/me/api-keys?workspace_id=${encodeURIComponent(
            workspace.id
          )}&status=active&limit=20`,
          { token }
        )
    ),
    loadWorkspaceResource(
      section === "usage",
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<DailyUsageList>(
          `/control/v1/me/daily-usage?workspace_id=${encodeURIComponent(
            workspace.id
          )}&days=30`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsStatus || section === "users",
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<UserList>(
          `/control/v1/workspaces/${encodeURIComponent(
            workspace.id
          )}/users?limit=50`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsStatus || section === "members",
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<WorkspaceMemberList>(
          `/control/v1/workspaces/${encodeURIComponent(
            workspace.id
          )}/members?limit=20`,
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
          )}&limit=${RESOURCE_LIST_LIMIT}`,
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
          )}&limit=${RESOURCE_LIST_LIMIT}`,
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
          )}&limit=${RESOURCE_LIST_LIMIT}`,
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
          )}&limit=${RESOURCE_LIST_LIMIT}`,
          { token }
        )
    ),
  ])

  const pendingRegistrationRequests =
    needsStatus || section === "registration"
      ? await loadRegistrationRequestsForWorkspaces(
          workspaceList,
          token,
          noWorkspaceMessage
        )
      : registrationRequests

  const workspaceUserList = workspaceUsers.ok ? workspaceUsers.data.data : []
  const workspaceMemberList = workspaceMembers.ok
    ? workspaceMembers.data.data
    : []
  const modelCatalogList = modelCatalogs.ok ? modelCatalogs.data.data : []
  const providerCredentialList = providerCredentials.ok
    ? providerCredentials.data.data
    : []
  const providerSetupList = providerSetups.ok ? providerSetups.data.data : []
  const modelDeploymentList = modelDeployments.ok
    ? modelDeployments.data.data
    : []
  const activeModelCatalogList = modelCatalogList.filter(
    (modelCatalog) => modelCatalog.status === "active"
  )
  const activeModelDeploymentList = modelDeploymentList.filter(
    (deployment) => deployment.status === "active"
  )
  const chatSmokeModel =
    activeModelDeploymentList[0]?.model_canonical_name ??
    activeModelCatalogList[0]?.canonical_name ??
    "gpt-4o-mini"
  const showUserManagement =
    section === "users" || showPrivilegedSection(activeWorkspace, workspaceUsers)
  const showMemberManagement =
    section === "members" ||
    showPrivilegedSection(activeWorkspace, workspaceMembers)
  const showRegistration =
    section === "registration" ||
    showPrivilegedSection(activeWorkspace, pendingRegistrationRequests)
  const showModelCatalogManagement =
    section === "models" ||
    showPrivilegedSection(activeWorkspace, modelCatalogs)
  const showProviderCredentialManagement =
    section === "credentials" ||
    showPrivilegedSection(activeWorkspace, providerCredentials)
  const showModelDeploymentManagement =
    section === "deployments" ||
    showPrivilegedSection(activeWorkspace, modelDeployments)

  return (
    <DashboardSectionContent
      section={section}
      t={t}
      user={me.user}
      activeWorkspace={activeWorkspace}
      workspaceList={workspaceList}
      workspaces={workspaces}
      health={health}
      ready={ready}
      balance={balance}
      apiKeys={apiKeys}
      dailyUsage={dailyUsage}
      workspaceUsers={workspaceUsers}
      workspaceUserList={workspaceUserList}
      workspaceMembers={workspaceMembers}
      workspaceMemberList={workspaceMemberList}
      registrationRequests={pendingRegistrationRequests}
      modelCatalogs={modelCatalogs}
      modelCatalogList={modelCatalogList}
      providerCredentials={providerCredentials}
      providerCredentialList={providerCredentialList}
      providerSetups={providerSetups}
      providerSetupList={providerSetupList}
      modelDeployments={modelDeployments}
      modelDeploymentList={modelDeploymentList}
      chatSmokeModel={chatSmokeModel}
      showUserManagement={showUserManagement}
      showMemberManagement={showMemberManagement}
      showRegistration={showRegistration}
      showModelCatalogManagement={showModelCatalogManagement}
      showProviderCredentialManagement={showProviderCredentialManagement}
      showModelDeploymentManagement={showModelDeploymentManagement}
    />
  )
}

async function loadRegistrationRequestsForWorkspaces(
  workspaces: WorkspaceList["data"],
  token: string,
  noWorkspaceMessage: string
): Promise<Settled<RegistrationRequestList>> {
  if (workspaces.length === 0) {
    return {
      ok: false,
      error: noWorkspaceMessage,
    }
  }

  const results = await Promise.all(
    workspaces.map((workspace) =>
      settle(
        gatewayRequest<RegistrationRequestList>(
          `/control/v1/workspaces/${encodeURIComponent(
            workspace.id
          )}/registration-requests?status=pending&limit=20`,
          { token }
        )
      )
    )
  )
  const successful = results.filter((result) => result.ok)

  if (successful.length === 0) {
    const firstError = results.find((result) => !result.ok)

    return {
      ok: false,
      error: firstError?.error ?? noWorkspaceMessage,
      status: firstError && !firstError.ok ? firstError.status : undefined,
    }
  }

  return {
    ok: true,
    data: {
      object: "list",
      data: successful.flatMap((result) => result.data.data),
    },
  }
}
