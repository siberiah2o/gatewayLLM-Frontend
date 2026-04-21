import {
  ChatSmokeTestForm,
  CreateAPIKeyForm,
  CreateModelCatalogForm,
  CreateModelDeploymentForm,
  CreateProviderCredentialForm,
  CreateWorkspaceForm,
  CreateWorkspaceUserDialog,
} from "@/components/dashboard-actions"
import {
  Card,
  CardAction,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import {
  BotIcon,
  ClipboardListIcon,
  KeyRoundIcon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersRoundIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import {
  DashboardDetailText,
  DashboardMonoDetailText,
  DashboardPanelContent,
  DashboardPanelHeader,
  DashboardRow,
  DashboardStackContent,
  DashboardSummaryGrid,
  DashboardSummaryTile,
  DashboardSidebarCard,
  DashboardTableList,
  DashboardWorkspaceScopeTile,
  EmptyState,
  MetricCard,
  StatusBadge,
  WorkspaceRow,
  getWorkspaceScope,
  localizeValue,
} from "./dashboard-ui"
import {
  APIKeyRow,
  ModelCatalogRow,
  ModelDeploymentRow,
  ProviderCredentialRow,
  RegistrationRequestRow,
  WorkspaceMemberRow,
} from "./dashboard-rows"
import { AccountSection } from "./dashboard-account-section"
import type { Settled } from "./dashboard-data"
import type { DashboardSectionContentProps } from "./dashboard-section-types"
import { WorkspaceUsersTable } from "./workspace-user-row"

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

function getSettledMessage<T>(result: Settled<T>, successMessage: string) {
  return result.ok ? successMessage : result.error
}

function DashboardSettledMetric<T>({
  label,
  result,
  value,
  detail,
  fallbackValue,
}: {
  label: string
  result: Settled<T>
  value: (data: T) => string
  detail: string | ((data: T) => string)
  fallbackValue: string
}) {
  return (
    <MetricCard
      label={label}
      value={result.ok ? value(result.data) : fallbackValue}
      detail={
        result.ok
          ? typeof detail === "function"
            ? detail(result.data)
            : detail
          : result.error
      }
    />
  )
}

function DashboardSettledEmptyState<T>({
  result,
  emptyMessage,
  icon,
}: {
  result: Settled<T>
  emptyMessage: string
  icon?: ReactNode
}) {
  return (
    <EmptyState
      message={getSettledMessage(result, emptyMessage)}
      icon={icon}
    />
  )
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
      <DashboardSettledMetric
        label={t("dashboard.httpServer")}
        result={health}
        value={(data) => localizeValue(t, data.status)}
        detail={(data) => data.service}
        fallbackValue={t("dashboard.offline")}
      />
      <DashboardSettledMetric
        label={t("dashboard.readiness")}
        result={ready}
        value={(data) => localizeValue(t, data.status)}
        detail="readyz"
        fallbackValue={t("dashboard.unknown")}
      />
      <DashboardSettledMetric
        label={t("dashboard.workspaces")}
        result={workspaces}
        value={() => String(workspaceList.length)}
        detail={t("dashboard.visibleToSession")}
        fallbackValue={String(workspaceList.length)}
      />
      {showRegistration ? (
        <DashboardSettledMetric
          label={t("dashboard.pendingSignups")}
          result={registrationRequests}
          value={(data) => String(data.data.length)}
          detail={t("dashboard.registrationRequests")}
          fallbackValue="0"
        />
      ) : null}
      {showUserManagement ? (
        <DashboardSettledMetric
          label={t("dashboard.users")}
          result={workspaceUsers}
          value={(data) => String(data.data.length)}
          detail={t("dashboard.workspaceUsers")}
          fallbackValue="0"
        />
      ) : null}
      {showMemberManagement ? (
        <DashboardSettledMetric
          label={t("dashboard.members")}
          result={workspaceMembers}
          value={(data) => String(data.data.length)}
          detail={t("dashboard.workspaceMembers")}
          fallbackValue="0"
        />
      ) : null}
      {showModelDeploymentManagement ? (
        <DashboardSettledMetric
          label={t("dashboard.deployments")}
          result={modelDeployments}
          value={(data) => String(data.data.length)}
          detail={t("dashboard.activeModels")}
          fallbackValue="0"
        />
      ) : null}
      <DashboardSettledMetric
        label={t("dashboard.monthSpend")}
        result={balance}
        value={(data) => `$${data.month_to_date_spend_usd}`}
        detail={t("dashboard.monthToDate")}
        fallbackValue="$0"
      />
    </section>
  )
}

function WorkspacesSection({
  t,
  workspaceList,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-3">
      <Card id="workspaces">
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.workspaces")}</CardTitle>
          <CardDescription>{t("dashboard.workspacesDescription")}</CardDescription>
        </DashboardPanelHeader>
        <DashboardStackContent>
          <CreateWorkspaceForm />
          {workspaceList.length > 0 ? (
            workspaceList.map((workspace) => (
              <WorkspaceRow key={workspace.id} workspace={workspace} t={t} />
            ))
          ) : (
            <EmptyState message={t("dashboard.noWorkspaces")} />
          )}
        </DashboardStackContent>
      </Card>
    </section>
  )
}

function UsersSection({
  t,
  activeWorkspace,
  workspaceUsers,
  workspaceUserList,
}: DashboardSectionContentProps) {
  const workspaceScope = getWorkspaceScope(activeWorkspace, t)

  return (
    <section className="grid gap-3">
      <Card id="users">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<UsersRoundIcon className="size-4" />}
            label={t("dashboard.users")}
            value={String(workspaceUserList.length)}
            detail={getSettledMessage(workspaceUsers, t("dashboard.workspaceUsers"))}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.usersTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>{String(workspaceUserList.length)}</StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {workspaceUsers.ok && workspaceUserList.length > 0 ? (
              <WorkspaceUsersTable
                users={workspaceUserList}
                workspaceId={activeWorkspace?.id}
                t={t}
              />
            ) : (
              <DashboardSettledEmptyState
                result={workspaceUsers}
                emptyMessage={t("dashboard.noUsers")}
              />
            )}
          </DashboardPanelContent>
        </Card>

        <DashboardSidebarCard
          title={t("forms.createUser")}
          description={workspaceScope.label}
          icon={<UserPlusIcon className="size-4 text-muted-foreground" />}
        >
            <CreateWorkspaceUserDialog workspaceId={activeWorkspace?.id} />
            <div className="text-sm text-muted-foreground">
              {t("dashboard.usersDescription")}
            </div>
        </DashboardSidebarCard>
      </div>
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
  const activeMemberCount = workspaceMemberList.filter(
    (member) => member.status === "active"
  ).length

  return (
    <section className="grid gap-3">
      <Card id="members">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<UserCheckIcon className="size-4" />}
            label={t("dashboard.members")}
            value={String(activeMemberCount)}
            detail={getSettledMessage(workspaceMembers, t("dashboard.workspaceMembers"))}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>
      <Card>
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.membersTitle")}</CardTitle>
          <CardAction>
            <StatusBadge>{String(workspaceMemberList.length)}</StatusBadge>
          </CardAction>
        </DashboardPanelHeader>
        <DashboardPanelContent>
          {workspaceMembers.ok && workspaceMemberList.length > 0 ? (
            <DashboardTableList
              className="xl:grid-cols-[minmax(12rem,1fr)_5rem_minmax(12rem,0.7fr)_minmax(26rem,1fr)]"
              columns={[
                { label: t("dashboard.name") },
                { label: t("forms.role") },
                { label: t("nav.status") },
                { label: t("dashboard.actions"), className: "text-right" },
              ]}
            >
              {workspaceMemberList.map((member) => (
                <WorkspaceMemberRow
                  key={member.user_id}
                  member={member}
                  workspaceId={activeWorkspace?.id}
                  modelCatalogs={modelCatalogList}
                  t={t}
                />
              ))}
            </DashboardTableList>
          ) : (
            <DashboardSettledEmptyState
              result={workspaceMembers}
              emptyMessage={t("dashboard.noMembers")}
            />
          )}
        </DashboardPanelContent>
      </Card>
    </section>
  )
}

function RegistrationSection({
  t,
  activeWorkspace,
  registrationRequests,
}: DashboardSectionContentProps) {
  const registrationRequestList = registrationRequests.ok
    ? registrationRequests.data.data
    : []

  return (
    <section className="grid gap-3">
      <Card id="registration">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<ClipboardListIcon className="size-4" />}
            label={t("dashboard.registrationTitle")}
            value={String(registrationRequestList.length)}
            detail={getSettledMessage(
              registrationRequests,
              t("dashboard.registrationRequests")
            )}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>

      <Card>
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.registrationTitle")}</CardTitle>
          <CardAction>
            <StatusBadge>{String(registrationRequestList.length)}</StatusBadge>
          </CardAction>
        </DashboardPanelHeader>
        <DashboardPanelContent>
          {registrationRequests.ok && registrationRequestList.length > 0 ? (
            <DashboardTableList
              className="xl:grid-cols-[minmax(12rem,1fr)_minmax(0,1fr)_minmax(12rem,0.8fr)_auto]"
              columns={[
                { label: t("dashboard.name") },
                { label: t("dashboard.email") },
                { label: t("dashboard.createdAt") },
                { label: t("dashboard.actions"), className: "text-right" },
              ]}
            >
              {registrationRequestList.map((request) => (
                <RegistrationRequestRow
                  key={request.id}
                  request={request}
                  t={t}
                />
              ))}
            </DashboardTableList>
          ) : (
            <DashboardSettledEmptyState
              result={registrationRequests}
              emptyMessage={t("dashboard.noRegistration")}
            />
          )}
        </DashboardPanelContent>
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
  const workspaceScope = getWorkspaceScope(activeWorkspace, t)

  return (
    <section className="grid gap-3">
      <Card id="api-keys">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<ShieldCheckIcon className="size-4" />}
            label={t("dashboard.activeApiKeys")}
            value={String(activeKeyCount)}
            detail={getSettledMessage(apiKeys, t("dashboard.apiKeysListTitle"))}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.apiKeysListTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>{String(apiKeyList.length)}</StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {apiKeyList.length > 0 ? (
              <DashboardTableList
                className="xl:grid-cols-[minmax(10rem,0.95fr)_minmax(0,1.2fr)_minmax(12rem,0.95fr)_minmax(10rem,0.85fr)_auto]"
                columns={[
                  { label: t("dashboard.name") },
                  { label: t("dashboard.apiKeyId") },
                  { label: t("dashboard.createdAt") },
                  { label: t("dashboard.lastUsedAt") },
                  {
                    label: t("dashboard.actions"),
                    className: "text-right",
                  },
                ]}
              >
                {apiKeyList.map((apiKey) => (
                  <APIKeyRow key={apiKey.id} apiKey={apiKey} t={t} />
                ))}
              </DashboardTableList>
            ) : (
              <DashboardSettledEmptyState
                result={apiKeys}
                emptyMessage={t("dashboard.noApiKeys")}
              />
            )}
          </DashboardPanelContent>
        </Card>

        <DashboardSidebarCard
          title={t("dashboard.createApiKeyTitle")}
          description={workspaceScope.label}
          icon={<KeyRoundIcon className="size-4 text-muted-foreground" />}
        >
          <CreateAPIKeyForm workspaceId={activeWorkspace?.id} />
        </DashboardSidebarCard>
      </div>
    </section>
  )
}

function ModelsSection({
  t,
  activeWorkspace,
  modelCatalogs,
  modelCatalogList,
}: DashboardSectionContentProps) {
  const workspaceScope = getWorkspaceScope(activeWorkspace, t)
  const activeModelCount = modelCatalogList.filter(
    (modelCatalog) => modelCatalog.status === "active"
  ).length

  return (
    <section className="grid gap-3">
      <Card id="models">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<BotIcon className="size-4" />}
            label={t("dashboard.modelsTitle")}
            value={String(activeModelCount)}
            detail={getSettledMessage(modelCatalogs, t("dashboard.activeModels"))}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Card>
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.modelsTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>{String(modelCatalogList.length)}</StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {modelCatalogs.ok && modelCatalogList.length > 0 ? (
              <DashboardTableList
                className="xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto]"
                columns={[
                  { label: t("dashboard.name") },
                  { label: t("forms.provider") },
                  { label: t("dashboard.createdAt") },
                  {
                    label: t("dashboard.actions"),
                    className: "text-right",
                  },
                ]}
              >
                {modelCatalogList.map((modelCatalog) => (
                  <ModelCatalogRow
                    key={modelCatalog.id}
                    modelCatalog={modelCatalog}
                    t={t}
                  />
                ))}
              </DashboardTableList>
            ) : (
              <DashboardSettledEmptyState
                result={modelCatalogs}
                emptyMessage={t("dashboard.noModels")}
                icon={<BotIcon />}
              />
            )}
          </DashboardPanelContent>
        </Card>

        <DashboardSidebarCard
          title={t("forms.createModel")}
          description={workspaceScope.label}
          icon={<BotIcon className="size-4 text-muted-foreground" />}
        >
          <CreateModelCatalogForm workspaceId={activeWorkspace?.id} />
        </DashboardSidebarCard>
      </div>
    </section>
  )
}

function CredentialsSection({
  t,
  activeWorkspace,
  providerCredentials,
  providerCredentialList,
}: DashboardSectionContentProps) {
  const workspaceScope = getWorkspaceScope(activeWorkspace, t)
  const activeCredentialCount = providerCredentialList.filter(
    (credential) => credential.status === "active"
  ).length

  return (
    <section className="grid gap-3">
      <Card id="credentials">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<KeyRoundIcon className="size-4" />}
            label={t("dashboard.credentialsTitle")}
            value={String(activeCredentialCount)}
            detail={getSettledMessage(
              providerCredentials,
              t("dashboard.credentialsDescription")
            )}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Card>
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.credentialsTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>{String(providerCredentialList.length)}</StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {providerCredentials.ok && providerCredentialList.length > 0 ? (
              <DashboardTableList
                className="xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto]"
                columns={[
                  { label: t("dashboard.name") },
                  { label: t("forms.provider") },
                  { label: t("dashboard.createdAt") },
                  {
                    label: t("dashboard.actions"),
                    className: "text-right",
                  },
                ]}
              >
                {providerCredentialList.map((credential) => (
                  <ProviderCredentialRow
                    key={credential.id}
                    credential={credential}
                    t={t}
                  />
                ))}
              </DashboardTableList>
            ) : (
              <DashboardSettledEmptyState
                result={providerCredentials}
                emptyMessage={t("dashboard.noCredentials")}
                icon={<KeyRoundIcon />}
              />
            )}
          </DashboardPanelContent>
        </Card>

        <DashboardSidebarCard
          title={t("forms.createCredential")}
          description={workspaceScope.label}
          icon={<KeyRoundIcon className="size-4 text-muted-foreground" />}
        >
          <CreateProviderCredentialForm workspaceId={activeWorkspace?.id} />
        </DashboardSidebarCard>
      </div>
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
  const workspaceScope = getWorkspaceScope(activeWorkspace, t)
  const activeDeploymentCount = modelDeploymentList.filter(
    (deployment) => deployment.status === "active"
  ).length

  return (
    <section className="grid gap-3">
      <Card id="deployments">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<ShieldCheckIcon className="size-4" />}
            label={t("dashboard.deploymentsTitle")}
            value={String(activeDeploymentCount)}
            detail={getSettledMessage(
              modelDeployments,
              t("dashboard.deploymentsDescription")
            )}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Card>
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.deploymentsTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>{String(modelDeploymentList.length)}</StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {modelDeployments.ok && modelDeploymentList.length > 0 ? (
              <DashboardTableList
                className="xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.9fr)_minmax(14rem,1fr)_auto]"
                columns={[
                  { label: t("dashboard.name") },
                  { label: t("forms.model") },
                  { label: t("dashboard.region") },
                  {
                    label: t("dashboard.actions"),
                    className: "text-right",
                  },
                ]}
              >
                {modelDeploymentList.map((deployment) => (
                  <ModelDeploymentRow
                    key={deployment.id}
                    deployment={deployment}
                    modelCatalogs={modelCatalogList}
                    providerCredentials={providerCredentialList}
                    t={t}
                  />
                ))}
              </DashboardTableList>
            ) : (
              <DashboardSettledEmptyState
                result={modelDeployments}
                emptyMessage={t("dashboard.noDeployments")}
                icon={<ShieldCheckIcon />}
              />
            )}
          </DashboardPanelContent>
        </Card>

        <DashboardSidebarCard
          title={t("forms.createDeployment")}
          description={workspaceScope.label}
          icon={<ShieldCheckIcon className="size-4 text-muted-foreground" />}
        >
          <CreateModelDeploymentForm
            workspaceId={activeWorkspace?.id}
            modelCatalogs={modelCatalogList}
            providerCredentials={providerCredentialList}
          />
        </DashboardSidebarCard>
      </div>
    </section>
  )
}

function ChatSmokeSection({
  t,
  activeWorkspace,
  chatSmokeModel,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-3">
      <Card id="chat-smoke">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<MessageSquareTextIcon className="size-4" />}
            label={t("dashboard.chatSmokeTitle")}
            value={chatSmokeModel}
            detail={t("forms.model")}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>

      <Card>
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.chatSmokeTitle")}</CardTitle>
          <CardDescription>{t("dashboard.chatSmokeDescription")}</CardDescription>
        </DashboardPanelHeader>
        <DashboardPanelContent>
          <ChatSmokeTestForm defaultModel={chatSmokeModel} />
        </DashboardPanelContent>
      </Card>
    </section>
  )
}

function UsageSection({ t, dailyUsage }: DashboardSectionContentProps) {
  return (
    <section className="grid gap-3">
      <Card id="usage">
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.dailyUsageTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.dailyUsageDescription")}
          </CardDescription>
        </DashboardPanelHeader>
        <DashboardStackContent>
          {dailyUsage.ok && dailyUsage.data.data.length > 0 ? (
            dailyUsage.data.data.slice(0, 6).map((usage) => (
              <DashboardRow
                key={usage.usage_date}
                className="gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <DashboardMonoDetailText className="font-medium text-foreground/80">
                    {usage.usage_date}
                  </DashboardMonoDetailText>
                  <DashboardDetailText>
                    {t("dashboard.requestsTokens", {
                      requests: usage.request_count,
                      tokens: usage.prompt_tokens + usage.completion_tokens,
                    })}
                  </DashboardDetailText>
                </div>
                <DashboardMonoDetailText className="font-medium text-foreground/80 md:text-right">
                  ${usage.spend_usd}
                </DashboardMonoDetailText>
              </DashboardRow>
            ))
          ) : (
            <DashboardSettledEmptyState
              result={dailyUsage}
              emptyMessage={t("dashboard.noDailyUsage")}
            />
          )}
        </DashboardStackContent>
      </Card>
    </section>
  )
}
