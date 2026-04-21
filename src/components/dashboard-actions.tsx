"use client"

import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useRouter } from "next/navigation"
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/components/i18n-provider"
import { normalizeLocale, translateKnownError } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type {
  APIKey,
  ModelCatalog,
  ModelCatalogOption,
  ModelCatalogOptions,
  ModelCatalogProviderOption,
  ModelDeployment,
  ProviderCredential,
  ProviderSetup,
  RegistrationRequest,
  User,
  UserModelPermissionList,
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

type DashboardSelectOption = {
  label: string
  value: string
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

export function CreateWorkspaceUserDialog({
  workspaceId,
}: {
  workspaceId?: string
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const canCreate = Boolean(workspaceId)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setError(undefined)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !canCreate) {
      setError(t("forms.workspaceRequired"))
      return
    }

    setError(undefined)
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
            role: "member",
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createUserFailed"))
        )
      }

      form.reset()
      setOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createUserFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" disabled={!canCreate} />}
      >
        <PlusIcon data-icon="inline-start" />
        {t("forms.createUser")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("forms.newWorkspaceUser")}</DialogTitle>
          <DialogDescription>{t("dashboard.usersDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="member-email">
                {t("dashboard.email")}
              </FieldLabel>
              <Input
                id="member-email"
                name="member-email"
                type="email"
                placeholder="new.user@gatewayllm.local"
                disabled={!canCreate || isPending}
                required
              />
            </Field>
            <FieldGroup className="gap-3 sm:grid sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="member-name">
                  {t("forms.displayName")}
                </FieldLabel>
                <Input
                  id="member-name"
                  name="member-name"
                  placeholder={t("auth.newUser")}
                  disabled={!canCreate || isPending}
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
                  disabled={!canCreate || isPending}
                  required
                />
              </Field>
            </FieldGroup>
            <FieldError>{error}</FieldError>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("common.close")}
            </DialogClose>
            <Button type="submit" disabled={!canCreate || isPending}>
              {isPending ? t("actions.creating") : t("forms.createUser")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CreateAPIKeyForm({
  workspaceId,
  className,
}: {
  workspaceId?: string
  className?: string
}) {
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
    <form className={cn("flex flex-col gap-4", className)} onSubmit={handleSubmit}>
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
          <PlusIcon />
          {isPending ? t("actions.creating") : t("forms.createApiKey")}
        </Button>
        <FieldError>{error}</FieldError>
        {createdKey?.api_key ? (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
            <div className="font-medium">{t("forms.saveKeyNow")}</div>
            <Input readOnly value={createdKey.api_key} />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={copyAPIKey}
            >
              <CopyIcon />
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
  className,
}: {
  apiKeyID: string
  disabled?: boolean
  className?: string
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
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        type="button"
        variant="destructive"
        size="xs"
        disabled={disabled || isPending}
        onClick={revoke}
      >
        <Trash2Icon data-icon="inline-start" />
        {isPending ? t("actions.revoking") : t("actions.revoke")}
      </Button>
      {error ? (
        <div className="max-w-36 text-right text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  )
}

export function ViewAPIKeyDialog({
  apiKeyID,
  displayName,
  triggerLabel,
  triggerVariant = "outline",
  triggerSize = "xs",
  triggerClassName,
  triggerTitle,
  showIcon = true,
}: {
  apiKeyID: string
  displayName: string
  triggerLabel?: string
  triggerVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  triggerSize?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
  triggerClassName?: string
  triggerTitle?: string
  showIcon?: boolean
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [apiKey, setAPIKey] = useState<APIKey>()
  const [copied, setCopied] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadAPIKey() {
      setIsPending(true)
      setError(undefined)
      setCopied(false)

      try {
        const response = await fetch(
          `/api/control/me/api-keys/${encodeURIComponent(apiKeyID)}`
        )

        if (!response.ok) {
          throw new Error(
            await responseError(response, t("forms.createApiKeyFailed"))
          )
        }

        const payload = (await response.json()) as APIKey

        if (!cancelled) {
          setAPIKey(payload)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(errorText(loadError, t("forms.createApiKeyFailed")))
          setAPIKey(undefined)
        }
      } finally {
        if (!cancelled) {
          setIsPending(false)
        }
      }
    }

    loadAPIKey()

    return () => {
      cancelled = true
    }
  }, [apiKeyID, open, t])

  async function copyCurrentKey() {
    if (!apiKey?.api_key) {
      return
    }

    await navigator.clipboard.writeText(apiKey.api_key)
    setCopied(true)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={triggerVariant}
            size={triggerSize}
            className={triggerClassName}
            title={triggerTitle}
          />
        }
      >
        {showIcon ? <EyeIcon /> : null}
        <span className="truncate">{triggerLabel ?? t("actions.viewKey")}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{displayName}</DialogTitle>
          <DialogDescription>{apiKeyID}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          {isPending ? (
            <div className="text-muted-foreground">{t("actions.loading")}</div>
          ) : error ? (
            <FieldError>{error}</FieldError>
          ) : apiKey?.api_key ? (
            <>
              <Input readOnly value={apiKey.api_key} />
              <Button type="button" variant="outline" onClick={copyCurrentKey}>
                <CopyIcon />
                {copied ? t("actions.copied") : t("actions.copyKey")}
              </Button>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-muted-foreground">
              {t("forms.apiKeyUnavailable")}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t("common.close")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ActivateModelCatalogButton({
  modelCatalogID,
  disabled,
}: {
  modelCatalogID: string
  disabled?: boolean
}) {
  return (
    <ActivateResourceButton
      endpoint={`/api/control/model-catalogs/${encodeURIComponent(
        modelCatalogID
      )}`}
      confirmationKey="forms.activateCatalogConfirm"
      disabled={disabled}
    />
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

export function DeleteModelCatalogButton({
  modelCatalogID,
  disabled,
}: {
  modelCatalogID: string
  disabled?: boolean
}) {
  return (
    <DeleteResourceButton
      endpoint={`/api/control/model-catalogs/${encodeURIComponent(
        modelCatalogID
      )}`}
      confirmationKey="forms.deleteCatalogConfirm"
      disabled={disabled}
    />
  )
}

export function ActivateProviderCredentialButton({
  credentialID,
  disabled,
}: {
  credentialID: string
  disabled?: boolean
}) {
  return (
    <ActivateResourceButton
      endpoint={`/api/control/provider-credentials/${encodeURIComponent(
        credentialID
      )}`}
      confirmationKey="forms.activateCredentialConfirm"
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

export function DeleteProviderCredentialButton({
  credentialID,
  disabled,
}: {
  credentialID: string
  disabled?: boolean
}) {
  return (
    <DeleteResourceButton
      endpoint={`/api/control/provider-credentials/${encodeURIComponent(
        credentialID
      )}`}
      confirmationKey="forms.deleteCredentialConfirm"
      disabled={disabled}
    />
  )
}

export function ActivateModelDeploymentButton({
  deploymentID,
  disabled,
}: {
  deploymentID: string
  disabled?: boolean
}) {
  return (
    <ActivateResourceButton
      endpoint={`/api/control/model-deployments/${encodeURIComponent(
        deploymentID
      )}`}
      confirmationKey="forms.activateDeploymentConfirm"
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

export function DeleteModelDeploymentButton({
  deploymentID,
  disabled,
}: {
  deploymentID: string
  disabled?: boolean
}) {
  return (
    <DeleteResourceButton
      endpoint={`/api/control/model-deployments/${encodeURIComponent(
        deploymentID
      )}`}
      confirmationKey="forms.deleteDeploymentConfirm"
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
    <form
      className="flex min-w-0 grow flex-wrap items-center justify-end gap-1.5"
      onSubmit={handleSubmit}
    >
      <Field className="w-[7rem] shrink-0">
        <DashboardFormSelect
          id={`member-role-${member.user_id}`}
          name="member-row-role"
          label={t("forms.role")}
          labelClassName="sr-only"
          defaultValue={member.role === "admin" ? "admin" : "member"}
          disabled={!canUpdate || isPending}
          required
          size="sm"
          triggerClassName="min-w-[7rem]"
          options={memberRoleOptions(t)}
        />
      </Field>
      <Field className="w-[7rem] shrink-0">
        <DashboardFormSelect
          id={`member-status-${member.user_id}`}
          name="member-row-status"
          label={t("nav.status")}
          labelClassName="sr-only"
          defaultValue={member.status === "inactive" ? "inactive" : "active"}
          disabled={!canUpdate || isPending}
          required
          size="sm"
          triggerClassName="min-w-[7rem]"
          options={activeStatusOptions(t)}
        />
      </Field>
      <Button
        type="submit"
        size="xs"
        variant="outline"
        disabled={!canUpdate || isPending}
      >
        <CheckIcon data-icon="inline-start" />
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
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function remove() {
    if (!workspaceId || disabled) {
      setError(t("forms.memberCannotRemove"))
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

      setOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.removeMemberFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title={t("actions.remove")}
        description={t("forms.removeMemberConfirm")}
        confirmLabel={isPending ? t("actions.removing") : t("actions.remove")}
        confirmVariant="destructive"
        confirmDisabled={isPending}
        onConfirm={remove}
        trigger={
          <Trash2Icon data-icon="inline-start" />
        }
        triggerRender={
          <Button
            type="button"
            variant="destructive"
            size="xs"
            disabled={disabled || isPending}
          />
        }
        cancelLabel={t("common.close")}
      />
      {error ? (
        <div className="max-w-48 text-right text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  )
}

export function EditWorkspaceUserDialog({
  workspaceId,
  user,
  disabled,
}: {
  workspaceId?: string
  user: User
  disabled?: boolean
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const canUpdate = Boolean(workspaceId) && !disabled

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !canUpdate) {
      setError(t("forms.userCannotUpdate"))
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
        )}/users/${encodeURIComponent(user.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            display_name: formData.get("user-display-name"),
            status: formData.get("user-status"),
            email_verified: formData.get("user-email-verified") === "true",
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.updateUserFailed"))
        )
      }

      setOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.updateUserFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!canUpdate}
          />
        }
      >
        <PencilIcon data-icon="inline-start" />
        {t("actions.edit")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("forms.editUser")}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`user-display-name-${user.id}`}>
                {t("forms.displayName")}
              </FieldLabel>
              <Input
                id={`user-display-name-${user.id}`}
                name="user-display-name"
                defaultValue={user.display_name}
                disabled={!canUpdate || isPending}
                required
              />
            </Field>
            <FieldGroup className="gap-3 sm:grid sm:grid-cols-2">
              <Field>
                <DashboardFormSelect
                  id={`user-status-${user.id}`}
                  name="user-status"
                  label={t("dashboard.userStatus")}
                  defaultValue={user.status === "inactive" ? "inactive" : "active"}
                  disabled={!canUpdate || isPending}
                  required
                  options={activeStatusOptions(t)}
                />
              </Field>
              <Field>
                <DashboardFormSelect
                  id={`user-email-verified-${user.id}`}
                  name="user-email-verified"
                  label={t("dashboard.emailVerification")}
                  defaultValue={user.email_verified ? "true" : "false"}
                  disabled={!canUpdate || isPending}
                  required
                  options={emailVerificationOptions(t)}
                />
              </Field>
            </FieldGroup>
            <FieldError>{error}</FieldError>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={!canUpdate || isPending}>
              {isPending ? t("actions.saving") : t("actions.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteWorkspaceUserDialog({
  workspaceId,
  user,
  disabled,
}: {
  workspaceId?: string
  user: User
  disabled?: boolean
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const canRemove = Boolean(workspaceId) && !disabled

  async function remove() {
    if (!workspaceId || !canRemove) {
      setError(t("forms.userCannotRemove"))
      return
    }

    setError(undefined)
    setIsPending(true)

    try {
      const response = await fetch(
        `/api/control/workspaces/${encodeURIComponent(
          workspaceId
        )}/users/${encodeURIComponent(user.id)}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.removeUserFailed"))
        )
      }

      setOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.removeUserFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="destructive"
            size="xs"
            disabled={!canRemove || isPending}
          />
        }
      >
        <Trash2Icon data-icon="inline-start" />
        {isPending ? t("actions.removing") : t("actions.remove")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("forms.removeUser")}</DialogTitle>
          <DialogDescription>{t("forms.removeUserConfirm")}</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 rounded-lg border p-3 text-sm">
          <div className="truncate font-medium">{user.display_name}</div>
          <div className="truncate text-muted-foreground">{user.email}</div>
        </div>
        <FieldError>{error}</FieldError>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t("common.close")}
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={!canRemove || isPending}
            onClick={remove}
          >
            <Trash2Icon data-icon="inline-start" />
            {isPending ? t("actions.removing") : t("actions.remove")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ManageModelPermissionsDialog({
  workspaceId,
  member,
  modelCatalogs,
  disabled,
}: {
  workspaceId?: string
  member: WorkspaceMember
  modelCatalogs: ModelCatalog[]
  disabled?: boolean
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [selectedModelIDs, setSelectedModelIDs] = useState<string[]>([])
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const canManage = Boolean(workspaceId) && !disabled

  useEffect(() => {
    if (!open) {
      return
    }

    if (!workspaceId) {
      return
    }

    let ignore = false
    const workspaceID = workspaceId

    async function loadPermissions() {
      setError(undefined)
      setSuccess(undefined)
      setIsLoading(true)

      try {
        const response = await fetch(
          `/api/control/workspaces/${encodeURIComponent(
            workspaceID
          )}/users/${encodeURIComponent(member.user_id)}/model-permissions`,
          {
            cache: "no-store",
          }
        )

        if (!response.ok) {
          throw new Error(
            await responseError(response, t("forms.loadModelPermissionsFailed"))
          )
        }

        const permissions = (await response.json()) as UserModelPermissionList

        if (!ignore) {
          setSelectedModelIDs(
            permissions.data.map((permission) => permission.model_catalog_id)
          )
        }
      } catch (loadError) {
        if (!ignore) {
          setError(
            errorText(loadError, t("forms.loadModelPermissionsFailed"))
          )
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadPermissions()

    return () => {
      ignore = true
    }
  }, [member.user_id, open, t, workspaceId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !canManage) {
      setError(t("forms.memberCannotUpdate"))
      return
    }

    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    try {
      const response = await fetch(
        `/api/control/workspaces/${encodeURIComponent(
          workspaceId
        )}/users/${encodeURIComponent(member.user_id)}/model-permissions`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model_catalog_ids: selectedModelIDs,
            allowed_models: [],
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.updateModelPermissionsFailed"))
        )
      }

      setSuccess(t("forms.modelPermissionsSaved"))
      router.refresh()
    } catch (submitError) {
      setError(
        errorText(submitError, t("forms.updateModelPermissionsFailed"))
      )
    } finally {
      setIsPending(false)
    }
  }

  function toggleModel(modelCatalogID: string, checked: boolean) {
    setSelectedModelIDs((current) => {
      if (checked) {
        return Array.from(new Set([...current, modelCatalogID]))
      }

      return current.filter((id) => id !== modelCatalogID)
    })
  }

  const knownModelIDs = new Set(modelCatalogs.map((modelCatalog) => modelCatalog.id))
  const selectedVisibleCount = modelCatalogs.filter((modelCatalog) =>
    selectedModelIDs.includes(modelCatalog.id)
  ).length
  const hiddenSelectedCount = selectedModelIDs.filter(
    (id) => !knownModelIDs.has(id)
  ).length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!canManage}
          />
        }
      >
        <ShieldCheckIcon data-icon="inline-start" />
        {t("forms.modelPermissions")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("forms.modelPermissions")}</DialogTitle>
          <DialogDescription>
            {member.display_name} · {member.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <FieldSet disabled={!canManage || isLoading || isPending}>
              <div className="rounded-lg border bg-muted/35 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <FieldLegend className="mb-0">
                      {t("forms.allowedModels")}
                    </FieldLegend>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-2xl font-medium">
                        {selectedVisibleCount}
                      </span>
                      <span className="pb-0.5 text-sm text-muted-foreground">
                        / {modelCatalogs.length}
                      </span>
                    </div>
                    {hiddenSelectedCount > 0 ? (
                      <FieldDescription className="mt-1">
                        {t("forms.hiddenModelPermissions", {
                          count: hiddenSelectedCount,
                        })}
                      </FieldDescription>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border bg-background p-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={!canManage || isLoading || isPending}
                      onClick={() =>
                        setSelectedModelIDs(modelCatalogs.map((model) => model.id))
                      }
                    >
                      {t("actions.selectAll")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={!canManage || isLoading || isPending}
                      onClick={() => setSelectedModelIDs([])}
                    >
                      {t("actions.clear")}
                    </Button>
                  </div>
                </div>
              </div>
              {isLoading ? (
                <div className="grid gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-[4.5rem] rounded-lg" />
                  ))}
                </div>
              ) : modelCatalogs.length > 0 ? (
                <div className="max-h-[24rem] overflow-auto pr-1">
                  <FieldGroup data-slot="checkbox-group" className="gap-2">
                    {modelCatalogs.map((modelCatalog) => {
                      const checkboxID = `model-permission-${member.user_id}-${modelCatalog.id}`
                      const isSelected = selectedModelIDs.includes(modelCatalog.id)

                      return (
                        <Field
                          key={modelCatalog.id}
                          orientation="horizontal"
                          className={cn(
                            "rounded-lg border bg-background p-3 transition-colors",
                            isSelected &&
                              "border-primary/30 bg-primary/5 dark:border-primary/20 dark:bg-primary/10"
                          )}
                        >
                          <input
                            id={checkboxID}
                            type="checkbox"
                            className="mt-0.5 size-4 shrink-0 accent-primary"
                            checked={isSelected}
                            disabled={!canManage || isLoading || isPending}
                            onChange={(event) =>
                              toggleModel(modelCatalog.id, event.target.checked)
                            }
                          />
                          <FieldContent>
                            <FieldLabel htmlFor={checkboxID}>
                              {modelCatalog.canonical_name}
                            </FieldLabel>
                            <FieldDescription>
                              {modelCatalog.provider} - {modelCatalog.id}
                            </FieldDescription>
                          </FieldContent>
                        </Field>
                      )
                    })}
                  </FieldGroup>
                </div>
              ) : (
                <Empty className="min-h-40 rounded-lg border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ShieldCheckIcon />
                    </EmptyMedia>
                    <EmptyDescription>
                      {t("forms.noModelCatalogsForPermissions")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </FieldSet>
            <FieldError>{error}</FieldError>
            {success ? <FieldDescription>{success}</FieldDescription> : null}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="submit"
              disabled={!canManage || isLoading || isPending}
            >
              {isPending ? t("actions.saving") : t("actions.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ActivateResourceButton({
  endpoint,
  confirmationKey,
  disabled,
}: {
  endpoint: string
  confirmationKey: string
  disabled?: boolean
}) {
  return (
    <UpdateResourceStatusButton
      endpoint={endpoint}
      status="active"
      confirmationKey={confirmationKey}
      actionKey="activate"
      pendingActionKey="activating"
      failureKey="forms.activateFailed"
      disabled={disabled}
      triggerVariant="default"
    />
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
  return (
    <UpdateResourceStatusButton
      endpoint={endpoint}
      status="inactive"
      confirmationKey={confirmationKey}
      actionKey="deactivate"
      pendingActionKey="deactivating"
      failureKey="forms.deactivateFailed"
      disabled={disabled}
      triggerVariant="outline"
    />
  )
}

function UpdateResourceStatusButton({
  endpoint,
  status,
  confirmationKey,
  actionKey,
  pendingActionKey,
  failureKey,
  disabled,
  triggerVariant,
  trigger,
}: {
  endpoint: string
  status: "active" | "inactive"
  confirmationKey: string
  actionKey: "activate" | "deactivate"
  pendingActionKey: "activating" | "deactivating"
  failureKey: string
  disabled?: boolean
  triggerVariant: ComponentProps<typeof Button>["variant"]
  trigger?: ReactNode
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function updateStatus() {
    setError(undefined)
    setIsPending(true)

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      })

      if (!response.ok) {
        throw new Error(await responseError(response, t(failureKey)))
      }

      setOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t(failureKey)))
    } finally {
      setIsPending(false)
    }
  }

  const idleLabel = t(`actions.${actionKey}`)
  const pendingLabel = t(`actions.${pendingActionKey}`)

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title={idleLabel}
        description={t(confirmationKey)}
        confirmLabel={isPending ? pendingLabel : idleLabel}
        confirmDisabled={isPending}
        onConfirm={updateStatus}
        trigger={trigger ?? (isPending ? pendingLabel : idleLabel)}
        triggerRender={
          <Button
            type="button"
            variant={triggerVariant}
            size="xs"
            disabled={disabled || isPending}
          />
        }
        cancelLabel={t("common.close")}
      />
      {error ? (
        <div className="max-w-48 text-right text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  )
}

function DeleteResourceButton({
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
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function remove() {
    setError(undefined)
    setIsPending(true)

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(await responseError(response, t("forms.deleteFailed")))
      }

      setOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.deleteFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title={t("actions.delete")}
        description={t(confirmationKey)}
        confirmLabel={isPending ? t("actions.deleting") : t("actions.delete")}
        confirmVariant="destructive"
        confirmDisabled={isPending}
        onConfirm={remove}
        trigger={
          <>
            <Trash2Icon data-icon="inline-start" />
            {isPending ? t("actions.deleting") : t("actions.delete")}
          </>
        }
        triggerRender={
          <Button
            type="button"
            variant="destructive"
            size="xs"
            disabled={disabled || isPending}
          />
        }
        cancelLabel={t("common.close")}
      />
      {error ? (
        <div className="max-w-48 text-right text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  )
}

function ConfirmActionDialog({
  open,
  onOpenChange,
  trigger,
  triggerRender,
  title,
  description,
  confirmLabel,
  confirmVariant,
  confirmDisabled,
  cancelLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  triggerRender: ReactElement
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: ComponentProps<typeof Button>["variant"]
  confirmDisabled?: boolean
  cancelLabel: string
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={triggerRender}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {cancelLabel}
          </DialogClose>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          size="xs"
          disabled={!!action}
          onClick={() => review("approve")}
        >
          {action === "approve" ? t("actions.approving") : t("actions.approve")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
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

function useRegistryProviderOptions({
  enabled,
  t,
}: {
  enabled: boolean
  t: ReturnType<typeof useI18n>["t"]
}) {
  const [providers, setProviders] = useState<ModelCatalogProviderOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!enabled) {
      return
    }

    let ignore = false

    async function loadProviderOptions() {
      setIsLoading(true)
      setError(undefined)

      try {
        const response = await fetch("/api/control/model-catalog-options?limit=200")

        if (!response.ok) {
          throw new Error(
            await responseError(
              response,
              t("forms.loadModelCatalogOptionsFailed")
            )
          )
        }

        const payload = (await response.json()) as ModelCatalogOptions

        if (ignore) {
          return
        }

        setProviders(payload.providers)
      } catch (loadError) {
        if (ignore) {
          return
        }

        setProviders([])
        setError(errorText(loadError, t("forms.loadModelCatalogOptionsFailed")))
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void loadProviderOptions()

    return () => {
      ignore = true
    }
  }, [enabled, t])

  if (!enabled) {
    return {
      providers: [],
      isLoading: false,
      error: undefined,
    }
  }

  return {
    providers,
    isLoading,
    error,
  }
}

function defaultCredentialName(provider: string) {
  const trimmedProvider = provider.trim()

  return trimmedProvider ? `${trimmedProvider}-default` : ""
}

function suggestedValueText({
  isLoading,
  registryValue,
  fallbackKey,
  t,
}: {
  isLoading: boolean
  registryValue?: string
  fallbackKey: string
  t: ReturnType<typeof useI18n>["t"]
}) {
  if (isLoading) {
    return t("forms.loadingDeploymentDefaults")
  }

  if (registryValue) {
    return t("forms.registrySuggestedValue", { value: registryValue })
  }

  return t(fallbackKey)
}

export function CreateModelCatalogForm({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const [isLoadingModelOptions, setIsLoadingModelOptions] = useState(false)
  const [modelOptionsError, setModelOptionsError] = useState<string>()
  const [providerOptions, setProviderOptions] = useState<ModelCatalogProviderOption[]>(
    []
  )
  const [modelOptions, setModelOptions] = useState<ModelCatalogOption[]>([])
  const [selectedProvider, setSelectedProvider] = useState("")
  const [modelName, setModelName] = useState("")
  const deferredModelName = useDeferredValue(modelName)
  const normalizedSelectedProvider = selectedProvider.trim().toLowerCase()
  const registryProviderOptions = useRegistryProviderOptions({
    enabled: Boolean(workspaceId),
    t,
  })
  const selectedProviderOption =
    providerOptions.find(
      (option) => option.provider === normalizedSelectedProvider
    ) ??
    registryProviderOptions.providers.find(
      (option) => option.provider === normalizedSelectedProvider
    )
  const selectedRegistryModel = modelOptions.find((option) => {
    if (option.canonical_name !== modelName) {
      return false
    }

    if (!normalizedSelectedProvider) {
      return true
    }

    return option.provider === normalizedSelectedProvider
  })

  useEffect(() => {
    if (!workspaceId) {
      return
    }

    let ignore = false

    async function loadOptions() {
      setIsLoadingModelOptions(true)
      setModelOptionsError(undefined)

      try {
        const params = new URLSearchParams({
          limit: "200",
        })
        const provider = selectedProvider.trim()
        const query = deferredModelName.trim()

        if (provider) {
          params.set("provider", provider)
        }
        if (query) {
          params.set("q", query)
        }

        const response = await fetch(
          `/api/control/model-catalog-options?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error(
            await responseError(response, t("forms.loadModelCatalogOptionsFailed"))
          )
        }

        const payload = (await response.json()) as ModelCatalogOptions

        if (ignore) {
          return
        }

        setProviderOptions(payload.providers)
        setModelOptions(payload.models)
      } catch (loadError) {
        if (ignore) {
          return
        }

        setProviderOptions([])
        setModelOptions([])
        setModelOptionsError(
          errorText(loadError, t("forms.loadModelCatalogOptionsFailed"))
        )
      } finally {
        if (!ignore) {
          setIsLoadingModelOptions(false)
        }
      }
    }

    void loadOptions()

    return () => {
      ignore = true
    }
  }, [deferredModelName, selectedProvider, t, workspaceId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }
    if (!selectedProvider.trim() || !modelName.trim()) {
      setError(t("errors.workspaceModelProviderRequired"))
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
          canonical_name: modelName.trim(),
          provider: selectedProvider.trim(),
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
      setModelName("")
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
          <FieldLabel htmlFor="provider">{t("forms.provider")}</FieldLabel>
          <Input
            id="provider"
            name="provider"
            value={selectedProvider}
            onChange={(event) => {
              setSelectedProvider(event.currentTarget.value)
              setSuccess(undefined)
              setError(undefined)
            }}
            disabled={!workspaceId}
            required
          />
          <FieldDescription>{t("forms.providerRegistryHelp")}</FieldDescription>
          {registryProviderOptions.error ? (
            <FieldError>{registryProviderOptions.error}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel id="provider-suggestion-label">
            {t("forms.registryProviders")}
          </FieldLabel>
          <Select
            items={registryProviderOptions.providers.map((option) => ({
              label: `${option.display_name} (${option.model_count})`,
              value: option.provider,
            }))}
            value={
              registryProviderOptions.providers.some(
                (option) => option.provider === selectedProvider.trim()
              )
                ? selectedProvider.trim()
                : null
            }
            disabled={
              !workspaceId ||
              registryProviderOptions.isLoading ||
              registryProviderOptions.providers.length === 0
            }
            onValueChange={(value) => {
              setSelectedProvider(String(value ?? ""))
              setSuccess(undefined)
              setError(undefined)
            }}
          >
            <SelectTrigger
              id="provider-suggestion"
              aria-labelledby="provider-suggestion-label"
              className="w-full"
            >
              <SelectValue placeholder={t("forms.registryProviders")} />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                {registryProviderOptions.providers.map((option) => (
                  <SelectItem key={option.provider} value={option.provider}>
                    {option.display_name} ({option.model_count})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            {registryProviderOptions.isLoading
              ? t("forms.loadingProviderRegistryOptions")
              : t("forms.registryProvidersHelp")}
          </FieldDescription>
          {!registryProviderOptions.isLoading &&
          !registryProviderOptions.error &&
          registryProviderOptions.providers.length === 0 &&
          workspaceId ? (
            <FieldDescription>
              {t("forms.noProviderRegistryOptions")}
            </FieldDescription>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="model-name">{t("forms.modelName")}</FieldLabel>
          <Input
            id="model-name"
            name="model-name"
            value={modelName}
            placeholder={selectedProviderOption?.default_model_placeholder}
            onChange={(event) => {
              setModelName(event.currentTarget.value)
              setSuccess(undefined)
              setError(undefined)
            }}
            disabled={!workspaceId}
            required
          />
          <FieldDescription>{t("forms.modelNameHelp")}</FieldDescription>
          {selectedProviderOption?.default_model_placeholder ? (
            <FieldDescription>
              {t("forms.registryRouteExample", {
                value: selectedProviderOption.default_model_placeholder,
              })}
            </FieldDescription>
          ) : null}
        </Field>
        <Field>
          <FieldLabel id="registry-match-label">
            {t("forms.registryMatches")}
          </FieldLabel>
          <Select
            items={modelOptions.map((option) => ({
              label: selectedProvider.trim()
                ? option.canonical_name
                : `${option.canonical_name} (${option.provider})`,
              value: encodeRegistryModelValue(option),
            }))}
            value={
              modelOptions.some(
                (option) =>
                  option.canonical_name === modelName &&
                  option.provider === selectedRegistryModel?.provider
              )
                ? encodeRegistryModelValue(selectedRegistryModel)
                : null
            }
            disabled={
              !workspaceId || isLoadingModelOptions || modelOptions.length === 0
            }
            onValueChange={(value) => {
              const nextSelection = decodeRegistryModelValue(String(value ?? ""))

              if (!nextSelection) {
                return
              }

              setModelName(nextSelection.canonical_name)
              setSelectedProvider(nextSelection.provider)
              setSuccess(undefined)
              setError(undefined)
            }}
          >
            <SelectTrigger
              id="registry-match"
              aria-labelledby="registry-match-label"
              className="w-full"
            >
              <SelectValue placeholder={t("forms.registryMatches")} />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                {modelOptions.map((option) => (
                  <SelectItem
                    key={`${option.provider}:${option.canonical_name}`}
                    value={encodeRegistryModelValue(option)}
                  >
                    {selectedProvider.trim()
                      ? option.canonical_name
                      : `${option.canonical_name} (${option.provider})`}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            {isLoadingModelOptions
              ? t("forms.loadingModelCatalogOptions")
              : t("forms.registryMatchesHelp")}
          </FieldDescription>
          {modelOptionsError ? <FieldError>{modelOptionsError}</FieldError> : null}
          {!isLoadingModelOptions &&
          !modelOptionsError &&
          modelOptions.length === 0 &&
          workspaceId ? (
            <FieldDescription>{t("forms.noModelCatalogOptions")}</FieldDescription>
          ) : null}
          {!isLoadingModelOptions &&
          !modelOptionsError &&
          modelName.trim() !== "" &&
          !selectedRegistryModel ? (
            <FieldDescription>{t("forms.noExactModelMatch")}</FieldDescription>
          ) : null}
        </Field>
        {selectedRegistryModel ? (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{selectedRegistryModel.canonical_name}</CardTitle>
              <CardDescription>
                {t("forms.registrySource")}:{" "}
                {formatRegistrySource(selectedRegistryModel, t)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.registryModes")}:
                </span>{" "}
                {joinValues(selectedRegistryModel.modes, t("dashboard.notSet"))}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.capabilities")}:
                </span>{" "}
                {modelCapabilities(selectedRegistryModel, t)}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.inputModalities")}:
                </span>{" "}
                {joinValues(
                  selectedRegistryModel.input_modalities,
                  t("dashboard.notSet")
                )}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.outputModalities")}:
                </span>{" "}
                {joinValues(
                  selectedRegistryModel.output_modalities,
                  t("dashboard.notSet")
                )}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.maxInputTokens")}:
                </span>{" "}
                {formatTokenCount(
                  selectedRegistryModel.max_input_tokens,
                  t("dashboard.notSet")
                )}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.maxOutputTokens")}:
                </span>{" "}
                {formatTokenCount(
                  selectedRegistryModel.max_output_tokens,
                  t("dashboard.notSet")
                )}
              </FieldDescription>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
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
        <Button
          type="submit"
          disabled={
            !workspaceId ||
            isPending ||
            selectedProvider.trim() === "" ||
            modelName.trim() === ""
          }
        >
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
  const [selectedProvider, setSelectedProvider] = useState("")
  const [credentialName, setCredentialName] = useState("")
  const registryProviderOptions = useRegistryProviderOptions({
    enabled: Boolean(workspaceId),
    t,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }
    if (!selectedProvider.trim() || !credentialName.trim()) {
      setError(t("errors.workspaceProviderNameSecretRequired"))
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
          provider: selectedProvider.trim(),
          credential_name: credentialName.trim(),
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
      setCredentialName(defaultCredentialName(selectedProvider))
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
            value={credentialName}
            onChange={(event) => {
              setCredentialName(event.currentTarget.value)
              setSuccess(undefined)
              setError(undefined)
            }}
            disabled={!workspaceId}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="credential-provider">{t("forms.provider")}</FieldLabel>
            <Input
              id="credential-provider"
              name="credential-provider"
              value={selectedProvider}
              onChange={(event) => {
                const nextProvider = event.currentTarget.value
                const previousDefault = defaultCredentialName(selectedProvider)

                setSelectedProvider(nextProvider)
                if (
                  credentialName.trim() === "" ||
                  credentialName === previousDefault
                ) {
                  setCredentialName(defaultCredentialName(nextProvider))
                }
                setSuccess(undefined)
                setError(undefined)
              }}
              disabled={!workspaceId}
              required
            />
            <FieldDescription>{t("forms.providerRegistryHelp")}</FieldDescription>
            {registryProviderOptions.error ? (
              <FieldError>{registryProviderOptions.error}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel id="credential-provider-label">
              {t("forms.registryProviders")}
            </FieldLabel>
            <Select
              items={registryProviderOptions.providers.map((option) => ({
                label: `${option.display_name} (${option.model_count})`,
                value: option.provider,
              }))}
              value={
                registryProviderOptions.providers.some(
                  (option) => option.provider === selectedProvider.trim()
                )
                  ? selectedProvider.trim()
                  : null
              }
              disabled={
                !workspaceId ||
                registryProviderOptions.isLoading ||
                registryProviderOptions.providers.length === 0
              }
              onValueChange={(value) => {
                const nextProvider = String(value ?? "").trim()
                const previousDefault = defaultCredentialName(selectedProvider)

                setSelectedProvider(nextProvider)
                if (
                  credentialName.trim() === "" ||
                  credentialName === previousDefault
                ) {
                  setCredentialName(defaultCredentialName(nextProvider))
                }
                setSuccess(undefined)
                setError(undefined)
              }}
            >
              <SelectTrigger
                id="credential-provider-suggestion"
                aria-labelledby="credential-provider-label"
                className="w-full"
              >
                <SelectValue placeholder={t("forms.registryProviders")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {registryProviderOptions.providers.map((option) => (
                    <SelectItem key={option.provider} value={option.provider}>
                      {option.display_name} ({option.model_count})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              {registryProviderOptions.isLoading
                ? t("forms.loadingProviderRegistryOptions")
                : t("forms.registryProvidersHelp")}
            </FieldDescription>
            {!registryProviderOptions.isLoading &&
            !registryProviderOptions.error &&
            registryProviderOptions.providers.length === 0 &&
            workspaceId ? (
              <FieldDescription>
                {t("forms.noProviderRegistryOptions")}
              </FieldDescription>
            ) : null}
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
        <Button
          type="submit"
          disabled={
            !workspaceId ||
            isPending ||
            selectedProvider.trim() === "" ||
            credentialName.trim() === ""
          }
        >
          {isPending ? t("actions.creating") : t("forms.createCredential")}
        </Button>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
    </form>
  )
}

export function CreateProviderSetupForm({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const [isLoadingModelOptions, setIsLoadingModelOptions] = useState(false)
  const [modelOptionsError, setModelOptionsError] = useState<string>()
  const [providerOptions, setProviderOptions] = useState<ModelCatalogProviderOption[]>(
    []
  )
  const [modelOptions, setModelOptions] = useState<ModelCatalogOption[]>([])
  const [selectedProvider, setSelectedProvider] = useState("")
  const [modelName, setModelName] = useState("")
  const [credentialName, setCredentialName] = useState("")
  const [deploymentName, setDeploymentName] = useState("")
  const [endpointURL, setEndpointURL] = useState("")
  const [region, setRegion] = useState("")
  const deferredModelName = useDeferredValue(modelName)
  const previousCredentialDefaultRef = useRef("")
  const previousGeneratedNameRef = useRef("")
  const previousSuggestedDefaultsRef = useRef({
    endpointURL: "",
    region: "",
  })
  const normalizedSelectedProvider = selectedProvider.trim().toLowerCase()
  const registryProviderOptions = useRegistryProviderOptions({
    enabled: Boolean(workspaceId),
    t,
  })
  const selectedProviderOption =
    providerOptions.find(
      (option) => option.provider === normalizedSelectedProvider
    ) ??
    registryProviderOptions.providers.find(
      (option) => option.provider === normalizedSelectedProvider
    )
  const selectedRegistryModel = modelOptions.find((option) => {
    if (option.canonical_name !== modelName) {
      return false
    }

    if (!normalizedSelectedProvider) {
      return true
    }

    return option.provider === normalizedSelectedProvider
  })
  const suggestedEndpointURL =
    selectedRegistryModel?.default_endpoint_url ??
    selectedProviderOption?.default_endpoint_url ??
    ""
  const suggestedRegion =
    selectedRegistryModel?.default_region ??
    selectedProviderOption?.default_region ??
    ""
  const generatedDeploymentName = modelName.trim()
    ? `${modelName.trim()}-default`
    : ""
  const generatedCredentialName = defaultCredentialName(selectedProvider)

  useEffect(() => {
    if (!workspaceId) {
      return
    }

    let ignore = false

    async function loadOptions() {
      setIsLoadingModelOptions(true)
      setModelOptionsError(undefined)

      try {
        const params = new URLSearchParams({
          limit: "200",
        })
        const provider = selectedProvider.trim()
        const query = deferredModelName.trim()

        if (provider) {
          params.set("provider", provider)
        }
        if (query) {
          params.set("q", query)
        }

        const response = await fetch(
          `/api/control/model-catalog-options?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error(
            await responseError(response, t("forms.loadModelCatalogOptionsFailed"))
          )
        }

        const payload = (await response.json()) as ModelCatalogOptions

        if (ignore) {
          return
        }

        setProviderOptions(payload.providers)
        setModelOptions(payload.models)
      } catch (loadError) {
        if (ignore) {
          return
        }

        setProviderOptions([])
        setModelOptions([])
        setModelOptionsError(
          errorText(loadError, t("forms.loadModelCatalogOptionsFailed"))
        )
      } finally {
        if (!ignore) {
          setIsLoadingModelOptions(false)
        }
      }
    }

    void loadOptions()

    return () => {
      ignore = true
    }
  }, [deferredModelName, selectedProvider, t, workspaceId])

  useEffect(() => {
    setCredentialName((current) => {
      if (
        current.trim() === "" ||
        current === previousCredentialDefaultRef.current
      ) {
        return generatedCredentialName
      }

      return current
    })
    previousCredentialDefaultRef.current = generatedCredentialName
  }, [generatedCredentialName])

  useEffect(() => {
    setDeploymentName((current) => {
      if (current.trim() === "" || current === previousGeneratedNameRef.current) {
        return generatedDeploymentName
      }

      return current
    })
    previousGeneratedNameRef.current = generatedDeploymentName
  }, [generatedDeploymentName])

  useEffect(() => {
    const previous = previousSuggestedDefaultsRef.current

    setEndpointURL((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.endpointURL) {
        return suggestedEndpointURL
      }

      return current
    })
    setRegion((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.region) {
        return suggestedRegion
      }

      return current
    })

    previousSuggestedDefaultsRef.current = {
      endpointURL: suggestedEndpointURL,
      region: suggestedRegion,
    }
  }, [suggestedEndpointURL, suggestedRegion])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }
    if (!selectedProvider.trim() || !modelName.trim()) {
      setError(t("errors.workspaceModelProviderRequired"))
      return
    }

    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch("/api/control/provider-setups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          provider: selectedProvider.trim(),
          model_name: modelName.trim(),
          credential_secret: formData.get("credential-secret"),
          credential_name: credentialName.trim() || undefined,
          deployment_name: deploymentName.trim() || undefined,
          endpoint_url: endpointURL.trim() || undefined,
          region: region.trim() || undefined,
          priority: formData.get("priority"),
          weight: formData.get("weight"),
          prompt_microusd_per_million: formData.get("prompt-price"),
          completion_microusd_per_million: formData.get("completion-price"),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createProviderSetupFailed"))
        )
      }

      const setup = (await response.json()) as ProviderSetup

      setSuccess(t("actions.created", { name: setup.model_name }))
      form.reset()
      setModelName("")
      setSelectedProvider("")
      setCredentialName("")
      setDeploymentName("")
      setEndpointURL("")
      setRegion("")
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createProviderSetupFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="provider-setup-provider">
              {t("forms.provider")}
            </FieldLabel>
            <Input
              id="provider-setup-provider"
              name="provider"
              value={selectedProvider}
              onChange={(event) => {
                setSelectedProvider(event.currentTarget.value)
                setSuccess(undefined)
                setError(undefined)
              }}
              disabled={!workspaceId}
              required
            />
            <FieldDescription>{t("forms.providerRegistryHelp")}</FieldDescription>
            {registryProviderOptions.error ? (
              <FieldError>{registryProviderOptions.error}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel id="provider-setup-provider-label">
              {t("forms.registryProviders")}
            </FieldLabel>
            <Select
              items={registryProviderOptions.providers.map((option) => ({
                label: `${option.display_name} (${option.model_count})`,
                value: option.provider,
              }))}
              value={
                registryProviderOptions.providers.some(
                  (option) => option.provider === selectedProvider.trim()
                )
                  ? selectedProvider.trim()
                  : null
              }
              disabled={
                !workspaceId ||
                registryProviderOptions.isLoading ||
                registryProviderOptions.providers.length === 0
              }
              onValueChange={(value) => {
                setSelectedProvider(String(value ?? ""))
                setSuccess(undefined)
                setError(undefined)
              }}
            >
              <SelectTrigger
                id="provider-setup-provider-suggestion"
                aria-labelledby="provider-setup-provider-label"
                className="w-full"
              >
                <SelectValue placeholder={t("forms.registryProviders")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {registryProviderOptions.providers.map((option) => (
                    <SelectItem key={option.provider} value={option.provider}>
                      {option.display_name} ({option.model_count})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              {registryProviderOptions.isLoading
                ? t("forms.loadingProviderRegistryOptions")
                : t("forms.registryProvidersHelp")}
            </FieldDescription>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="provider-setup-model">
              {t("forms.modelRoute")}
            </FieldLabel>
            <Input
              id="provider-setup-model"
              name="model-name"
              value={modelName}
              placeholder={selectedProviderOption?.default_model_placeholder}
              onChange={(event) => {
                setModelName(event.currentTarget.value)
                setSuccess(undefined)
                setError(undefined)
              }}
              disabled={!workspaceId}
              required
            />
            <FieldDescription>{t("forms.modelNameHelp")}</FieldDescription>
            {selectedProviderOption?.default_model_placeholder ? (
              <FieldDescription>
                {t("forms.registryRouteExample", {
                  value: selectedProviderOption.default_model_placeholder,
                })}
              </FieldDescription>
            ) : null}
          </Field>
          <Field>
            <FieldLabel id="provider-setup-model-match-label">
              {t("forms.registryMatches")}
            </FieldLabel>
            <Select
              items={modelOptions.map((option) => ({
                label: selectedProvider.trim()
                  ? option.canonical_name
                  : `${option.canonical_name} (${option.provider})`,
                value: encodeRegistryModelValue(option),
              }))}
              value={
                modelOptions.some(
                  (option) =>
                    option.canonical_name === modelName &&
                    option.provider === selectedRegistryModel?.provider
                )
                  ? encodeRegistryModelValue(selectedRegistryModel)
                  : null
              }
              disabled={
                !workspaceId || isLoadingModelOptions || modelOptions.length === 0
              }
              onValueChange={(value) => {
                const nextSelection = decodeRegistryModelValue(String(value ?? ""))

                if (!nextSelection) {
                  return
                }

                setModelName(nextSelection.canonical_name)
                setSelectedProvider(nextSelection.provider)
                setSuccess(undefined)
                setError(undefined)
              }}
            >
              <SelectTrigger
                id="provider-setup-model-match"
                aria-labelledby="provider-setup-model-match-label"
                className="w-full"
              >
                <SelectValue placeholder={t("forms.registryMatches")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {modelOptions.map((option) => (
                    <SelectItem
                      key={`${option.provider}:${option.canonical_name}`}
                      value={encodeRegistryModelValue(option)}
                    >
                      {selectedProvider.trim()
                        ? option.canonical_name
                        : `${option.canonical_name} (${option.provider})`}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              {isLoadingModelOptions
                ? t("forms.loadingModelCatalogOptions")
                : t("forms.registryMatchesHelp")}
            </FieldDescription>
            {modelOptionsError ? <FieldError>{modelOptionsError}</FieldError> : null}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="provider-setup-secret">{t("forms.secret")}</FieldLabel>
          <Input
            id="provider-setup-secret"
            name="credential-secret"
            type="password"
            placeholder="sk-..."
            disabled={!workspaceId}
            required
          />
        </Field>

        <FieldSet className="grid gap-3 rounded-lg border p-3">
          <FieldLegend>{t("forms.autoFilledDefaults")}</FieldLegend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="provider-setup-credential-name">
                {t("forms.credential")}
              </FieldLabel>
              <Input
                id="provider-setup-credential-name"
                name="credential-name"
                value={credentialName}
                onChange={(event) => setCredentialName(event.currentTarget.value)}
                disabled={!workspaceId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-deployment-name">
                {t("forms.deploymentName")}
              </FieldLabel>
              <Input
                id="provider-setup-deployment-name"
                name="deployment-name"
                value={deploymentName}
                onChange={(event) => setDeploymentName(event.currentTarget.value)}
                disabled={!workspaceId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-endpoint">
                {t("forms.endpointUrl")}
              </FieldLabel>
              <Input
                id="provider-setup-endpoint"
                name="endpoint-url"
                value={endpointURL}
                onChange={(event) => setEndpointURL(event.currentTarget.value)}
                disabled={!workspaceId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-region">
                {t("dashboard.region")}
              </FieldLabel>
              <Input
                id="provider-setup-region"
                name="region"
                value={region}
                onChange={(event) => setRegion(event.currentTarget.value)}
                disabled={!workspaceId}
              />
            </Field>
          </div>
          <FieldDescription>{t("forms.deploymentDefaultsHelp")}</FieldDescription>
        </FieldSet>

        <FieldSet className="grid gap-3 rounded-lg border p-3">
          <FieldLegend>{t("forms.advancedOptions")}</FieldLegend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="provider-setup-priority">
                {t("dashboard.priority")}
              </FieldLabel>
              <Input
                id="provider-setup-priority"
                name="priority"
                type="number"
                defaultValue="1"
                disabled={!workspaceId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-weight">
                {t("dashboard.weight")}
              </FieldLabel>
              <Input
                id="provider-setup-weight"
                name="weight"
                type="number"
                defaultValue="100"
                disabled={!workspaceId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-prompt-price">
                {t("forms.promptPrice")}
              </FieldLabel>
              <Input
                id="provider-setup-prompt-price"
                name="prompt-price"
                type="number"
                defaultValue="150000"
                disabled={!workspaceId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-completion-price">
                {t("forms.completionPrice")}
              </FieldLabel>
              <Input
                id="provider-setup-completion-price"
                name="completion-price"
                type="number"
                defaultValue="600000"
                disabled={!workspaceId}
              />
            </Field>
          </div>
        </FieldSet>

        <Button
          type="submit"
          disabled={
            !workspaceId ||
            isPending ||
            selectedProvider.trim() === "" ||
            modelName.trim() === ""
          }
        >
          {isPending ? t("actions.creating") : t("forms.createProviderSetup")}
        </Button>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
    </form>
  )
}

function encodeRegistryModelValue(option: ModelCatalogOption | undefined) {
  if (!option) {
    return ""
  }

  return JSON.stringify({
    provider: option.provider,
    canonical_name: option.canonical_name,
  })
}

function decodeRegistryModelValue(value: string) {
  try {
    const parsed = JSON.parse(value) as {
      provider?: unknown
      canonical_name?: unknown
    }

    if (
      typeof parsed.provider !== "string" ||
      typeof parsed.canonical_name !== "string"
    ) {
      return undefined
    }

    return {
      provider: parsed.provider,
      canonical_name: parsed.canonical_name,
    }
  } catch {
    return undefined
  }
}

type DeploymentRegistryDefaults = {
  suggestedEndpointURL: string
  suggestedRegion: string
  isLoading: boolean
  error?: string
}

function useDeploymentRegistryDefaults({
  enabled,
  modelCatalog,
  t,
}: {
  enabled: boolean
  modelCatalog?: ModelCatalog
  t: ReturnType<typeof useI18n>["t"]
}) {
  const isEnabled = enabled && Boolean(modelCatalog)
  const [defaults, setDefaults] = useState<DeploymentRegistryDefaults>({
    suggestedEndpointURL: "",
    suggestedRegion: "",
    isLoading: false,
  })

  useEffect(() => {
    if (!isEnabled || !modelCatalog) {
      return
    }

    const currentModelCatalog = modelCatalog
    let ignore = false

    async function loadDefaults() {
      setDefaults((current) => ({
        ...current,
        isLoading: true,
        error: undefined,
      }))

      try {
        const params = new URLSearchParams({
          provider: currentModelCatalog.provider,
          q: currentModelCatalog.canonical_name,
          limit: "20",
        })
        const response = await fetch(
          `/api/control/model-catalog-options?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error(
            await responseError(response, t("forms.loadDeploymentDefaultsFailed"))
          )
        }

        const payload = (await response.json()) as ModelCatalogOptions
        const providerOption = payload.providers.find(
          (option) => option.provider === currentModelCatalog.provider
        )
        const modelOption = payload.models.find(
          (option) =>
            option.provider === currentModelCatalog.provider &&
            option.canonical_name === currentModelCatalog.canonical_name
        )

        if (ignore) {
          return
        }

        setDefaults({
          suggestedEndpointURL:
            modelOption?.default_endpoint_url ??
            providerOption?.default_endpoint_url ??
            "",
          suggestedRegion:
            modelOption?.default_region ?? providerOption?.default_region ?? "",
          isLoading: false,
        })
      } catch (loadError) {
        if (ignore) {
          return
        }

        setDefaults({
          suggestedEndpointURL: "",
          suggestedRegion: "",
          isLoading: false,
          error: errorText(loadError, t("forms.loadDeploymentDefaultsFailed")),
        })
      }
    }

    void loadDefaults()

    return () => {
      ignore = true
    }
  }, [isEnabled, modelCatalog, t])

  if (!isEnabled) {
    return {
      suggestedEndpointURL: "",
      suggestedRegion: "",
      isLoading: false,
    } satisfies DeploymentRegistryDefaults
  }

  return defaults
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
  const [selectedModelCatalogID, setSelectedModelCatalogID] = useState(
    modelCatalogs[0]?.id ?? ""
  )
  const [selectedCredentialID, setSelectedCredentialID] = useState("")
  const [deploymentName, setDeploymentName] = useState("")
  const [endpointURL, setEndpointURL] = useState("")
  const [region, setRegion] = useState("")
  const previousSuggestedDefaultsRef = useRef({
    endpointURL: "",
    region: "",
  })
  const previousGeneratedNameRef = useRef("")
  const resolvedModelCatalogID = modelCatalogs.some(
    (modelCatalog) => modelCatalog.id === selectedModelCatalogID
  )
    ? selectedModelCatalogID
    : modelCatalogs[0]?.id ?? ""

  const selectedModelCatalog = modelCatalogs.find(
    (modelCatalog) => modelCatalog.id === resolvedModelCatalogID
  )
  const matchingCredentials = selectedModelCatalog
    ? providerCredentials.filter(
        (credential) => credential.provider === selectedModelCatalog.provider
      )
    : []
  const deploymentDefaults = useDeploymentRegistryDefaults({
    enabled: Boolean(workspaceId && selectedModelCatalog),
    modelCatalog: selectedModelCatalog,
    t,
  })
  const canCreate =
    Boolean(workspaceId) &&
    modelCatalogs.length > 0 &&
    matchingCredentials.length > 0
  const generatedDeploymentName = selectedModelCatalog
    ? `${selectedModelCatalog.canonical_name}-default`
    : ""
  const resolvedCredentialID = matchingCredentials.some(
    (credential) => credential.id === selectedCredentialID
  )
    ? selectedCredentialID
    : matchingCredentials[0]?.id ?? ""

  useEffect(() => {
    setDeploymentName((current) => {
      if (current.trim() === "" || current === previousGeneratedNameRef.current) {
        return generatedDeploymentName
      }

      return current
    })
    previousGeneratedNameRef.current = generatedDeploymentName
  }, [generatedDeploymentName])

  useEffect(() => {
    const previous = previousSuggestedDefaultsRef.current

    setEndpointURL((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.endpointURL) {
        return deploymentDefaults.suggestedEndpointURL
      }

      return current
    })
    setRegion((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.region) {
        return deploymentDefaults.suggestedRegion
      }

      return current
    })

    previousSuggestedDefaultsRef.current = {
      endpointURL: deploymentDefaults.suggestedEndpointURL,
      region: deploymentDefaults.suggestedRegion,
    }
  }, [
    deploymentDefaults.suggestedEndpointURL,
    deploymentDefaults.suggestedRegion,
  ])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }

    if (!resolvedModelCatalogID || !resolvedCredentialID) {
      setError(
        matchingCredentials.length === 0
          ? t("forms.noMatchingCredentials")
          : t("forms.deploymentPrerequisite")
      )
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
          model_catalog_id: resolvedModelCatalogID,
          credential_id: resolvedCredentialID,
          deployment_name: deploymentName,
          region,
          endpoint_url: endpointURL,
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
      setSelectedModelCatalogID(modelCatalogs[0]?.id ?? "")
      setSelectedCredentialID("")
      setDeploymentName("")
      setEndpointURL("")
      setRegion("")
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
            value={deploymentName}
            onChange={(event) => {
              setDeploymentName(event.currentTarget.value)
              setSuccess(undefined)
              setError(undefined)
            }}
            disabled={!workspaceId || modelCatalogs.length === 0}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel id="deployment-model-catalog-label">
              {t("forms.modelCatalog")}
            </FieldLabel>
            <Select
              name="model-catalog-id"
              items={modelCatalogs.map((modelCatalog) => ({
                label: modelCatalog.canonical_name,
                value: modelCatalog.id,
              }))}
              value={resolvedModelCatalogID || null}
              disabled={!workspaceId || modelCatalogs.length === 0}
              required
              onValueChange={(value) => {
                setSelectedModelCatalogID(String(value ?? ""))
                setSuccess(undefined)
                setError(undefined)
              }}
            >
              <SelectTrigger
                id="model-catalog-id"
                aria-labelledby="deployment-model-catalog-label"
                className="w-full"
              >
                <SelectValue placeholder={t("forms.modelCatalog")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {modelCatalogs.map((modelCatalog) => (
                    <SelectItem key={modelCatalog.id} value={modelCatalog.id}>
                      {modelCatalog.canonical_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel id="deployment-credential-label">
              {t("forms.credential")}
            </FieldLabel>
            <Select
              name="credential-id"
              items={matchingCredentials.map((credential) => ({
                label: credential.credential_name,
                value: credential.id,
              }))}
              value={resolvedCredentialID || null}
              disabled={!workspaceId || matchingCredentials.length === 0}
              required
              onValueChange={(value) => {
                setSelectedCredentialID(String(value ?? ""))
                setSuccess(undefined)
                setError(undefined)
              }}
            >
              <SelectTrigger
                id="credential-id"
                aria-labelledby="deployment-credential-label"
                className="w-full"
              >
                <SelectValue placeholder={t("forms.credential")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {matchingCredentials.map((credential) => (
                    <SelectItem key={credential.id} value={credential.id}>
                      {credential.credential_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {workspaceId && matchingCredentials.length === 0 ? (
              <FieldDescription>{t("forms.noMatchingCredentials")}</FieldDescription>
            ) : null}
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="endpoint-url">{t("forms.endpointUrl")}</FieldLabel>
          <Input
            id="endpoint-url"
            name="endpoint-url"
            type="url"
            value={endpointURL}
            onChange={(event) => {
              setEndpointURL(event.currentTarget.value)
              setSuccess(undefined)
              setError(undefined)
            }}
            disabled={!workspaceId || modelCatalogs.length === 0}
          />
          <FieldDescription>
            {suggestedValueText({
              isLoading: deploymentDefaults.isLoading,
              registryValue: deploymentDefaults.suggestedEndpointURL,
              fallbackKey: "forms.deploymentDefaultsHelp",
              t,
            })}
          </FieldDescription>
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="deployment-region">
              {t("dashboard.region")}
            </FieldLabel>
            <Input
              id="deployment-region"
              name="deployment-region"
              value={region}
              onChange={(event) => {
                setRegion(event.currentTarget.value)
                setSuccess(undefined)
                setError(undefined)
              }}
              disabled={!workspaceId || modelCatalogs.length === 0}
            />
            <FieldDescription>
              {suggestedValueText({
                isLoading: deploymentDefaults.isLoading,
                registryValue: deploymentDefaults.suggestedRegion,
                fallbackKey: "forms.deploymentDefaultsHelp",
                t,
              })}
            </FieldDescription>
            {deploymentDefaults.error ? (
              <FieldError>{deploymentDefaults.error}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="priority">{t("dashboard.priority")}</FieldLabel>
            <Input
              id="priority"
              name="priority"
              type="number"
              defaultValue="1"
              min="0"
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
              min="0"
              disabled={!canCreate}
              required
            />
          </Field>
        </div>
        <Button
          type="submit"
          disabled={
            !canCreate ||
            isPending ||
            resolvedModelCatalogID.trim() === "" ||
            resolvedCredentialID.trim() === "" ||
            deploymentName.trim() === ""
          }
        >
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
  const [selectedModelCatalogID, setSelectedModelCatalogID] = useState(
    deployment.model_catalog_id
  )
  const [selectedCredentialID, setSelectedCredentialID] = useState(
    deployment.credential_id
  )
  const [deploymentName, setDeploymentName] = useState(deployment.deployment_name)
  const [endpointURL, setEndpointURL] = useState(deployment.endpoint_url)
  const [region, setRegion] = useState(deployment.region)
  const previousSuggestedDefaultsRef = useRef({
    endpointURL: "",
    region: "",
  })
  const previousGeneratedNameRef = useRef("")
  const resolvedModelCatalogID = modelCatalogs.some(
    (modelCatalog) => modelCatalog.id === selectedModelCatalogID
  )
    ? selectedModelCatalogID
    : deployment.model_catalog_id
  const selectedModelCatalog = modelCatalogs.find(
    (modelCatalog) => modelCatalog.id === resolvedModelCatalogID
  )
  const matchingCredentials = selectedModelCatalog
    ? providerCredentials.filter(
        (credential) => credential.provider === selectedModelCatalog.provider
      )
    : []
  const deploymentDefaults = useDeploymentRegistryDefaults({
    enabled: open && Boolean(selectedModelCatalog),
    modelCatalog: selectedModelCatalog,
    t,
  })
  const generatedDeploymentName = selectedModelCatalog
    ? `${selectedModelCatalog.canonical_name}-default`
    : ""
  const resolvedCredentialID = matchingCredentials.some(
    (credential) => credential.id === selectedCredentialID
  )
    ? selectedCredentialID
    : matchingCredentials[0]?.id ?? ""

  useEffect(() => {
    if (!open) {
      return
    }

    setDeploymentName((current) => {
      if (current.trim() === "" || current === previousGeneratedNameRef.current) {
        return generatedDeploymentName
      }

      return current
    })
    previousGeneratedNameRef.current = generatedDeploymentName
  }, [generatedDeploymentName, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const previous = previousSuggestedDefaultsRef.current

    setEndpointURL((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.endpointURL) {
        return deploymentDefaults.suggestedEndpointURL
      }

      return current
    })
    setRegion((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.region) {
        return deploymentDefaults.suggestedRegion
      }

      return current
    })

    previousSuggestedDefaultsRef.current = {
      endpointURL: deploymentDefaults.suggestedEndpointURL,
      region: deploymentDefaults.suggestedRegion,
    }
  }, [
    deploymentDefaults.suggestedEndpointURL,
    deploymentDefaults.suggestedRegion,
    open,
  ])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)

    if (!resolvedModelCatalogID || !resolvedCredentialID) {
      setError(t("forms.noMatchingCredentials"))
      return
    }

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
            model_catalog_id: resolvedModelCatalogID,
            credential_id: resolvedCredentialID,
            deployment_name: deploymentName,
            region,
            endpoint_url: endpointURL,
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setSelectedModelCatalogID(deployment.model_catalog_id)
          setSelectedCredentialID(deployment.credential_id)
          setDeploymentName(deployment.deployment_name)
          setEndpointURL(deployment.endpoint_url)
          setRegion(deployment.region)
          previousSuggestedDefaultsRef.current = {
            endpointURL: "",
            region: "",
          }
          previousGeneratedNameRef.current =
            `${deployment.model_canonical_name}-default`
        }
        setOpen(nextOpen)
        setError(undefined)
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="xs" />}>
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
                value={deploymentName}
                onChange={(event) => {
                  setDeploymentName(event.currentTarget.value)
                  setError(undefined)
                }}
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel id={`edit-model-catalog-label-${deployment.id}`}>
                  {t("forms.modelCatalog")}
                </FieldLabel>
                <Select
                  name="edit-model-catalog-id"
                  items={modelCatalogs.map((modelCatalog) => ({
                    label: modelCatalog.canonical_name,
                    value: modelCatalog.id,
                  }))}
                  value={resolvedModelCatalogID || null}
                  required
                  onValueChange={(value) => {
                    setSelectedModelCatalogID(String(value ?? ""))
                    setError(undefined)
                  }}
                >
                  <SelectTrigger
                    id={`edit-model-catalog-id-${deployment.id}`}
                    aria-labelledby={`edit-model-catalog-label-${deployment.id}`}
                    className="w-full"
                  >
                    <SelectValue placeholder={t("forms.modelCatalog")} />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {modelCatalogs.map((modelCatalog) => (
                        <SelectItem key={modelCatalog.id} value={modelCatalog.id}>
                          {modelCatalog.canonical_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel id={`edit-credential-label-${deployment.id}`}>
                  {t("forms.credential")}
                </FieldLabel>
                <Select
                  name="edit-credential-id"
                  items={matchingCredentials.map((credential) => ({
                    label: credential.credential_name,
                    value: credential.id,
                  }))}
                  value={resolvedCredentialID || null}
                  disabled={matchingCredentials.length === 0}
                  required
                  onValueChange={(value) => {
                    setSelectedCredentialID(String(value ?? ""))
                    setError(undefined)
                  }}
                >
                  <SelectTrigger
                    id={`edit-credential-id-${deployment.id}`}
                    aria-labelledby={`edit-credential-label-${deployment.id}`}
                    className="w-full"
                  >
                    <SelectValue placeholder={t("forms.credential")} />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {matchingCredentials.map((credential) => (
                        <SelectItem key={credential.id} value={credential.id}>
                          {credential.credential_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {matchingCredentials.length === 0 ? (
                  <FieldDescription>{t("forms.noMatchingCredentials")}</FieldDescription>
                ) : null}
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
                value={endpointURL}
                onChange={(event) => {
                  setEndpointURL(event.currentTarget.value)
                  setError(undefined)
                }}
              />
              <FieldDescription>
                {suggestedValueText({
                  isLoading: deploymentDefaults.isLoading,
                  registryValue: deploymentDefaults.suggestedEndpointURL,
                  fallbackKey: "forms.deploymentDefaultsHelp",
                  t,
                })}
              </FieldDescription>
            </Field>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field>
                <FieldLabel htmlFor={`edit-deployment-region-${deployment.id}`}>
                  {t("dashboard.region")}
                </FieldLabel>
                <Input
                  id={`edit-deployment-region-${deployment.id}`}
                  name="edit-deployment-region"
                  value={region}
                  onChange={(event) => {
                    setRegion(event.currentTarget.value)
                    setError(undefined)
                  }}
                />
                <FieldDescription>
                  {suggestedValueText({
                    isLoading: deploymentDefaults.isLoading,
                    registryValue: deploymentDefaults.suggestedRegion,
                    fallbackKey: "forms.deploymentDefaultsHelp",
                    t,
                  })}
                </FieldDescription>
                {deploymentDefaults.error ? (
                  <FieldError>{deploymentDefaults.error}</FieldError>
                ) : null}
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
                <DashboardFormSelect
                  id={`edit-status-${deployment.id}`}
                  name="edit-status"
                  label={t("nav.status")}
                  defaultValue={deployment.status}
                  required
                  options={activeStatusOptions(t)}
                />
              </Field>
            </div>
            <FieldError>{error}</FieldError>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="submit"
              disabled={
                isPending ||
                resolvedModelCatalogID.trim() === "" ||
                resolvedCredentialID.trim() === "" ||
                deploymentName.trim() === ""
              }
            >
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
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<ChatSmokeResponse>()
  const [isPending, setIsPending] = useState(false)
  const [isListingModels, setIsListingModels] = useState(false)

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

  async function listModels() {
    const form = formRef.current

    if (!form) {
      return
    }

    setError(undefined)
    setResult(undefined)
    setIsListingModels(true)

    const formData = new FormData(form)

    try {
      const response = await fetch("/api/gateway/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: formData.get("gateway-api-key"),
        }),
      })
      const payload = (await response
        .json()
        .catch(() => ({}))) as ChatSmokeResponse

      setResult(payload)

      if (!response.ok) {
        throw new Error(chatSmokeError(payload, t("forms.listModelsFailed")))
      }
    } catch (submitError) {
      setError(errorText(submitError, t("forms.listModelsFailed")))
    } finally {
      setIsListingModels(false)
    }
  }

  return (
    <form ref={formRef} className="rounded-lg border p-3" onSubmit={handleSubmit}>
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
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending || isListingModels}
            onClick={listModels}
          >
            {isListingModels ? t("actions.loading") : t("forms.listModels")}
          </Button>
          <Button type="submit" disabled={isPending || isListingModels}>
            {isPending ? t("actions.running") : t("forms.runSmokeTest")}
          </Button>
        </div>
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

function DashboardFormSelect({
  id,
  name,
  label,
  options,
  defaultValue,
  disabled,
  required,
  size = "default",
  labelClassName,
  triggerClassName,
}: {
  id: string
  name: string
  label: string
  options: DashboardSelectOption[]
  defaultValue?: string
  disabled?: boolean
  required?: boolean
  size?: "default" | "sm"
  labelClassName?: string
  triggerClassName?: string
}) {
  const labelId = `${id}-label`

  return (
    <>
      <FieldLabel id={labelId} className={labelClassName}>
        {label}
      </FieldLabel>
      <Select
        name={name}
        items={options}
        defaultValue={defaultValue ?? null}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger
          id={id}
          aria-labelledby={labelId}
          size={size}
          className={cn("w-full", triggerClassName)}
        >
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  )
}

function memberRoleOptions(t: ReturnType<typeof useI18n>["t"]) {
  return [
    { value: "member", label: t("values.member") },
    { value: "admin", label: t("values.admin") },
  ]
}

function formatRegistrySource(
  option: ModelCatalogOption,
  t: ReturnType<typeof useI18n>["t"]
) {
  if (option.source_provider) {
    return `${option.source} ${t("dashboard.via")} ${option.source_provider}`
  }

  return option.source
}

function joinValues(values: string[] | undefined, fallback: string) {
  if (!values || values.length === 0) {
    return fallback
  }

  return values.join(", ")
}

function modelCapabilities(
  option: ModelCatalogOption,
  t: ReturnType<typeof useI18n>["t"]
) {
  const labels = [
    option.supports_vision ? t("forms.capabilityVision") : null,
    option.supports_function_calling
      ? t("forms.capabilityFunctionCalling")
      : null,
    option.supports_tool_choice ? t("forms.capabilityToolChoice") : null,
    option.supports_reasoning ? t("forms.capabilityReasoning") : null,
    option.supports_audio_input ? t("forms.capabilityAudioInput") : null,
    option.supports_audio_output ? t("forms.capabilityAudioOutput") : null,
  ].filter((label): label is string => Boolean(label))

  if (labels.length === 0) {
    return t("dashboard.notSet")
  }

  return labels.join(", ")
}

function formatTokenCount(value: number | undefined, fallback: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return value.toLocaleString()
}

function activeStatusOptions(t: ReturnType<typeof useI18n>["t"]) {
  return [
    { value: "active", label: t("values.active") },
    { value: "inactive", label: t("values.inactive") },
  ]
}

function emailVerificationOptions(t: ReturnType<typeof useI18n>["t"]) {
  return [
    { value: "true", label: t("dashboard.verified") },
    { value: "false", label: t("dashboard.unverified") },
  ]
}

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
