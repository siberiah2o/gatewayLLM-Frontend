import {
  DeactivateModelCatalogButton,
  DeactivateModelDeploymentButton,
  DeactivateProviderCredentialButton,
  EditModelDeploymentDialog,
  ManageModelPermissionsDialog,
  RemoveWorkspaceMemberButton,
  ReviewRegistrationRequestActions,
  UpdateWorkspaceMemberForm,
} from "@/components/dashboard-actions"
import type {
  ModelCatalog,
  ModelDeployment,
  ProviderCredential,
  RegistrationRequest,
  WorkspaceMember,
} from "@/lib/gatewayllm"
import {
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
      </div>
    </div>
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

export function ProviderCredentialRow({
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

export function RegistrationRequestRow({
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
