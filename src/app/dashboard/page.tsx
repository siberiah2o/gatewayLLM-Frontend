import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import {
  ChatSmokeTestForm,
  CreateAPIKeyForm,
  CreateModelCatalogForm,
  CreateModelDeploymentForm,
  CreateProviderCredentialForm,
  CreateWorkspaceForm,
  CreateWorkspaceUserForm,
  DeactivateModelCatalogButton,
  DeactivateModelDeploymentButton,
  DeactivateProviderCredentialButton,
  EditModelDeploymentDialog,
  RemoveWorkspaceMemberButton,
  ReviewRegistrationRequestActions,
  RevokeAPIKeyButton,
  UpdateWorkspaceMemberForm,
} from "@/components/dashboard-actions"
import { LanguageSwitcher } from "@/components/language-switcher"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  GatewayAPIError,
  errorMessage,
  gatewayBaseURL,
  gatewayRequest,
  type APIKeyList,
  type Balance,
  type DailyUsageList,
  type HealthResponse,
  type MeResponse,
  type ModelCatalog,
  type ModelCatalogList,
  type ModelDeployment,
  type ModelDeploymentList,
  type ProviderCredential,
  type ProviderCredentialList,
  type ReadyResponse,
  type RegistrationRequest,
  type RegistrationRequestList,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceMemberList,
  type WorkspaceList,
} from "@/lib/gatewayllm"
import { normalizeLocale, translate } from "@/lib/i18n"
import { getSessionToken } from "@/lib/session"

type Translator = (
  key: string,
  values?: Record<string, string | number>
) => string

export default async function Page() {
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

  const [health, ready, workspaces] = await Promise.all([
    settle(gatewayRequest<HealthResponse>("/healthz")),
    settle(gatewayRequest<ReadyResponse>("/readyz")),
    settle(
      gatewayRequest<WorkspaceList>("/control/v1/me/workspaces?limit=20", {
        token,
      })
    ),
  ])

  const workspaceList = workspaces.ok ? workspaces.data.data : []
  const activeWorkspace = workspaceList[0]

  const [
    balance,
    apiKeys,
    dailyUsage,
    workspaceMembers,
    registrationRequests,
    modelCatalogs,
    providerCredentials,
    modelDeployments,
  ] = activeWorkspace
    ? await Promise.all([
        settle(
          gatewayRequest<Balance>(
            `/control/v1/me/balance?workspace_id=${encodeURIComponent(
              activeWorkspace.id
            )}`,
            { token }
          )
        ),
        settle(
          gatewayRequest<APIKeyList>(
            `/control/v1/me/api-keys?workspace_id=${encodeURIComponent(
              activeWorkspace.id
            )}&status=active&limit=20`,
            { token }
          )
        ),
        settle(
          gatewayRequest<DailyUsageList>(
            `/control/v1/me/daily-usage?workspace_id=${encodeURIComponent(
              activeWorkspace.id
            )}&days=30`,
            { token }
          )
        ),
        settle(
          gatewayRequest<WorkspaceMemberList>(
            `/control/v1/workspaces/${encodeURIComponent(
              activeWorkspace.id
            )}/members?limit=20`,
            { token }
          )
        ),
        settle(
          gatewayRequest<RegistrationRequestList>(
            `/control/v1/workspaces/${encodeURIComponent(
              activeWorkspace.id
            )}/registration-requests?status=pending&limit=20`,
            { token }
          )
        ),
        settle(
          gatewayRequest<ModelCatalogList>(
            `/control/v1/model-catalogs?workspace_id=${encodeURIComponent(
              activeWorkspace.id
            )}&status=active&limit=20`,
            { token }
          )
        ),
        settle(
          gatewayRequest<ProviderCredentialList>(
            `/control/v1/provider-credentials?workspace_id=${encodeURIComponent(
              activeWorkspace.id
            )}&status=active&limit=20`,
            { token }
          )
        ),
        settle(
          gatewayRequest<ModelDeploymentList>(
            `/control/v1/model-deployments?workspace_id=${encodeURIComponent(
              activeWorkspace.id
            )}&status=active&limit=20`,
            { token }
          )
        ),
      ])
    : [
        { ok: false as const, error: t("dashboard.noWorkspaceAvailable") },
        { ok: false as const, error: t("dashboard.noWorkspaceAvailable") },
        { ok: false as const, error: t("dashboard.noWorkspaceAvailable") },
        { ok: false as const, error: t("dashboard.noWorkspaceAvailable") },
        { ok: false as const, error: t("dashboard.noWorkspaceAvailable") },
        { ok: false as const, error: t("dashboard.noWorkspaceAvailable") },
        { ok: false as const, error: t("dashboard.noWorkspaceAvailable") },
        { ok: false as const, error: t("dashboard.noWorkspaceAvailable") },
      ]

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

  return (
    <SidebarProvider>
      <AppSidebar user={me.user} workspaces={workspaceList} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full min-w-0 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <div className="min-w-0">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">GatewayLLM</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{t("dashboard.title")}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="truncate text-xs leading-tight text-muted-foreground">
                  {t("dashboard.connectedTo", { url: gatewayBaseURL() })}
                </div>
              </div>
            </div>
            <LanguageSwitcher className="shrink-0" />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">
          <section
            id="status"
            className="grid auto-rows-min gap-4 md:grid-cols-3 xl:grid-cols-7"
          >
            <MetricCard
              label={t("dashboard.httpServer")}
              value={
                health.ok
                  ? localizeValue(t, health.data.status)
                  : t("dashboard.offline")
              }
              detail={health.ok ? health.data.service : health.error}
            />
            <MetricCard
              label={t("dashboard.readiness")}
              value={
                ready.ok
                  ? localizeValue(t, ready.data.status)
                  : t("dashboard.unknown")
              }
              detail={ready.ok ? "readyz" : ready.error}
            />
            <MetricCard
              label={t("dashboard.workspaces")}
              value={String(workspaceList.length)}
              detail={
                workspaces.ok ? t("dashboard.visibleToSession") : workspaces.error
              }
            />
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
            <MetricCard
              label={t("dashboard.members")}
              value={
                workspaceMembers.ok
                  ? String(workspaceMembers.data.data.length)
                  : "0"
              }
              detail={
                workspaceMembers.ok
                  ? t("dashboard.workspaceMembers")
                  : workspaceMembers.error
              }
            />
            <MetricCard
              label={t("dashboard.deployments")}
              value={
                modelDeployments.ok
                  ? String(modelDeployments.data.data.length)
                  : "0"
              }
              detail={
                modelDeployments.ok
                  ? t("dashboard.activeModels")
                  : modelDeployments.error
              }
            />
            <MetricCard
              label={t("dashboard.monthSpend")}
              value={
                balance.ok ? `$${balance.data.month_to_date_spend_usd}` : "$0"
              }
              detail={balance.ok ? t("dashboard.monthToDate") : balance.error}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <Card id="workspaces">
              <CardHeader>
                <CardTitle>{t("dashboard.workspaces")}</CardTitle>
                <CardDescription>
                  {t("dashboard.workspacesDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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

            <Card id="account">
              <CardHeader>
                <CardTitle>{t("dashboard.signedInUser")}</CardTitle>
                <CardDescription>{me.user.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow
                  label={t("dashboard.name")}
                  value={me.user.display_name || t("dashboard.notSet")}
                />
                <InfoRow
                  label={t("nav.status")}
                  value={
                    me.user.status
                      ? localizeValue(t, me.user.status)
                      : t("dashboard.notSet")
                  }
                />
                <InfoRow
                  label={t("dashboard.email")}
                  value={
                    me.user.email_verified
                      ? t("dashboard.verified")
                      : localizeValue(
                          t,
                          me.user.email_verification_status ?? "unverified"
                        )
                  }
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card id="members">
              <CardHeader>
                <CardTitle>{t("dashboard.membersTitle")}</CardTitle>
                <CardDescription>
                  {t("dashboard.membersDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <CreateWorkspaceUserForm workspaceId={activeWorkspace?.id} />
                {workspaceMembers.ok && workspaceMemberList.length > 0 ? (
                  workspaceMemberList.map((member) => (
                    <WorkspaceMemberRow
                      key={member.user_id}
                      member={member}
                      workspaceId={activeWorkspace?.id}
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

            <Card id="registration">
              <CardHeader>
                <CardTitle>{t("dashboard.registrationTitle")}</CardTitle>
                <CardDescription>
                  {t("dashboard.registrationDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {registrationRequests.ok &&
                registrationRequests.data.data.length > 0 ? (
                  registrationRequests.data.data.map((request) => (
                    <RegistrationRequestRow
                      key={request.id}
                      request={request}
                    />
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

            <Card id="api-keys">
              <CardHeader>
                <CardTitle>{t("dashboard.apiKeysTitle")}</CardTitle>
                <CardDescription>
                  {t("dashboard.apiKeysDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
                    message={
                      apiKeys.ok ? t("dashboard.noApiKeys") : apiKeys.error
                    }
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card id="models">
              <CardHeader>
                <CardTitle>{t("dashboard.modelsTitle")}</CardTitle>
                <CardDescription>
                  {t("dashboard.modelsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
                      modelCatalogs.ok
                        ? t("dashboard.noModels")
                        : modelCatalogs.error
                    }
                  />
                )}
              </CardContent>
            </Card>

            <Card id="credentials">
              <CardHeader>
                <CardTitle>{t("dashboard.credentialsTitle")}</CardTitle>
                <CardDescription>
                  {t("dashboard.credentialsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <CreateProviderCredentialForm
                  workspaceId={activeWorkspace?.id}
                />
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

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card id="deployments">
              <CardHeader>
                <CardTitle>{t("dashboard.deploymentsTitle")}</CardTitle>
                <CardDescription>
                  {t("dashboard.deploymentsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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

          <section className="grid gap-4">
            <Card id="usage">
              <CardHeader>
                <CardTitle>{t("dashboard.dailyUsageTitle")}</CardTitle>
                <CardDescription>
                  {t("dashboard.dailyUsageDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
                            tokens:
                              usage.prompt_tokens + usage.completion_tokens,
                          })}
                        </div>
                      </div>
                      <div className="font-medium">${usage.spend_usd}</div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    message={
                      dailyUsage.ok
                        ? t("dashboard.noDailyUsage")
                        : dailyUsage.error
                    }
                  />
                )}
              </CardContent>
            </Card>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function WorkspaceMemberRow({
  member,
  workspaceId,
  t,
}: {
  member: WorkspaceMember
  workspaceId?: string
  t: Translator
}) {
  const isOwner = member.role === "owner"

  return (
    <div className="grid gap-3 rounded-lg border p-3 text-sm xl:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="truncate font-medium">{member.display_name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {member.email}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {member.user_id}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge>{localizeValue(t, member.role)}</StatusBadge>
          <StatusBadge>{localizeValue(t, member.status)}</StatusBadge>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        {isOwner ? (
          <div className="text-xs text-muted-foreground">
            {t("dashboard.protectedOwner")}
          </div>
        ) : (
          <>
            <UpdateWorkspaceMemberForm
              workspaceId={workspaceId}
              member={member}
            />
            <RemoveWorkspaceMemberButton
              workspaceId={workspaceId}
              userId={member.user_id}
            />
          </>
        )}
      </div>
    </div>
  )
}

function ModelCatalogRow({
  modelCatalog,
  t,
}: {
  modelCatalog: ModelCatalog
  t: Translator
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0">
        <div className="truncate font-medium">{modelCatalog.canonical_name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {modelCatalog.provider} - {modelCatalog.id}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge>{localizeValue(t, modelCatalog.status)}</StatusBadge>
        <DeactivateModelCatalogButton
          modelCatalogID={modelCatalog.id}
          disabled={modelCatalog.status !== "active"}
        />
      </div>
    </div>
  )
}

function ProviderCredentialRow({
  credential,
  t,
}: {
  credential: ProviderCredential
  t: Translator
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0">
        <div className="truncate font-medium">{credential.credential_name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {credential.provider} - {credential.id}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge>
          {credential.secret_configured
            ? localizeValue(t, credential.status)
            : t("dashboard.missingSecret")}
        </StatusBadge>
        <DeactivateProviderCredentialButton
          credentialID={credential.id}
          disabled={credential.status !== "active"}
        />
      </div>
    </div>
  )
}

function ModelDeploymentRow({
  deployment,
  modelCatalogs,
  providerCredentials,
  t,
}: {
  deployment: ModelDeployment
  modelCatalogs: ModelCatalog[]
  providerCredentials: ProviderCredential[]
  t: Translator
}) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{deployment.deployment_name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {deployment.model_canonical_name} {t("dashboard.via")}{" "}
            {deployment.credential_name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge>{localizeValue(t, deployment.status)}</StatusBadge>
          <EditModelDeploymentDialog
            deployment={deployment}
            modelCatalogs={modelCatalogs}
            providerCredentials={providerCredentials}
          />
          <DeactivateModelDeploymentButton
            deploymentID={deployment.id}
            disabled={deployment.status !== "active"}
          />
        </div>
      </div>
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="truncate">
          {t("dashboard.region")}: {deployment.region}
        </div>
        <div className="truncate">
          {t("dashboard.priority")}: {deployment.priority}
        </div>
        <div className="truncate">
          {t("dashboard.weight")}: {deployment.weight}
        </div>
      </div>
      <div className="mt-1 truncate text-xs text-muted-foreground">
        {deployment.endpoint_url}
      </div>
    </div>
  )
}

function RegistrationRequestRow({
  request,
}: {
  request: RegistrationRequest
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0">
        <div className="truncate font-medium">{request.display_name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {request.email}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {request.id}
        </div>
      </div>
      <ReviewRegistrationRequestActions request={request} />
    </div>
  )
}

type Settled<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: string
    }

async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return {
      ok: true,
      data: await promise,
    }
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error),
    }
  }
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="truncate text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  )
}

function WorkspaceRow({
  workspace,
  t,
}: {
  workspace: Workspace
  t: Translator
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-3 text-sm md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="truncate font-medium">{workspace.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {workspace.id}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge>{localizeValue(t, workspace.status)}</StatusBadge>
        <span className="text-xs text-muted-foreground">
          {workspace.billing_currency}
        </span>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium">
      {children}
    </span>
  )
}

function localizeValue(t: Translator, value: string) {
  const key = `values.${value.toLowerCase().replaceAll(" ", "_")}`
  const translated = t(key)

  return translated === key ? value : translated
}
