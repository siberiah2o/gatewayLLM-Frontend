import { CreateAPIKeyForm } from "@/components/dashboard-actions/api-keys";
import { ChatSmokeTestForm } from "@/components/dashboard-actions/chat-smoke";
import { CreateModelDeploymentForm } from "@/components/dashboard-actions/deployments";
import {
  CreateModelCatalogForm,
  CreateProviderCredentialForm,
  CreateProviderSetupForm,
} from "@/components/dashboard-actions/model-registry";
import {
  CreateWorkspaceForm,
  CreateWorkspaceUserDialog,
} from "@/components/dashboard-actions/workspace";
import {
  Card,
  CardAction,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  BotIcon,
  ClipboardListIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersRoundIcon,
} from "lucide-react";
import type { ReactNode } from "react";
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
} from "./dashboard-ui";
import {
  APIKeyRow,
  ModelCatalogRow,
  ModelDeploymentRow,
  ProviderCredentialRow,
  ProviderSetupRow,
  RegistrationRequestRow,
  WorkspaceMemberRow,
} from "./dashboard-rows";
import { AccountSection } from "./dashboard-account-section";
import { AdvancedResourceTabs } from "./advanced-resource-tabs";
import type { Settled } from "./dashboard-data";
import { ModelAccessTabs } from "./model-access-tabs";
import type { DashboardSectionContentProps } from "./dashboard-section-types";
import { WorkspaceUsersTable } from "./workspace-user-row";

export function DashboardSectionContent(props: DashboardSectionContentProps) {
  switch (props.section) {
    case "status":
      return <StatusSection {...props} />;
    case "usage":
      return <UsageSection {...props} />;
    case "workspaces":
      return <WorkspacesSection {...props} />;
    case "account":
      return <AccountSection {...props} />;
    case "users":
      return <UsersSection {...props} />;
    case "members":
      return <MembersSection {...props} />;
    case "registration":
      return <RegistrationSection {...props} />;
    case "api-keys":
      return <ApiKeysSection {...props} />;
    case "provider-setups":
      return <ProviderSetupsSection {...props} />;
    case "advanced":
      return <AdvancedSection {...props} />;
    case "models":
      return <ModelsSection {...props} />;
    case "credentials":
      return <CredentialsSection {...props} />;
    case "deployments":
      return <DeploymentsSection {...props} />;
    case "chat-smoke":
      return <ChatSmokeSection {...props} />;
  }
}

function getSettledMessage<T>(result: Settled<T>, successMessage: string) {
  return result.ok ? successMessage : result.error;
}

function getCountLabel(
  count: number,
  pagination: DashboardSectionContentProps["tablePagination"][string],
) {
  if (!pagination) {
    return String(count);
  }

  const loadedCount = pagination.offset + count;

  return pagination.hasNext ? `${loadedCount}+` : String(loadedCount);
}

function DashboardSettledMetric<T>({
  label,
  result,
  value,
  detail,
  fallbackValue,
}: {
  label: string;
  result: Settled<T>;
  value: (data: T) => string;
  detail: string | ((data: T) => string);
  fallbackValue: string;
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
  );
}

function DashboardSettledEmptyState<T>({
  result,
  emptyMessage,
  icon,
}: {
  result: Settled<T>;
  emptyMessage: string;
  icon?: ReactNode;
}) {
  return (
    <EmptyState message={getSettledMessage(result, emptyMessage)} icon={icon} />
  );
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
          value={(data) =>
            String(
              data.data.filter((deployment) => deployment.status === "active")
                .length,
            )
          }
          detail={t("dashboard.activeDeployments")}
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
  );
}

function WorkspacesSection({ t, workspaceList }: DashboardSectionContentProps) {
  return (
    <section className="grid gap-3">
      <Card id="workspaces">
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.workspaces")}</CardTitle>
          <CardDescription>
            {t("dashboard.workspacesDescription")}
          </CardDescription>
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
  );
}

function UsersSection({
  t,
  activeWorkspace,
  workspaceUsers,
  workspaceUserList,
  tablePagination,
}: DashboardSectionContentProps) {
  const workspaceScope = getWorkspaceScope(activeWorkspace, t);

  return (
    <section className="grid gap-3">
      <Card id="users">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<UsersRoundIcon className="size-4" />}
            label={t("dashboard.users")}
            value={String(workspaceUserList.length)}
            detail={getSettledMessage(
              workspaceUsers,
              t("dashboard.workspaceUsers"),
            )}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.usersTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>
                {getCountLabel(
                  workspaceUserList.length,
                  tablePagination.workspace_users,
                )}
              </StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {workspaceUsers.ok &&
            (workspaceUserList.length > 0 ||
              tablePagination.workspace_users) ? (
              <WorkspaceUsersTable
                users={workspaceUserList}
                workspaceId={activeWorkspace?.id}
                pagination={tablePagination.workspace_users}
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
  );
}

function MembersSection({
  t,
  activeWorkspace,
  workspaceMembers,
  workspaceMemberList,
  modelCatalogList,
  tablePagination,
}: DashboardSectionContentProps) {
  const assignableModelCatalogList = modelCatalogList.filter(
    (modelCatalog) => modelCatalog.status === "active",
  );
  const activeMemberCount = workspaceMemberList.filter(
    (member) => member.status === "active",
  ).length;

  return (
    <section className="grid gap-3">
      <Card id="members">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<UserCheckIcon className="size-4" />}
            label={t("dashboard.members")}
            value={String(activeMemberCount)}
            detail={getSettledMessage(
              workspaceMembers,
              t("dashboard.workspaceMembers"),
            )}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>
      <Card>
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.membersTitle")}</CardTitle>
          <CardAction>
            <StatusBadge>
              {getCountLabel(
                workspaceMemberList.length,
                tablePagination.members,
              )}
            </StatusBadge>
          </CardAction>
        </DashboardPanelHeader>
        <DashboardPanelContent>
          {workspaceMembers.ok &&
          (workspaceMemberList.length > 0 || tablePagination.members) ? (
            <DashboardTableList
              className="xl:grid-cols-[minmax(12rem,1fr)_5rem_minmax(12rem,0.7fr)_minmax(26rem,1fr)]"
              paginationId="members"
              pagination={tablePagination.members}
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
                  modelCatalogs={assignableModelCatalogList}
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
  );
}

function RegistrationSection({
  t,
  activeWorkspace,
  registrationRequests,
}: DashboardSectionContentProps) {
  const registrationRequestList = registrationRequests.ok
    ? registrationRequests.data.data
    : [];

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
              t("dashboard.registrationRequests"),
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
              paginationId="registration"
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
  );
}

function ApiKeysSection({
  t,
  activeWorkspace,
  apiKeys,
  tablePagination,
}: DashboardSectionContentProps) {
  const apiKeyList = apiKeys.ok ? apiKeys.data.data : [];
  const activeKeyCount = apiKeyList.filter(
    (apiKey) => apiKey.status === "active",
  ).length;
  const workspaceScope = getWorkspaceScope(activeWorkspace, t);

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
              <StatusBadge>
                {getCountLabel(apiKeyList.length, tablePagination.api_keys)}
              </StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {apiKeyList.length > 0 || tablePagination.api_keys ? (
              <DashboardTableList
                className="xl:grid-cols-[minmax(10rem,0.95fr)_minmax(0,1.2fr)_minmax(12rem,0.95fr)_minmax(10rem,0.85fr)_auto]"
                paginationId="api_keys"
                pagination={tablePagination.api_keys}
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
  );
}

function ProviderSetupsSection({
  t,
  activeWorkspace,
  providerSetups,
  providerSetupList,
  tablePagination,
}: DashboardSectionContentProps) {
  const workspaceScope = getWorkspaceScope(activeWorkspace, t);
  const providerSetupCount = getCountLabel(
    providerSetupList.length,
    tablePagination.provider_setups,
  );

  return (
    <section className="grid gap-3">
      <ModelAccessTabs
        ariaLabel={t("dashboard.providerSetupsTitle")}
        labels={{
          "all-models": t("dashboard.allModelsTab"),
          "add-model": t("dashboard.addModelTab"),
        }}
        allModelsCount={providerSetupCount}
        allModels={
          <Card className="min-w-0">
            <DashboardPanelHeader>
              <CardTitle>{t("dashboard.allModelsTab")}</CardTitle>
              <CardDescription>
                {t("dashboard.providerSetupsDescription")}
              </CardDescription>
            </DashboardPanelHeader>
            <DashboardPanelContent>
              {providerSetups.ok &&
              (providerSetupList.length > 0 ||
                tablePagination.provider_setups) ? (
                <DashboardTableList
                  className="xl:grid-cols-[minmax(6.5rem,0.8fr)_minmax(7rem,0.9fr)_minmax(0,1.1fr)_minmax(7.25rem,0.75fr)_auto]"
                  paginationId="provider_setups"
                  pagination={tablePagination.provider_setups}
                  columns={[
                    { label: t("forms.provider") },
                    { label: t("forms.modelRoute") },
                    { label: t("forms.endpointUrl") },
                    { label: t("dashboard.updatedAt") },
                    {
                      label: t("dashboard.actions"),
                      className: "text-right",
                    },
                  ]}
                >
                  {providerSetupList.map((setup) => (
                    <ProviderSetupRow key={setup.id} setup={setup} t={t} />
                  ))}
                </DashboardTableList>
              ) : (
                <DashboardSettledEmptyState
                  result={providerSetups}
                  emptyMessage={t("dashboard.noProviderSetups")}
                  icon={<BotIcon />}
                />
              )}
            </DashboardPanelContent>
          </Card>
        }
        addModel={
          <DashboardSidebarCard
            title={t("forms.createProviderSetup")}
            description={workspaceScope.label}
            icon={<BotIcon className="size-4 text-muted-foreground" />}
          >
            <CreateProviderSetupForm workspaceId={activeWorkspace?.id} />
          </DashboardSidebarCard>
        }
      />
    </section>
  );
}

function AdvancedSection(props: DashboardSectionContentProps) {
  return (
    <AdvancedResourceTabs
      ariaLabel={props.t("nav.advanced")}
      labels={{
        models: props.t("dashboard.modelsTitle"),
        credentials: props.t("dashboard.credentialsTitle"),
        deployments: props.t("dashboard.deploymentsTitle"),
      }}
      counts={{
        models: getCountLabel(
          props.modelCatalogList.length,
          props.tablePagination.model_catalogs,
        ),
        credentials: getCountLabel(
          props.providerCredentialList.length,
          props.tablePagination.provider_credentials,
        ),
        deployments: getCountLabel(
          props.modelDeploymentList.length,
          props.tablePagination.model_deployments,
        ),
      }}
      models={
        <ModelsSection
          {...props}
          showSummary={false}
          showCreateForm={false}
          showActions={false}
        />
      }
      credentials={
        <CredentialsSection
          {...props}
          showSummary={false}
          showCreateForm={false}
          showActions={false}
        />
      }
      deployments={
        <DeploymentsSection
          {...props}
          showSummary={false}
          showCreateForm={false}
          showActions={false}
        />
      }
    />
  );
}

type AdvancedResourceSectionOptions = {
  showSummary?: boolean;
  showCreateForm?: boolean;
  showActions?: boolean;
};

function ModelsSection({
  t,
  activeWorkspace,
  modelCatalogs,
  modelCatalogList,
  tablePagination,
  showSummary = true,
  showCreateForm = true,
  showActions = true,
}: DashboardSectionContentProps & AdvancedResourceSectionOptions) {
  const workspaceScope = showCreateForm
    ? getWorkspaceScope(activeWorkspace, t)
    : undefined;
  const activeModelCount = showSummary
    ? modelCatalogList.filter(
        (modelCatalog) => modelCatalog.status === "active",
      ).length
    : 0;

  return (
    <section className="grid gap-3">
      {showSummary ? (
        <Card id="models">
          <DashboardSummaryGrid>
            <DashboardSummaryTile
              icon={<BotIcon className="size-4" />}
              label={t("dashboard.modelsTitle")}
              value={String(activeModelCount)}
              detail={getSettledMessage(
                modelCatalogs,
                t("dashboard.activeModels"),
              )}
            />
            <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
          </DashboardSummaryGrid>
        </Card>
      ) : null}

      <div
        className={
          showCreateForm
            ? "grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]"
            : "grid gap-3"
        }
      >
        <Card className="min-w-0">
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.modelsTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>
                {getCountLabel(
                  modelCatalogList.length,
                  tablePagination.model_catalogs,
                )}
              </StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {modelCatalogs.ok &&
            (modelCatalogList.length > 0 || tablePagination.model_catalogs) ? (
              <DashboardTableList
                className={
                  showActions
                    ? "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto]"
                    : "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)]"
                }
                paginationId="model_catalogs"
                pagination={tablePagination.model_catalogs}
                columns={[
                  { label: t("dashboard.name") },
                  { label: t("forms.provider") },
                  { label: t("dashboard.createdAt") },
                  ...(showActions
                    ? [
                        {
                          label: t("dashboard.actions"),
                          className: "text-right",
                        },
                      ]
                    : []),
                ]}
              >
                {modelCatalogList.map((modelCatalog) => (
                  <ModelCatalogRow
                    key={modelCatalog.id}
                    modelCatalog={modelCatalog}
                    showActions={showActions}
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

        {showCreateForm ? (
          <DashboardSidebarCard
            title={t("forms.createModel")}
            description={workspaceScope?.label}
            icon={<BotIcon className="size-4 text-muted-foreground" />}
          >
            <CreateModelCatalogForm workspaceId={activeWorkspace?.id} />
          </DashboardSidebarCard>
        ) : null}
      </div>
    </section>
  );
}

function CredentialsSection({
  t,
  activeWorkspace,
  providerCredentials,
  providerCredentialList,
  tablePagination,
  showSummary = true,
  showCreateForm = true,
  showActions = true,
}: DashboardSectionContentProps & AdvancedResourceSectionOptions) {
  const workspaceScope = showCreateForm
    ? getWorkspaceScope(activeWorkspace, t)
    : undefined;
  const activeCredentialCount = showSummary
    ? providerCredentialList.filter(
        (credential) => credential.status === "active",
      ).length
    : 0;

  return (
    <section className="grid gap-3">
      {showSummary ? (
        <Card id="credentials">
          <DashboardSummaryGrid>
            <DashboardSummaryTile
              icon={<KeyRoundIcon className="size-4" />}
              label={t("dashboard.credentialsTitle")}
              value={String(activeCredentialCount)}
              detail={getSettledMessage(
                providerCredentials,
                t("dashboard.credentialsDescription"),
              )}
            />
            <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
          </DashboardSummaryGrid>
        </Card>
      ) : null}

      <div
        className={
          showCreateForm
            ? "grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]"
            : "grid gap-3"
        }
      >
        <Card className="min-w-0">
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.credentialsTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>
                {getCountLabel(
                  providerCredentialList.length,
                  tablePagination.provider_credentials,
                )}
              </StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {providerCredentials.ok &&
            (providerCredentialList.length > 0 ||
              tablePagination.provider_credentials) ? (
              <DashboardTableList
                className={
                  showActions
                    ? "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto]"
                    : "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)]"
                }
                paginationId="provider_credentials"
                pagination={tablePagination.provider_credentials}
                columns={[
                  { label: t("dashboard.name") },
                  { label: t("forms.provider") },
                  { label: t("dashboard.createdAt") },
                  ...(showActions
                    ? [
                        {
                          label: t("dashboard.actions"),
                          className: "text-right",
                        },
                      ]
                    : []),
                ]}
              >
                {providerCredentialList.map((credential) => (
                  <ProviderCredentialRow
                    key={credential.id}
                    credential={credential}
                    showActions={showActions}
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

        {showCreateForm ? (
          <DashboardSidebarCard
            title={t("forms.createCredential")}
            description={workspaceScope?.label}
            icon={<KeyRoundIcon className="size-4 text-muted-foreground" />}
          >
            <CreateProviderCredentialForm workspaceId={activeWorkspace?.id} />
          </DashboardSidebarCard>
        ) : null}
      </div>
    </section>
  );
}

function DeploymentsSection({
  t,
  activeWorkspace,
  modelDeployments,
  modelDeploymentList,
  modelCatalogList,
  providerCredentialList,
  tablePagination,
  showSummary = true,
  showCreateForm = true,
  showActions = true,
}: DashboardSectionContentProps & AdvancedResourceSectionOptions) {
  const activeModelCatalogList = showCreateForm
    ? modelCatalogList.filter(
        (modelCatalog) => modelCatalog.status === "active",
      )
    : [];
  const activeProviderCredentialList = showCreateForm
    ? providerCredentialList.filter(
        (credential) => credential.status === "active",
      )
    : [];
  const workspaceScope = showCreateForm
    ? getWorkspaceScope(activeWorkspace, t)
    : undefined;
  const activeDeploymentCount = showSummary
    ? modelDeploymentList.filter((deployment) => deployment.status === "active")
        .length
    : 0;

  return (
    <section className="grid gap-3">
      {showSummary ? (
        <Card id="deployments">
          <DashboardSummaryGrid>
            <DashboardSummaryTile
              icon={<ShieldCheckIcon className="size-4" />}
              label={t("dashboard.deploymentsTitle")}
              value={String(activeDeploymentCount)}
              detail={getSettledMessage(
                modelDeployments,
                t("dashboard.deploymentsDescription"),
              )}
            />
            <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
          </DashboardSummaryGrid>
        </Card>
      ) : null}

      <div
        className={
          showCreateForm
            ? "grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]"
            : "grid gap-3"
        }
      >
        <Card className="min-w-0">
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.deploymentsTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>
                {getCountLabel(
                  modelDeploymentList.length,
                  tablePagination.model_deployments,
                )}
              </StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {modelDeployments.ok &&
            (modelDeploymentList.length > 0 ||
              tablePagination.model_deployments) ? (
              <DashboardTableList
                className={
                  showActions
                    ? "xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.9fr)_minmax(14rem,1fr)_auto]"
                    : "xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.9fr)_minmax(14rem,1fr)]"
                }
                paginationId="model_deployments"
                pagination={tablePagination.model_deployments}
                columns={[
                  { label: t("dashboard.name") },
                  { label: t("forms.model") },
                  { label: t("dashboard.region") },
                  ...(showActions
                    ? [
                        {
                          label: t("dashboard.actions"),
                          className: "text-right",
                        },
                      ]
                    : []),
                ]}
              >
                {modelDeploymentList.map((deployment) => (
                  <ModelDeploymentRow
                    key={deployment.id}
                    deployment={deployment}
                    modelCatalogs={modelCatalogList}
                    providerCredentials={providerCredentialList}
                    showActions={showActions}
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

        {showCreateForm ? (
          <DashboardSidebarCard
            title={t("forms.createDeployment")}
            description={workspaceScope?.label}
            icon={<ShieldCheckIcon className="size-4 text-muted-foreground" />}
          >
            <CreateModelDeploymentForm
              workspaceId={activeWorkspace?.id}
              modelCatalogs={activeModelCatalogList}
              providerCredentials={activeProviderCredentialList}
            />
          </DashboardSidebarCard>
        ) : null}
      </div>
    </section>
  );
}

function ChatSmokeSection({
  chatSmokeModel,
  apiKeys,
  modelCatalogList,
  modelDeploymentList,
}: DashboardSectionContentProps) {
  const modelSuggestions = [
    ...new Set(
      [
        ...modelDeploymentList
          .filter((deployment) => deployment.status === "active")
          .map((deployment) => deployment.model_canonical_name),
        ...modelCatalogList
          .filter((modelCatalog) => modelCatalog.status === "active")
          .map((modelCatalog) => modelCatalog.canonical_name),
      ].filter(Boolean),
    ),
  ];
  const apiKeyOptions = apiKeys.ok
    ? apiKeys.data.data.filter((apiKey) => apiKey.status === "active")
    : [];

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatSmokeTestForm
        defaultModel={chatSmokeModel}
        apiKeys={apiKeyOptions}
        modelSuggestions={modelSuggestions}
      />
    </section>
  );
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
  );
}
