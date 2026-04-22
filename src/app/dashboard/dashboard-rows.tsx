import {
  RevokeAPIKeyButton,
  ViewAPIKeyDialog,
} from "@/components/dashboard-actions/api-keys"
import { EditModelDeploymentDialog } from "@/components/dashboard-actions/deployments"
import {
  ActivateModelCatalogButton,
  ActivateModelDeploymentButton,
  ActivateProviderCredentialButton,
  DeactivateModelCatalogButton,
  DeactivateModelDeploymentButton,
  DeactivateProviderCredentialButton,
  DeleteModelCatalogButton,
  DeleteModelDeploymentButton,
  DeleteProviderCredentialButton,
} from "@/components/dashboard-actions/resource-actions"
import { ReviewRegistrationRequestActions } from "@/components/dashboard-actions/registration"
import {
  ManageModelPermissionsDialog,
  RemoveWorkspaceMemberButton,
  UpdateWorkspaceMemberForm,
} from "@/components/dashboard-actions/workspace"
import type {
  APIKey,
  ModelCatalog,
  ModelDeployment,
  ProviderCredential,
  ProviderSetup,
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
  showActions = true,
  t,
}: {
  modelCatalog: ModelCatalog
  showActions?: boolean
  t: Translator
}) {
  const canDeactivate = modelCatalog.status === "active"

  return (
    <DashboardRow
      className={
        showActions
          ? "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto] xl:items-center"
          : "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)] xl:items-center"
      }
    >
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
      {showActions ? (
        <DashboardActionCell label={t("dashboard.actions")}>
          {canDeactivate ? (
            <DeactivateModelCatalogButton modelCatalogID={modelCatalog.id} />
          ) : (
            <ActivateModelCatalogButton modelCatalogID={modelCatalog.id} />
          )}
          <DeleteModelCatalogButton modelCatalogID={modelCatalog.id} />
        </DashboardActionCell>
      ) : null}
    </DashboardRow>
  )
}

export function ProviderCredentialRow({
  credential,
  showActions = true,
  t,
}: {
  credential: ProviderCredential
  showActions?: boolean
  t: Translator
}) {
  const canDeactivate = credential.status === "active"

  return (
    <DashboardRow
      className={
        showActions
          ? "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto] xl:items-center"
          : "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)] xl:items-center"
      }
    >
      <DashboardPrimaryCell
        label={t("dashboard.name")}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate font-medium">
              {credential.credential_name}
            </div>
            <StatusBadge>{localizeValue(t, credential.status)}</StatusBadge>
            {credential.secret_configured ? null : (
              <StatusBadge>{t("dashboard.missingSecret")}</StatusBadge>
            )}
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
      {showActions ? (
        <DashboardActionCell label={t("dashboard.actions")}>
          {canDeactivate ? (
            <DeactivateProviderCredentialButton credentialID={credential.id} />
          ) : (
            <ActivateProviderCredentialButton credentialID={credential.id} />
          )}
          <DeleteProviderCredentialButton credentialID={credential.id} />
        </DashboardActionCell>
      ) : null}
    </DashboardRow>
  )
}

export function ModelDeploymentRow({
  deployment,
  modelCatalogs,
  providerCredentials,
  showActions = true,
  t,
}: {
  deployment: ModelDeployment
  modelCatalogs: ModelCatalog[]
  providerCredentials: ProviderCredential[]
  showActions?: boolean
  t: Translator
}) {
  const canDeactivate = deployment.status === "active"
  const editableModelCatalogs = showActions
    ? modelCatalogs.filter(
        (modelCatalog) =>
          modelCatalog.status === "active" ||
          modelCatalog.id === deployment.model_catalog_id
      )
    : []
  const editableProviderCredentials = showActions
    ? providerCredentials.filter(
        (credential) =>
          credential.status === "active" ||
          credential.id === deployment.credential_id
      )
    : []

  return (
    <DashboardRow
      className={
        showActions
          ? "xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.9fr)_minmax(14rem,1fr)_auto] xl:items-center"
          : "xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.9fr)_minmax(14rem,1fr)] xl:items-center"
      }
    >
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
      {showActions ? (
        <DashboardActionCell label={t("dashboard.actions")}>
          <EditModelDeploymentDialog
            deployment={deployment}
            modelCatalogs={editableModelCatalogs}
            providerCredentials={editableProviderCredentials}
          />
          {canDeactivate ? (
            <DeactivateModelDeploymentButton deploymentID={deployment.id} />
          ) : (
            <ActivateModelDeploymentButton deploymentID={deployment.id} />
          )}
          <DeleteModelDeploymentButton deploymentID={deployment.id} />
        </DashboardActionCell>
      ) : null}
    </DashboardRow>
  )
}

export function ProviderSetupRow({
  setup,
  t,
}: {
  setup: ProviderSetup
  t: Translator
}) {
  const canDeactivate = setup.status === "active"
  const updatedAt = formatDashboardDate(setup.updated_at, t("dashboard.notSet"))

  return (
    <DashboardRow className="xl:grid-cols-[minmax(6.5rem,0.8fr)_minmax(7rem,0.9fr)_minmax(0,1.1fr)_minmax(7.25rem,0.75fr)_auto] xl:items-center">
      <DashboardPrimaryCell
        label={t("forms.provider")}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 truncate font-medium">
              {setup.provider_display_name || setup.provider}
            </div>
            <StatusBadge>{localizeValue(t, setup.status)}</StatusBadge>
          </div>
        }
      >
        {!setup.credential.secret_configured ? (
          <DashboardDetailText>{t("dashboard.missingSecret")}</DashboardDetailText>
        ) : null}
      </DashboardPrimaryCell>
      <DashboardRowMeta label={t("forms.model")}>
        <span className="truncate font-medium" title={setup.model_name}>
          {setup.model_name}
        </span>
        <DashboardDetailText>{setup.deployment_name}</DashboardDetailText>
      </DashboardRowMeta>
      <DashboardRowMeta label={t("forms.endpointUrl")}>
        <span className="truncate font-medium" title={setup.endpoint_url}>
          {setup.endpoint_url}
        </span>
        <DashboardDetailText>{setup.region}</DashboardDetailText>
      </DashboardRowMeta>
      <DashboardRowMeta label={t("dashboard.updatedAt")}>
        <DashboardMonoDetailText
          className="font-medium text-foreground/80"
          title={updatedAt}
        >
          {updatedAt}
        </DashboardMonoDetailText>
      </DashboardRowMeta>
      <DashboardActionCell label={t("dashboard.actions")}>
        {canDeactivate ? (
          <DeactivateModelDeploymentButton deploymentID={setup.id} />
        ) : (
          <ActivateModelDeploymentButton deploymentID={setup.id} />
        )}
        <DeleteModelDeploymentButton deploymentID={setup.id} />
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
