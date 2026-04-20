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
} from "./dashboard-data"
import type { DashboardSection } from "./dashboard-routes"
import { DashboardSectionContent } from "./dashboard-sections"

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
    section === "users" ||
    section === "members" ||
    section === "models" ||
    section === "deployments" ||
    section === "chat-smoke"
  const needsProviderCredentials =
    section === "credentials" || section === "deployments"
  const needsModelDeployments =
    section === "status" ||
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
    loadWorkspaceResource(
      needsStatus || section === "registration",
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<RegistrationRequestList>(
          `/control/v1/workspaces/${encodeURIComponent(
            workspace.id
          )}/registration-requests?status=pending&limit=20`,
          { token }
        )
    ),
    loadWorkspaceResource(
      needsModelCatalogs,
      activeWorkspace,
      noWorkspaceMessage,
      (workspace) =>
        gatewayRequest<ModelCatalogList>(
          `/control/v1/model-catalogs?workspace_id=${encodeURIComponent(
            workspace.id
          )}&status=active&limit=20`,
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
          )}&status=active&limit=20`,
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
          )}&status=active&limit=20`,
          { token }
        )
    ),
  ])

  const workspaceUserList = workspaceUsers.ok ? workspaceUsers.data.data : []
  const workspaceMemberList = workspaceMembers.ok
    ? workspaceMembers.data.data
    : []
  const modelCatalogList = modelCatalogs.ok ? modelCatalogs.data.data : []
  const providerCredentialList = providerCredentials.ok
    ? providerCredentials.data.data
    : []
  const modelDeploymentList = modelDeployments.ok
    ? modelDeployments.data.data
    : []
  const chatSmokeModel =
    modelDeploymentList[0]?.model_canonical_name ??
    modelCatalogList[0]?.canonical_name ??
    "gpt-4o-mini"
  const showUserManagement =
    section === "users" || showPrivilegedSection(activeWorkspace, workspaceUsers)
  const showMemberManagement =
    section === "members" ||
    showPrivilegedSection(activeWorkspace, workspaceMembers)
  const showRegistration =
    section === "registration" ||
    showPrivilegedSection(activeWorkspace, registrationRequests)
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
      registrationRequests={registrationRequests}
      modelCatalogs={modelCatalogs}
      modelCatalogList={modelCatalogList}
      providerCredentials={providerCredentials}
      providerCredentialList={providerCredentialList}
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
