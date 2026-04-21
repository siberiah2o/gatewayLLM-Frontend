import {
  ChatSmokeTestForm,
  CreateAPIKeyForm,
  CreateModelCatalogForm,
  CreateModelDeploymentForm,
  CreateProviderCredentialForm,
  CreateWorkspaceForm,
  CreateWorkspaceUserDialog,
  RevokeAPIKeyButton,
  ViewAPIKeyDialog,
} from "@/components/dashboard-actions"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Building2Icon,
  KeyRoundIcon,
  ShieldCheckIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import type {
  APIKey,
  APIKeyList,
  Balance,
  DailyUsageList,
  HealthResponse,
  ModelCatalog,
  ModelCatalogList,
  ModelDeployment,
  ModelDeploymentList,
  ProviderCredential,
  ProviderCredentialList,
  ReadyResponse,
  RegistrationRequestList,
  SessionUser,
  User,
  UserList,
  Workspace,
  WorkspaceList,
  WorkspaceMember,
  WorkspaceMemberList,
} from "@/lib/gatewayllm"
import type { Settled } from "./dashboard-data"
import type { DashboardSection } from "./dashboard-routes"
import {
  EmptyState,
  MetricCard,
  StatusBadge,
  WorkspaceRow,
  localizeValue,
  type Translator,
} from "./dashboard-ui"
import {
  ModelCatalogRow,
  ModelDeploymentRow,
  ProviderCredentialRow,
  RegistrationRequestRow,
  WorkspaceMemberRow,
} from "./dashboard-rows"
import { AccountSection } from "./sections/account-section"
import { WorkspaceUsersTable } from "./workspace-user-row"

type DashboardSectionContentProps = {
  section: DashboardSection
  t: Translator
  user: SessionUser
  activeWorkspace?: Workspace
  workspaceList: Workspace[]
  workspaces: Settled<WorkspaceList>
  health: Settled<HealthResponse>
  ready: Settled<ReadyResponse>
  balance: Settled<Balance>
  apiKeys: Settled<APIKeyList>
  dailyUsage: Settled<DailyUsageList>
  workspaceUsers: Settled<UserList>
  workspaceUserList: User[]
  workspaceMembers: Settled<WorkspaceMemberList>
  workspaceMemberList: WorkspaceMember[]
  registrationRequests: Settled<RegistrationRequestList>
  modelCatalogs: Settled<ModelCatalogList>
  modelCatalogList: ModelCatalog[]
  providerCredentials: Settled<ProviderCredentialList>
  providerCredentialList: ProviderCredential[]
  modelDeployments: Settled<ModelDeploymentList>
  modelDeploymentList: ModelDeployment[]
  chatSmokeModel: string
  showUserManagement: boolean
  showMemberManagement: boolean
  showRegistration: boolean
  showModelCatalogManagement: boolean
  showProviderCredentialManagement: boolean
  showModelDeploymentManagement: boolean
}

export function DashboardSectionContent(props: DashboardSectionContentProps) {
  switch (props.section) {
    case "status":
      return <StatusSection {...props} />
    case "usage":
      return <UsageSection {...props} />
    case "workspaces":
      return <WorkspacesSection {...props} />
    case "account":
      return <AccountSection {...props} />
    case "users":
      return <UsersSection {...props} />
    case "members":
      return <MembersSection {...props} />
    case "registration":
      return <RegistrationSection {...props} />
    case "api-keys":
      return <ApiKeysSection {...props} />
    case "models":
      return <ModelsSection {...props} />
    case "credentials":
      return <CredentialsSection {...props} />
    case "deployments":
      return <DeploymentsSection {...props} />
    case "chat-smoke":
      return <ChatSmokeSection {...props} />
  }
}

function StatusSection({
  t,
  health,
  ready,
  workspaces,
  workspaceList,
  registrationRequests,
  workspaceUsers,
  workspaceMembers,
  modelDeployments,
  balance,
  showRegistration,
  showUserManagement,
  showMemberManagement,
  showModelDeploymentManagement,
}: DashboardSectionContentProps) {
  return (
    <section
      id="status"
      className="grid auto-rows-min gap-4 md:grid-cols-3 xl:grid-cols-7"
    >
      <MetricCard
        label={t("dashboard.httpServer")}
        value={
          health.ok ? localizeValue(t, health.data.status) : t("dashboard.offline")
        }
        detail={health.ok ? health.data.service : health.error}
      />
      <MetricCard
        label={t("dashboard.readiness")}
        value={
          ready.ok ? localizeValue(t, ready.data.status) : t("dashboard.unknown")
        }
        detail={ready.ok ? "readyz" : ready.error}
      />
      <MetricCard
        label={t("dashboard.workspaces")}
        value={String(workspaceList.length)}
        detail={workspaces.ok ? t("dashboard.visibleToSession") : workspaces.error}
      />
      {showRegistration ? (
        <MetricCard
          label={t("dashboard.pendingSignups")}
          value={
            registrationRequests.ok
              ? String(registrationRequests.data.data.length)
              : "0"
          }
          detail={
            registrationRequests.ok
              ? t("dashboard.registrationRequests")
              : registrationRequests.error
          }
        />
      ) : null}
      {showUserManagement ? (
        <MetricCard
          label={t("dashboard.users")}
          value={
            workspaceUsers.ok ? String(workspaceUsers.data.data.length) : "0"
          }
          detail={
            workspaceUsers.ok
              ? t("dashboard.workspaceUsers")
              : workspaceUsers.error
          }
        />
      ) : null}
      {showMemberManagement ? (
        <MetricCard
          label={t("dashboard.members")}
          value={
            workspaceMembers.ok ? String(workspaceMembers.data.data.length) : "0"
          }
          detail={
            workspaceMembers.ok
              ? t("dashboard.workspaceMembers")
              : workspaceMembers.error
          }
        />
      ) : null}
      {showModelDeploymentManagement ? (
        <MetricCard
          label={t("dashboard.deployments")}
          value={
            modelDeployments.ok ? String(modelDeployments.data.data.length) : "0"
          }
          detail={
            modelDeployments.ok
              ? t("dashboard.activeModels")
              : modelDeployments.error
          }
        />
      ) : null}
      <MetricCard
        label={t("dashboard.monthSpend")}
        value={balance.ok ? `$${balance.data.month_to_date_spend_usd}` : "$0"}
        detail={balance.ok ? t("dashboard.monthToDate") : balance.error}
      />
    </section>
  )
}

function WorkspacesSection({
  t,
  workspaceList,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="workspaces">
        <CardHeader>
          <CardTitle>{t("dashboard.workspaces")}</CardTitle>
          <CardDescription>{t("dashboard.workspacesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CreateWorkspaceForm />
          {workspaceList.length > 0 ? (
            workspaceList.map((workspace) => (
              <WorkspaceRow key={workspace.id} workspace={workspace} t={t} />
            ))
          ) : (
            <EmptyState message={t("dashboard.noWorkspaces")} />
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function UsersSection({
  t,
  activeWorkspace,
  workspaceUsers,
  workspaceUserList,
  modelCatalogList,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="users">
        <CardHeader>
          <CardTitle>{t("dashboard.usersTitle")}</CardTitle>
          <CardDescription>{t("dashboard.usersDescription")}</CardDescription>
          <CardAction>
            <CreateWorkspaceUserDialog workspaceId={activeWorkspace?.id} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {workspaceUsers.ok && workspaceUserList.length > 0 ? (
            <WorkspaceUsersTable
              users={workspaceUserList}
              workspaceId={activeWorkspace?.id}
              modelCatalogs={modelCatalogList}
              t={t}
            />
          ) : (
            <EmptyState
              message={
                workspaceUsers.ok ? t("dashboard.noUsers") : workspaceUsers.error
              }
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function MembersSection({
  t,
  activeWorkspace,
  workspaceMembers,
  workspaceMemberList,
  modelCatalogList,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="members">
        <CardHeader>
          <CardTitle>{t("dashboard.membersTitle")}</CardTitle>
          <CardDescription>{t("dashboard.membersDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {workspaceMembers.ok && workspaceMemberList.length > 0 ? (
            workspaceMemberList.map((member) => (
              <WorkspaceMemberRow
                key={member.user_id}
                member={member}
                workspaceId={activeWorkspace?.id}
                modelCatalogs={modelCatalogList}
                t={t}
              />
            ))
          ) : (
            <EmptyState
              message={
                workspaceMembers.ok
                  ? t("dashboard.noMembers")
                  : workspaceMembers.error
              }
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function RegistrationSection({
  t,
  registrationRequests,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="registration">
        <CardHeader>
          <CardTitle>{t("dashboard.registrationTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.registrationDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {registrationRequests.ok &&
          registrationRequests.data.data.length > 0 ? (
            registrationRequests.data.data.map((request) => (
              <RegistrationRequestRow key={request.id} request={request} />
            ))
          ) : (
            <EmptyState
              message={
                registrationRequests.ok
                  ? t("dashboard.noRegistration")
                  : registrationRequests.error
              }
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function ApiKeysSection({
  t,
  activeWorkspace,
  apiKeys,
}: DashboardSectionContentProps) {
  const apiKeyList = apiKeys.ok ? apiKeys.data.data : []
  const activeKeyCount = apiKeyList.filter(
    (apiKey) => apiKey.status === "active"
  ).length
  const workspaceLabel =
    activeWorkspace?.name ?? t("dashboard.noWorkspaceAvailable")

  return (
    <section className="grid gap-4">
      <Card id="api-keys">
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <ApiKeySummary
            icon={<ShieldCheckIcon className="size-4" />}
            label={t("dashboard.activeApiKeys")}
            value={String(activeKeyCount)}
            detail={apiKeys.ok ? t("dashboard.apiKeysListTitle") : apiKeys.error}
          />
          <ApiKeySummary
            icon={<Building2Icon className="size-4" />}
            label={t("dashboard.workspaceScope")}
            value={workspaceLabel}
            detail={activeWorkspace?.id ?? t("dashboard.notSet")}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{t("dashboard.apiKeysListTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>{String(apiKeyList.length)}</StatusBadge>
            </CardAction>
          </CardHeader>
          <CardContent className="text-sm">
            {apiKeyList.length > 0 ? (
              <div className="space-y-3">
                <div className="hidden xl:grid xl:grid-cols-[minmax(10rem,0.95fr)_minmax(0,1.2fr)_minmax(12rem,0.95fr)_minmax(10rem,0.85fr)_6rem] xl:gap-4 xl:px-4 xl:text-[0.72rem] xl:font-medium xl:text-muted-foreground">
                  <div>{t("dashboard.nickname")}</div>
                  <div>{t("dashboard.apiKeyId")}</div>
                  <div>{t("dashboard.createdAt")}</div>
                  <div>{t("dashboard.lastUsedAt")}</div>
                  <div className="text-right">{t("dashboard.actions")}</div>
                </div>
                {apiKeyList.map((apiKey) => (
                  <APIKeyRow key={apiKey.id} apiKey={apiKey} t={t} />
                ))}
              </div>
            ) : (
              <EmptyState
                message={apiKeys.ok ? t("dashboard.noApiKeys") : apiKeys.error}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <KeyRoundIcon className="size-4 text-muted-foreground" />
              {t("dashboard.createApiKeyTitle")}
            </CardTitle>
            <CardDescription>{workspaceLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateAPIKeyForm workspaceId={activeWorkspace?.id} />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function ApiKeySummary({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-md bg-muted/50 p-3">
      <div className="flex size-8 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-foreground/10">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-heading text-lg font-semibold">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  )
}

function APIKeyRow({ apiKey, t }: { apiKey: APIKey; t: Translator }) {
  const displayName = apiKey.display_name?.trim() || t("dashboard.notSet")
  const status = localizeValue(t, apiKey.status)

  return (
    <div className="grid gap-4 rounded-lg border p-4 xl:grid-cols-[minmax(10rem,0.95fr)_minmax(0,1.2fr)_minmax(12rem,0.95fr)_minmax(10rem,0.85fr)_6rem] xl:items-center">
      <div className="min-w-0">
        <div className="text-[0.72rem] text-muted-foreground xl:hidden">
          {t("dashboard.nickname")}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate font-medium">{displayName}</div>
          <StatusBadge>{status}</StatusBadge>
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">
          {t("dashboard.expiresAt")}{" "}
          {formatAPIKeyDate(apiKey.expires_at, t("dashboard.noExpiration"))}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[0.72rem] text-muted-foreground xl:hidden">
          {t("dashboard.apiKeyId")}
        </div>
        <ViewAPIKeyDialog
          apiKeyID={apiKey.id}
          displayName={displayName}
          triggerLabel={formatAPIKeyPreview(apiKey.id)}
          triggerVariant="link"
          triggerSize="sm"
          triggerClassName="h-auto min-w-0 max-w-full shrink justify-start overflow-hidden px-0 font-mono text-xs font-medium text-primary hover:text-primary/80 xl:text-sm"
          triggerTitle={apiKey.id}
          showIcon={false}
        />
      </div>
      <APIKeyMeta
        label={t("dashboard.createdAt")}
        value={formatAPIKeyDate(apiKey.created_at, t("dashboard.notSet"))}
      />
      <APIKeyMeta
        label={t("dashboard.lastUsedAt")}
        value={formatAPIKeyDate(apiKey.last_used_at, t("dashboard.neverUsed"))}
      />
      <div className="flex items-start xl:justify-end">
        <div className="xl:hidden text-[0.72rem] text-muted-foreground">
          {t("actions.revoke")}
        </div>
        <RevokeAPIKeyButton
          apiKeyID={apiKey.id}
          disabled={apiKey.status !== "active"}
          className="items-start xl:items-end"
        />
      </div>
    </div>
  )
}

function APIKeyMeta({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <div className="text-[0.72rem] text-muted-foreground xl:hidden">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  )
}

function formatAPIKeyPreview(value: string) {
  const normalized = value.trim()

  if (normalized.length <= 18) {
    return normalized
  }

  return `${normalized.slice(0, 8)}...${normalized.slice(-8)}`
}

function formatAPIKeyDate(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${date.toISOString().replace("T", " ").slice(0, 16)} UTC`
}

function ModelsSection({
  t,
  activeWorkspace,
  modelCatalogs,
  modelCatalogList,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="models">
        <CardHeader>
          <CardTitle>{t("dashboard.modelsTitle")}</CardTitle>
          <CardDescription>{t("dashboard.modelsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CreateModelCatalogForm workspaceId={activeWorkspace?.id} />
          {modelCatalogs.ok && modelCatalogList.length > 0 ? (
            modelCatalogList.map((modelCatalog) => (
              <ModelCatalogRow
                key={modelCatalog.id}
                modelCatalog={modelCatalog}
                t={t}
              />
            ))
          ) : (
            <EmptyState
              message={
                modelCatalogs.ok ? t("dashboard.noModels") : modelCatalogs.error
              }
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function CredentialsSection({
  t,
  activeWorkspace,
  providerCredentials,
  providerCredentialList,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="credentials">
        <CardHeader>
          <CardTitle>{t("dashboard.credentialsTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.credentialsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CreateProviderCredentialForm workspaceId={activeWorkspace?.id} />
          {providerCredentials.ok && providerCredentialList.length > 0 ? (
            providerCredentialList.map((credential) => (
              <ProviderCredentialRow
                key={credential.id}
                credential={credential}
                t={t}
              />
            ))
          ) : (
            <EmptyState
              message={
                providerCredentials.ok
                  ? t("dashboard.noCredentials")
                  : providerCredentials.error
              }
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function DeploymentsSection({
  t,
  activeWorkspace,
  modelDeployments,
  modelDeploymentList,
  modelCatalogList,
  providerCredentialList,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="deployments">
        <CardHeader>
          <CardTitle>{t("dashboard.deploymentsTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.deploymentsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CreateModelDeploymentForm
            workspaceId={activeWorkspace?.id}
            modelCatalogs={modelCatalogList}
            providerCredentials={providerCredentialList}
          />
          {modelDeployments.ok && modelDeploymentList.length > 0 ? (
            modelDeploymentList.map((deployment) => (
              <ModelDeploymentRow
                key={deployment.id}
                deployment={deployment}
                modelCatalogs={modelCatalogList}
                providerCredentials={providerCredentialList}
                t={t}
              />
            ))
          ) : (
            <EmptyState
              message={
                modelDeployments.ok
                  ? t("dashboard.noDeployments")
                  : modelDeployments.error
              }
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function ChatSmokeSection({
  t,
  chatSmokeModel,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="chat-smoke">
        <CardHeader>
          <CardTitle>{t("dashboard.chatSmokeTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.chatSmokeDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatSmokeTestForm defaultModel={chatSmokeModel} />
        </CardContent>
      </Card>
    </section>
  )
}

function UsageSection({ t, dailyUsage }: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="usage">
        <CardHeader>
          <CardTitle>{t("dashboard.dailyUsageTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.dailyUsageDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {dailyUsage.ok && dailyUsage.data.data.length > 0 ? (
            dailyUsage.data.data.slice(0, 6).map((usage) => (
              <div
                key={usage.usage_date}
                className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{usage.usage_date}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("dashboard.requestsTokens", {
                      requests: usage.request_count,
                      tokens: usage.prompt_tokens + usage.completion_tokens,
                    })}
                  </div>
                </div>
                <div className="font-medium">${usage.spend_usd}</div>
              </div>
            ))
          ) : (
            <EmptyState
              message={
                dailyUsage.ok ? t("dashboard.noDailyUsage") : dailyUsage.error
              }
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
