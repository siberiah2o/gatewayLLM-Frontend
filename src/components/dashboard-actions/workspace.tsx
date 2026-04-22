"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  CheckIcon,
  PlusIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import type {
  ModelCatalog,
  UserModelPermissionList,
  Workspace,
  WorkspaceMember,
} from "@/lib/gatewayllm"
import {
  activeStatusOptions,
  ConfirmActionDialog,
  DashboardFormSelect,
  errorText,
  memberRoleOptions,
  responseError,
} from "./shared"

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
      setOpen(false)
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
