"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/components/i18n-provider"
import { normalizeLocale, translateKnownError } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type {
  APIKey,
  ModelCatalog,
  ModelDeployment,
  ProviderCredential,
  RegistrationRequest,
  User,
  Workspace,
  WorkspaceMember,
} from "@/lib/gatewayllm"

type ErrorPayload = {
  error?: {
    message?: string
  }
}

type ChatSmokeResponse = {
  backend_status?: number
  content_type?: string
  error?: {
    message?: string
  }
  request_uid?: string
  response?: unknown
}

export function CreateWorkspaceForm() {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch("/api/control/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("workspace-name"),
          billing_currency: formData.get("billing-currency"),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createWorkspaceFailed"))
        )
      }

      const workspace = (await response.json()) as Workspace

      setSuccess(t("actions.created", { name: workspace.name }))
      form.reset()
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createWorkspaceFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="workspace-name">
            {t("forms.newWorkspace")}
          </FieldLabel>
          <Input
            id="workspace-name"
            name="workspace-name"
            placeholder={t("forms.productionPlaceholder")}
            required
          />
        </Field>
        <Field orientation="responsive">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div>
              <FieldLabel htmlFor="billing-currency">
                {t("forms.currency")}
              </FieldLabel>
              <Input
                id="billing-currency"
                name="billing-currency"
                defaultValue="USD"
                maxLength={3}
                required
              />
            </div>
            <Button type="submit" className="self-end" disabled={isPending}>
              {isPending ? t("actions.creating") : t("actions.create")}
            </Button>
          </div>
        </Field>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
    </form>
  )
}

export function CreateWorkspaceUserForm({
  workspaceId,
}: {
  workspaceId?: string
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }

    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch(
        `/api/control/workspaces/${encodeURIComponent(workspaceId)}/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.get("member-email"),
            password: formData.get("member-password"),
            display_name: formData.get("member-name"),
            role: formData.get("member-role"),
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createUserFailed"))
        )
      }

      const user = (await response.json()) as User

      setSuccess(t("actions.created", { name: user.email }))
      form.reset()
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createUserFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="member-email">
            {t("forms.newWorkspaceUser")}
          </FieldLabel>
          <Input
            id="member-email"
            name="member-email"
            type="email"
            placeholder="new.user@gatewayllm.local"
            disabled={!workspaceId}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="member-name">{t("forms.displayName")}</FieldLabel>
            <Input
              id="member-name"
              name="member-name"
              placeholder={t("auth.newUser")}
              disabled={!workspaceId}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="member-password">
              {t("auth.password")}
            </FieldLabel>
            <Input
              id="member-password"
              name="member-password"
              type="password"
              defaultValue="dev-password"
              disabled={!workspaceId}
              required
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field>
            <FieldLabel htmlFor="member-role">{t("forms.role")}</FieldLabel>
            <select
              id="member-role"
              name="member-role"
              className={selectClassName}
              defaultValue="member"
              disabled={!workspaceId}
              required
            >
              <option value="member">{t("values.member")}</option>
              <option value="admin">{t("values.admin")}</option>
            </select>
          </Field>
          <Button type="submit" className="self-end" disabled={!workspaceId || isPending}>
            {isPending ? t("actions.creating") : t("forms.createUser")}
          </Button>
        </div>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
    </form>
  )
}

export function CreateAPIKeyForm({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [createdKey, setCreatedKey] = useState<APIKey>()
  const [copied, setCopied] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }

    setError(undefined)
    setCreatedKey(undefined)
    setCopied(false)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch("/api/control/me/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          display_name: formData.get("api-key-name"),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createApiKeyFailed"))
        )
      }

      const apiKey = (await response.json()) as APIKey

      setCreatedKey(apiKey)
      form.reset()
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createApiKeyFailed")))
    } finally {
      setIsPending(false)
    }
  }

  async function copyAPIKey() {
    if (!createdKey?.api_key) {
      return
    }

    await navigator.clipboard.writeText(createdKey.api_key)
    setCopied(true)
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="api-key-name">{t("forms.newApiKey")}</FieldLabel>
          <Input
            id="api-key-name"
            name="api-key-name"
            placeholder={t("forms.apiKeyPlaceholder")}
            disabled={!workspaceId}
            required
          />
          <FieldDescription>
            {t("forms.apiKeyHelp")}
          </FieldDescription>
        </Field>
        <Button type="submit" disabled={!workspaceId || isPending}>
          {isPending ? t("actions.creating") : t("forms.createApiKey")}
        </Button>
        <FieldError>{error}</FieldError>
        {createdKey?.api_key ? (
          <div className="space-y-2 rounded-lg border bg-muted/50 p-3 text-sm">
            <div className="font-medium">{t("forms.saveKeyNow")}</div>
            <Input readOnly value={createdKey.api_key} />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={copyAPIKey}
            >
              {copied ? t("actions.copied") : t("actions.copyKey")}
            </Button>
          </div>
        ) : null}
      </FieldGroup>
    </form>
  )
}

export function RevokeAPIKeyButton({
  apiKeyID,
  disabled,
}: {
  apiKeyID: string
  disabled?: boolean
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function revoke() {
    setError(undefined)
    setIsPending(true)

    try {
      const response = await fetch(
        `/api/control/me/api-keys/${encodeURIComponent(apiKeyID)}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.revokeApiKeyFailed"))
        )
      }

      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.revokeApiKeyFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={disabled || isPending}
        onClick={revoke}
      >
        {isPending ? t("actions.revoking") : t("actions.revoke")}
      </Button>
      {error ? (
        <div className="max-w-40 text-right text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  )
}

export function DeactivateModelCatalogButton({
  modelCatalogID,
  disabled,
}: {
  modelCatalogID: string
  disabled?: boolean
}) {
  return (
    <DeactivateResourceButton
      endpoint={`/api/control/model-catalogs/${encodeURIComponent(
        modelCatalogID
      )}`}
      confirmationKey="forms.deactivateCatalogConfirm"
      disabled={disabled}
    />
  )
}

export function DeactivateProviderCredentialButton({
  credentialID,
  disabled,
}: {
  credentialID: string
  disabled?: boolean
}) {
  return (
    <DeactivateResourceButton
      endpoint={`/api/control/provider-credentials/${encodeURIComponent(
        credentialID
      )}`}
      confirmationKey="forms.deactivateCredentialConfirm"
      disabled={disabled}
    />
  )
}

export function DeactivateModelDeploymentButton({
  deploymentID,
  disabled,
}: {
  deploymentID: string
  disabled?: boolean
}) {
  return (
    <DeactivateResourceButton
      endpoint={`/api/control/model-deployments/${encodeURIComponent(
        deploymentID
      )}`}
      confirmationKey="forms.deactivateDeploymentConfirm"
      disabled={disabled}
    />
  )
}

export function UpdateWorkspaceMemberForm({
  workspaceId,
  member,
  disabled,
}: {
  workspaceId?: string
  member: WorkspaceMember
  disabled?: boolean
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const canUpdate = Boolean(workspaceId) && !disabled

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !canUpdate) {
      setError(t("forms.memberCannotUpdate"))
      return
    }

    setError(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch(
        `/api/control/workspaces/${encodeURIComponent(
          workspaceId
        )}/members/${encodeURIComponent(member.user_id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: formData.get("member-row-role"),
            status: formData.get("member-row-status"),
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.updateMemberFailed"))
        )
      }

      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.updateMemberFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="flex flex-wrap items-end justify-end gap-2" onSubmit={handleSubmit}>
      <Field className="w-28">
        <FieldLabel className="sr-only" htmlFor={`member-role-${member.user_id}`}>
          {t("forms.role")}
        </FieldLabel>
        <select
          id={`member-role-${member.user_id}`}
          name="member-row-role"
          className={selectClassName}
          defaultValue={member.role === "admin" ? "admin" : "member"}
          disabled={!canUpdate || isPending}
          required
        >
          <option value="member">{t("values.member")}</option>
          <option value="admin">{t("values.admin")}</option>
        </select>
      </Field>
      <Field className="w-28">
        <FieldLabel className="sr-only" htmlFor={`member-status-${member.user_id}`}>
          {t("nav.status")}
        </FieldLabel>
        <select
          id={`member-status-${member.user_id}`}
          name="member-row-status"
          className={selectClassName}
          defaultValue={member.status === "inactive" ? "inactive" : "active"}
          disabled={!canUpdate || isPending}
          required
        >
          <option value="active">{t("values.active")}</option>
          <option value="inactive">{t("values.inactive")}</option>
        </select>
      </Field>
      <Button type="submit" size="sm" variant="outline" disabled={!canUpdate || isPending}>
        {isPending ? t("actions.saving") : t("actions.save")}
      </Button>
      {error ? (
        <div className="basis-full text-right text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </form>
  )
}

export function RemoveWorkspaceMemberButton({
  workspaceId,
  userId,
  disabled,
}: {
  workspaceId?: string
  userId: string
  disabled?: boolean
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function remove() {
    if (!workspaceId || disabled) {
      setError(t("forms.memberCannotRemove"))
      return
    }

    if (!window.confirm(t("forms.removeMemberConfirm"))) {
      return
    }

    setError(undefined)
    setIsPending(true)

    try {
      const response = await fetch(
        `/api/control/workspaces/${encodeURIComponent(
          workspaceId
        )}/members/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.removeMemberFailed"))
        )
      }

      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.removeMemberFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={disabled || isPending}
        onClick={remove}
      >
        {isPending ? t("actions.removing") : t("actions.remove")}
      </Button>
      {error ? (
        <div className="max-w-48 text-right text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  )
}

function DeactivateResourceButton({
  endpoint,
  confirmationKey,
  disabled,
}: {
  endpoint: string
  confirmationKey: string
  disabled?: boolean
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function deactivate() {
    if (!window.confirm(t(confirmationKey))) {
      return
    }

    setError(undefined)
    setIsPending(true)

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "inactive",
        }),
      })

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.deactivateFailed"))
        )
      }

      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.deactivateFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isPending}
        onClick={deactivate}
      >
        {isPending ? t("actions.deactivating") : t("actions.deactivate")}
      </Button>
      {error ? (
        <div className="max-w-48 text-right text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  )
}

export function ReviewRegistrationRequestActions({
  request,
}: {
  request: RegistrationRequest
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [action, setAction] = useState<"approve" | "reject">()

  async function review(nextAction: "approve" | "reject") {
    const actionLabel =
      nextAction === "approve" ? t("actions.approve") : t("actions.reject")

    setError(undefined)
    setAction(nextAction)

    try {
      const response = await fetch(
        `/api/control/workspaces/${encodeURIComponent(
          request.workspace_id
        )}/registration-requests/${encodeURIComponent(request.id)}/${nextAction}`,
        {
          method: "POST",
          headers:
            nextAction === "approve"
              ? {
                  "Content-Type": "application/json",
                }
              : undefined,
          body:
            nextAction === "approve"
              ? JSON.stringify({
                  role: "member",
                })
              : undefined,
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(
            response,
            t("forms.reviewRequestFailed", { action: actionLabel })
          )
        )
      }

      router.refresh()
    } catch (submitError) {
      setError(
        errorText(
          submitError,
          t("forms.reviewRequestFailed", { action: actionLabel })
        )
      )
    } finally {
      setAction(undefined)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!!action}
          onClick={() => review("approve")}
        >
          {action === "approve" ? t("actions.approving") : t("actions.approve")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!!action}
          onClick={() => review("reject")}
        >
          {action === "reject" ? t("actions.rejecting") : t("actions.reject")}
        </Button>
      </div>
      {error ? (
        <div className="max-w-48 text-right text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  )
}

export function CreateModelCatalogForm({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }

    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch("/api/control/model-catalogs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          canonical_name: formData.get("model-name"),
          provider: formData.get("provider"),
          prompt_microusd_per_million: formData.get("prompt-price"),
          completion_microusd_per_million: formData.get("completion-price"),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createModelFailed"))
        )
      }

      const catalog = (await response.json()) as ModelCatalog

      setSuccess(t("actions.created", { name: catalog.canonical_name }))
      form.reset()
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createModelFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="model-name">
            {t("forms.newModelCatalog")}
          </FieldLabel>
          <Input
            id="model-name"
            name="model-name"
            defaultValue="gpt-4o-mini"
            disabled={!workspaceId}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="provider">{t("forms.provider")}</FieldLabel>
            <Input
              id="provider"
              name="provider"
              defaultValue="openai"
              disabled={!workspaceId}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="prompt-price">
              {t("forms.promptPrice")}
            </FieldLabel>
            <Input
              id="prompt-price"
              name="prompt-price"
              type="number"
              defaultValue="150000"
              disabled={!workspaceId}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="completion-price">
              {t("forms.completionPrice")}
            </FieldLabel>
            <Input
              id="completion-price"
              name="completion-price"
              type="number"
              defaultValue="600000"
              disabled={!workspaceId}
              required
            />
          </Field>
        </div>
        <Button type="submit" disabled={!workspaceId || isPending}>
          {isPending ? t("actions.creating") : t("forms.createModel")}
        </Button>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
    </form>
  )
}

export function CreateProviderCredentialForm({
  workspaceId,
}: {
  workspaceId?: string
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }

    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch("/api/control/provider-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          provider: formData.get("credential-provider"),
          credential_name: formData.get("credential-name"),
          credential_secret: formData.get("credential-secret"),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createCredentialFailed"))
        )
      }

      const credential = (await response.json()) as ProviderCredential

      setSuccess(t("actions.created", { name: credential.credential_name }))
      form.reset()
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createCredentialFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="credential-name">
            {t("forms.newCredential")}
          </FieldLabel>
          <Input
            id="credential-name"
            name="credential-name"
            defaultValue="openai-default"
            disabled={!workspaceId}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="credential-provider">
              {t("forms.provider")}
            </FieldLabel>
            <Input
              id="credential-provider"
              name="credential-provider"
              defaultValue="openai"
              disabled={!workspaceId}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="credential-secret">
              {t("forms.secret")}
            </FieldLabel>
            <Input
              id="credential-secret"
              name="credential-secret"
              type="password"
              placeholder="sk-..."
              disabled={!workspaceId}
              required
            />
          </Field>
        </div>
        <Button type="submit" disabled={!workspaceId || isPending}>
          {isPending ? t("actions.creating") : t("forms.createCredential")}
        </Button>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
    </form>
  )
}

export function CreateModelDeploymentForm({
  workspaceId,
  modelCatalogs,
  providerCredentials,
}: {
  workspaceId?: string
  modelCatalogs: ModelCatalog[]
  providerCredentials: ProviderCredential[]
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const canCreate =
    Boolean(workspaceId) &&
    modelCatalogs.length > 0 &&
    providerCredentials.length > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !canCreate) {
      setError(t("forms.deploymentPrerequisite"))
      return
    }

    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch("/api/control/model-deployments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          model_catalog_id: formData.get("model-catalog-id"),
          credential_id: formData.get("credential-id"),
          deployment_name: formData.get("deployment-name"),
          region: formData.get("deployment-region"),
          endpoint_url: formData.get("endpoint-url"),
          priority: formData.get("priority"),
          weight: formData.get("weight"),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createDeploymentFailed"))
        )
      }

      const deployment = (await response.json()) as ModelDeployment

      setSuccess(t("actions.created", { name: deployment.deployment_name }))
      form.reset()
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createDeploymentFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="deployment-name">
            {t("forms.newDeployment")}
          </FieldLabel>
          <Input
            id="deployment-name"
            name="deployment-name"
            defaultValue="gpt-4o-mini-default"
            disabled={!canCreate}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="model-catalog-id">
              {t("forms.modelCatalog")}
            </FieldLabel>
            <select
              id="model-catalog-id"
              name="model-catalog-id"
              className={selectClassName}
              disabled={!canCreate}
              required
            >
              {modelCatalogs.map((modelCatalog) => (
                <option key={modelCatalog.id} value={modelCatalog.id}>
                  {modelCatalog.canonical_name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="credential-id">
              {t("forms.credential")}
            </FieldLabel>
            <select
              id="credential-id"
              name="credential-id"
              className={selectClassName}
              disabled={!canCreate}
              required
            >
              {providerCredentials.map((credential) => (
                <option key={credential.id} value={credential.id}>
                  {credential.credential_name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="endpoint-url">{t("forms.endpointUrl")}</FieldLabel>
          <Input
            id="endpoint-url"
            name="endpoint-url"
            type="url"
            defaultValue="https://api.openai.com/v1"
            disabled={!canCreate}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="deployment-region">
              {t("dashboard.region")}
            </FieldLabel>
            <Input
              id="deployment-region"
              name="deployment-region"
              defaultValue="global"
              disabled={!canCreate}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="priority">{t("dashboard.priority")}</FieldLabel>
            <Input
              id="priority"
              name="priority"
              type="number"
              defaultValue="1"
              disabled={!canCreate}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="weight">{t("dashboard.weight")}</FieldLabel>
            <Input
              id="weight"
              name="weight"
              type="number"
              defaultValue="100"
              disabled={!canCreate}
              required
            />
          </Field>
        </div>
        <Button type="submit" disabled={!canCreate || isPending}>
          {isPending ? t("actions.creating") : t("forms.createDeployment")}
        </Button>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
    </form>
  )
}

export function EditModelDeploymentDialog({
  deployment,
  modelCatalogs,
  providerCredentials,
}: {
  deployment: ModelDeployment
  modelCatalogs: ModelCatalog[]
  providerCredentials: ProviderCredential[]
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch(
        `/api/control/model-deployments/${encodeURIComponent(deployment.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model_catalog_id: formData.get("edit-model-catalog-id"),
            credential_id: formData.get("edit-credential-id"),
            deployment_name: formData.get("edit-deployment-name"),
            region: formData.get("edit-deployment-region"),
            endpoint_url: formData.get("edit-endpoint-url"),
            priority: formData.get("edit-priority"),
            weight: formData.get("edit-weight"),
            status: formData.get("edit-status"),
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.updateDeploymentFailed"))
        )
      }

      setOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.updateDeploymentFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        {t("actions.edit")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("forms.editDeployment")}</DialogTitle>
          <DialogDescription>{deployment.deployment_name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`edit-deployment-name-${deployment.id}`}>
                {t("dashboard.name")}
              </FieldLabel>
              <Input
                id={`edit-deployment-name-${deployment.id}`}
                name="edit-deployment-name"
                defaultValue={deployment.deployment_name}
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`edit-model-catalog-id-${deployment.id}`}>
                  {t("forms.modelCatalog")}
                </FieldLabel>
                <select
                  id={`edit-model-catalog-id-${deployment.id}`}
                  name="edit-model-catalog-id"
                  className={selectClassName}
                  defaultValue={deployment.model_catalog_id}
                  required
                >
                  {modelCatalogs.map((modelCatalog) => (
                    <option key={modelCatalog.id} value={modelCatalog.id}>
                      {modelCatalog.canonical_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`edit-credential-id-${deployment.id}`}>
                  {t("forms.credential")}
                </FieldLabel>
                <select
                  id={`edit-credential-id-${deployment.id}`}
                  name="edit-credential-id"
                  className={selectClassName}
                  defaultValue={deployment.credential_id}
                  required
                >
                  {providerCredentials.map((credential) => (
                    <option key={credential.id} value={credential.id}>
                      {credential.credential_name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`edit-endpoint-url-${deployment.id}`}>
                {t("forms.endpointUrl")}
              </FieldLabel>
              <Input
                id={`edit-endpoint-url-${deployment.id}`}
                name="edit-endpoint-url"
                type="url"
                defaultValue={deployment.endpoint_url}
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field>
                <FieldLabel htmlFor={`edit-deployment-region-${deployment.id}`}>
                  {t("dashboard.region")}
                </FieldLabel>
                <Input
                  id={`edit-deployment-region-${deployment.id}`}
                  name="edit-deployment-region"
                  defaultValue={deployment.region}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`edit-priority-${deployment.id}`}>
                  {t("dashboard.priority")}
                </FieldLabel>
                <Input
                  id={`edit-priority-${deployment.id}`}
                  name="edit-priority"
                  type="number"
                  min="0"
                  defaultValue={String(deployment.priority)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`edit-weight-${deployment.id}`}>
                  {t("dashboard.weight")}
                </FieldLabel>
                <Input
                  id={`edit-weight-${deployment.id}`}
                  name="edit-weight"
                  type="number"
                  min="0"
                  defaultValue={String(deployment.weight)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`edit-status-${deployment.id}`}>
                  {t("nav.status")}
                </FieldLabel>
                <select
                  id={`edit-status-${deployment.id}`}
                  name="edit-status"
                  className={selectClassName}
                  defaultValue={deployment.status}
                  required
                >
                  <option value="active">{t("values.active")}</option>
                  <option value="inactive">{t("values.inactive")}</option>
                </select>
              </Field>
            </div>
            <FieldError>{error}</FieldError>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isPending}>
              {isPending ? t("actions.saving") : t("actions.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ChatSmokeTestForm({ defaultModel }: { defaultModel: string }) {
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<ChatSmokeResponse>()
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setResult(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch("/api/gateway/chat-completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: formData.get("gateway-api-key"),
          model: formData.get("chat-model"),
          prompt: formData.get("chat-prompt"),
          temperature: formData.get("temperature"),
        }),
      })
      const payload = (await response
        .json()
        .catch(() => ({}))) as ChatSmokeResponse

      setResult(payload)

      if (!response.ok) {
        throw new Error(chatSmokeError(payload, t("forms.chatSmokeFailed")))
      }
    } catch (submitError) {
      setError(errorText(submitError, t("forms.chatSmokeFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="gateway-api-key">
            {t("forms.gatewayApiKey")}
          </FieldLabel>
          <Input
            id="gateway-api-key"
            name="gateway-api-key"
            type="password"
            placeholder="gwlive_..."
            autoComplete="off"
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <Field>
            <FieldLabel htmlFor="chat-model">{t("forms.model")}</FieldLabel>
            <Input
              id="chat-model"
              name="chat-model"
              defaultValue={defaultModel}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="temperature">
              {t("forms.temperature")}
            </FieldLabel>
            <Input
              id="temperature"
              name="temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              defaultValue="0.2"
              required
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="chat-prompt">{t("forms.prompt")}</FieldLabel>
          <Textarea
            id="chat-prompt"
            name="chat-prompt"
            className="min-h-24 resize-y"
            defaultValue={t("forms.defaultPrompt")}
            required
          />
        </Field>
        <Button type="submit" disabled={isPending}>
          {isPending ? t("actions.running") : t("forms.runSmokeTest")}
        </Button>
        <FieldError>{error}</FieldError>
        {result ? (
          <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}
      </FieldGroup>
    </form>
  )
}

const selectClassName = cn(
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
)

async function responseError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as ErrorPayload | null

  return translateKnownError(
    activeClientLocale(),
    payload?.error?.message,
    fallback
  )
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function chatSmokeError(payload: ChatSmokeResponse, fallback: string) {
  if (payload.error?.message) {
    return translateKnownError(activeClientLocale(), payload.error.message, fallback)
  }

  const response = payload.response

  if (
    response &&
    typeof response === "object" &&
    "error" in response &&
    response.error &&
    typeof response.error === "object" &&
    "message" in response.error &&
    typeof response.error.message === "string"
  ) {
    return translateKnownError(
      activeClientLocale(),
      response.error.message,
      fallback
    )
  }

  return fallback
}

function activeClientLocale() {
  if (typeof document === "undefined") {
    return "en"
  }

  const cookieLocale = document.cookie
    .split("; ")
    .find((item) => item.startsWith("NEXT_LOCALE="))
    ?.split("=")[1]

  return normalizeLocale(
    cookieLocale ?? document.documentElement.lang ?? navigator.language
  )
}
