import {
  DeactivateModelCatalogButton,
  DeactivateModelDeploymentButton,
  DeactivateProviderCredentialButton,
  EditModelDeploymentDialog,
  ManageModelPermissionsDialog,
  RevokeAPIKeyButton,
  RemoveWorkspaceMemberButton,
  ReviewRegistrationRequestActions,
  UpdateWorkspaceMemberForm,
  ViewAPIKeyDialog,
} from "@/components/dashboard-actions"
import type {
  APIKey,
  ModelCatalog,
  ModelDeployment,
  ProviderCredential,
  RegistrationRequest,
  WorkspaceMember,
} from "@/lib/gatewayllm"
import {
  DashboardActionCell,
  DashboardDetailText,
  DashboardMonoDetailText,
  DashboardPrimaryCell,
  DashboardRow,
  DashboardRowMeta,
  StatusBadge,
  localizeValue,
  type Translator,
} from "./dashboard-ui"

export function WorkspaceMemberRow({
  member,
  workspaceId,
  modelCatalogs,
  t,
}: {
  member: WorkspaceMember
  workspaceId?: string
  modelCatalogs: ModelCatalog[]
  t: Translator
}) {
  const isOwner = member.role === "owner"

  return (
    <DashboardRow className="xl:grid-cols-[minmax(12rem,1fr)_5rem_minmax(12rem,0.7fr)_minmax(26rem,1fr)] xl:items-center">
      <DashboardPrimaryCell
        label={t("dashboard.name")}
        title={<div className="truncate font-medium">{member.display_name}</div>}
      >
        <DashboardDetailText>{member.email}</DashboardDetailText>
        <DashboardMonoDetailText>{member.user_id}</DashboardMonoDetailText>
      </DashboardPrimaryCell>
      <DashboardRowMeta label={t("forms.role")}>
        <StatusBadge>{localizeValue(t, member.role)}</StatusBadge>
      </DashboardRowMeta>
      <DashboardRowMeta label={t("nav.status")}>
        <StatusBadge>{localizeValue(t, member.status)}</StatusBadge>
        <DashboardMonoDetailText>
          {formatDashboardDate(member.created_at, t("dashboard.notSet"))}
        </DashboardMonoDetailText>
      </DashboardRowMeta>
      <DashboardActionCell
        label={t("dashboard.actions")}
        className="xl:flex-row xl:flex-wrap xl:items-center xl:justify-end"
      >
        {isOwner ? (
          <div className="px-1 text-xs text-muted-foreground">
            {t("dashboard.protectedOwner")}
          </div>
        ) : (
          <>
            <UpdateWorkspaceMemberForm workspaceId={workspaceId} member={member} />
            <ManageModelPermissionsDialog
              workspaceId={workspaceId}
              member={member}
              modelCatalogs={modelCatalogs}
            />
            <RemoveWorkspaceMemberButton
              workspaceId={workspaceId}
              userId={member.user_id}
            />
          </>
        )}
      </DashboardActionCell>
    </DashboardRow>
  )
}

export function APIKeyRow({
  apiKey,
  t,
}: {
  apiKey: APIKey
  t: Translator
}) {
  const displayName = apiKey.display_name?.trim() || t("dashboard.notSet")
  const status = localizeValue(t, apiKey.status)

  return (
    <DashboardRow className="xl:grid-cols-[minmax(10rem,0.95fr)_minmax(0,1.2fr)_minmax(12rem,0.95fr)_minmax(10rem,0.85fr)_auto] xl:items-center">
      <DashboardPrimaryCell
        label={t("dashboard.name")}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate font-medium">{displayName}</div>
            <StatusBadge>{status}</StatusBadge>
          </div>
        }
      >
        <DashboardDetailText>
          {t("dashboard.expiresAt")}{" "}
          <span className="font-mono tabular-nums">
            {formatDashboardDate(apiKey.expires_at, t("dashboard.noExpiration"))}
          </span>
        </DashboardDetailText>
      </DashboardPrimaryCell>
      <DashboardRowMeta label={t("dashboard.apiKeyId")}>
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
      </DashboardRowMeta>
      <DashboardRowMeta label={t("dashboard.createdAt")}>
        <DashboardMonoDetailText className="font-medium text-foreground/80">
          {formatDashboardDate(apiKey.created_at, t("dashboard.notSet"))}
        </DashboardMonoDetailText>
      </DashboardRowMeta>
      <DashboardRowMeta label={t("dashboard.lastUsedAt")}>
        <DashboardMonoDetailText className="font-medium text-foreground/80">
          {formatDashboardDate(apiKey.last_used_at, t("dashboard.neverUsed"))}
        </DashboardMonoDetailText>
      </DashboardRowMeta>
      <DashboardActionCell label={t("dashboard.actions")}>
        <RevokeAPIKeyButton
          apiKeyID={apiKey.id}
          disabled={apiKey.status !== "active"}
          className="items-start xl:items-end"
        />
      </DashboardActionCell>
    </DashboardRow>
  )
}

export function ModelCatalogRow({
  modelCatalog,
  t,
}: {
  modelCatalog: ModelCatalog
  t: Translator
}) {
  return (
    <DashboardRow className="xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto] xl:items-center">
      <DashboardPrimaryCell
        label={t("dashboard.name")}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate font-medium">
              {modelCatalog.canonical_name}
            </div>
            <StatusBadge>{localizeValue(t, modelCatalog.status)}</StatusBadge>
          </div>
        }
      >
        <DashboardMonoDetailText>{modelCatalog.id}</DashboardMonoDetailText>
      </DashboardPrimaryCell>
      <DashboardRowMeta label={t("forms.provider")}>
        <span className="truncate font-medium">{modelCatalog.provider}</span>
      </DashboardRowMeta>
      <DashboardRowMeta label={t("dashboard.createdAt")}>
        <DashboardMonoDetailText className="font-medium text-foreground/80">
          {formatDashboardDate(modelCatalog.created_at, t("dashboard.notSet"))}
        </DashboardMonoDetailText>
      </DashboardRowMeta>
      <DashboardActionCell label={t("dashboard.actions")}>
        <DeactivateModelCatalogButton
          modelCatalogID={modelCatalog.id}
          disabled={modelCatalog.status !== "active"}
        />
      </DashboardActionCell>
    </DashboardRow>
  )
}

export function ProviderCredentialRow({
  credential,
  t,
}: {
  credential: ProviderCredential
  t: Translator
}) {
  return (
    <DashboardRow className="xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto] xl:items-center">
      <DashboardPrimaryCell
        label={t("dashboard.name")}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate font-medium">
              {credential.credential_name}
            </div>
            <StatusBadge>
              {credential.secret_configured
                ? localizeValue(t, credential.status)
                : t("dashboard.missingSecret")}
            </StatusBadge>
          </div>
        }
      >
        <DashboardMonoDetailText>{credential.id}</DashboardMonoDetailText>
      </DashboardPrimaryCell>
      <DashboardRowMeta label={t("forms.provider")}>
        <span className="truncate font-medium">{credential.provider}</span>
      </DashboardRowMeta>
      <DashboardRowMeta label={t("dashboard.createdAt")}>
        <DashboardMonoDetailText className="font-medium text-foreground/80">
          {formatDashboardDate(credential.created_at, t("dashboard.notSet"))}
        </DashboardMonoDetailText>
      </DashboardRowMeta>
      <DashboardActionCell label={t("dashboard.actions")}>
        <DeactivateProviderCredentialButton
          credentialID={credential.id}
          disabled={credential.status !== "active"}
        />
      </DashboardActionCell>
    </DashboardRow>
  )
}

export function ModelDeploymentRow({
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
    <DashboardRow className="xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.9fr)_minmax(14rem,1fr)_auto] xl:items-center">
      <DashboardPrimaryCell
        label={t("dashboard.name")}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate font-medium">
              {deployment.deployment_name}
            </div>
            <StatusBadge>{localizeValue(t, deployment.status)}</StatusBadge>
          </div>
        }
      >
        <DashboardMonoDetailText>{deployment.id}</DashboardMonoDetailText>
      </DashboardPrimaryCell>
      <DashboardRowMeta label={t("forms.model")}>
        <span className="truncate font-medium">
          {deployment.model_canonical_name}
        </span>
        <DashboardDetailText>
          {deployment.credential_name}
        </DashboardDetailText>
      </DashboardRowMeta>
      <DashboardRowMeta label={t("dashboard.region")}>
        <span className="truncate font-medium">{deployment.region}</span>
        <DashboardDetailText>
          {t("dashboard.priority")}: {deployment.priority} -{" "}
          {t("dashboard.weight")}: {deployment.weight}
        </DashboardDetailText>
        <DashboardMonoDetailText>
          {deployment.endpoint_url}
        </DashboardMonoDetailText>
      </DashboardRowMeta>
      <DashboardActionCell label={t("dashboard.actions")}>
        <EditModelDeploymentDialog
          deployment={deployment}
          modelCatalogs={modelCatalogs}
          providerCredentials={providerCredentials}
        />
        <DeactivateModelDeploymentButton
          deploymentID={deployment.id}
          disabled={deployment.status !== "active"}
        />
      </DashboardActionCell>
    </DashboardRow>
  )
}

export function RegistrationRequestRow({
  request,
  t,
}: {
  request: RegistrationRequest
  t: Translator
}) {
  return (
    <DashboardRow className="xl:grid-cols-[minmax(12rem,1fr)_minmax(0,1fr)_minmax(12rem,0.8fr)_auto] xl:items-center">
      <DashboardPrimaryCell
        label={t("dashboard.name")}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate font-medium">{request.display_name}</div>
            <StatusBadge>{localizeValue(t, request.status)}</StatusBadge>
          </div>
        }
      >
        <DashboardMonoDetailText>{request.id}</DashboardMonoDetailText>
      </DashboardPrimaryCell>
      <DashboardPrimaryCell
        label={t("dashboard.email")}
        title={<div className="truncate">{request.email}</div>}
      />
      <DashboardRowMeta label={t("dashboard.createdAt")}>
        <DashboardMonoDetailText className="font-medium text-foreground/80">
          {formatDashboardDate(request.created_at, t("dashboard.notSet"))}
        </DashboardMonoDetailText>
      </DashboardRowMeta>
      <DashboardActionCell label={t("dashboard.actions")}>
        <ReviewRegistrationRequestActions request={request} />
      </DashboardActionCell>
    </DashboardRow>
  )
}

function formatAPIKeyPreview(value: string) {
  const normalized = value.trim()

  if (normalized.length <= 18) {
    return normalized
  }

  return `${normalized.slice(0, 8)}...${normalized.slice(-8)}`
}

function formatDashboardDate(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${date.toISOString().replace("T", " ").slice(0, 16)} UTC`
}
