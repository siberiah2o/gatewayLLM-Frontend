import {
  ChatSmokeTestForm,
  CreateAPIKeyForm,
  CreateModelCatalogForm,
  CreateModelDeploymentForm,
  CreateProviderCredentialForm,
  CreateWorkspaceForm,
  CreateWorkspaceUserDialog,
  RevokeAPIKeyButton,
} from "@/components/dashboard-actions"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
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
  InfoRow,
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

function AccountSection({ t, user }: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="account">
        <CardHeader>
          <CardTitle>{t("dashboard.signedInUser")}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <InfoRow
            label={t("dashboard.name")}
            value={user.display_name || t("dashboard.notSet")}
          />
          <InfoRow
            label={t("nav.status")}
            value={
              user.status
                ? localizeValue(t, user.status)
                : t("dashboard.notSet")
            }
          />
          <InfoRow
            label={t("dashboard.email")}
            value={
              user.email_verified
                ? t("dashboard.verified")
                : localizeValue(t, user.email_verification_status ?? "unverified")
            }
          />
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
  return (
    <section className="grid gap-4">
      <Card id="api-keys">
        <CardHeader>
          <CardTitle>{t("dashboard.apiKeysTitle")}</CardTitle>
          <CardDescription>{t("dashboard.apiKeysDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CreateAPIKeyForm workspaceId={activeWorkspace?.id} />
          {apiKeys.ok && apiKeys.data.data.length > 0 ? (
            apiKeys.data.data.map((apiKey) => (
              <div
                key={apiKey.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {apiKey.display_name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {apiKey.id}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge>{localizeValue(t, apiKey.status)}</StatusBadge>
                  <RevokeAPIKeyButton
                    apiKeyID={apiKey.id}
                    disabled={apiKey.status !== "active"}
                  />
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              message={apiKeys.ok ? t("dashboard.noApiKeys") : apiKeys.error}
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
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
