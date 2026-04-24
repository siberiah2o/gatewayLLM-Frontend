"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { EditIcon, PlusIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react"

import { useI18n } from "@/components/i18n-provider"
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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  DepartmentModelPermissionList,
  ModelCatalog,
  WorkspaceDepartment,
} from "@/lib/gatewayllm"
import {
  activeStatusOptions,
  ConfirmActionDialog,
  DashboardFormSelect,
  errorText,
  responseError,
} from "./shared"

export function CreateWorkspaceDepartmentForm({
  workspaceId,
}: {
  workspaceId?: string
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const canCreate = Boolean(workspaceId)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !canCreate) {
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
        `/api/control/workspaces/${encodeURIComponent(workspaceId)}/departments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.get("department-name"),
            description: formData.get("department-description"),
            status: formData.get("department-status"),
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createDepartmentFailed"))
        )
      }

      const department = (await response.json()) as WorkspaceDepartment
      setSuccess(t("actions.created", { name: department.name }))
      form.reset()
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createDepartmentFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="grid gap-2.5" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="department-name">
            {t("forms.departmentName")}
          </FieldLabel>
          <Input
            id="department-name"
            name="department-name"
            placeholder={t("forms.departmentNamePlaceholder")}
            disabled={!canCreate || isPending}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="department-description">
            {t("forms.departmentDescription")}
          </FieldLabel>
          <Textarea
            id="department-description"
            name="department-description"
            className="min-h-20"
            placeholder={t("forms.departmentDescriptionPlaceholder")}
            disabled={!canCreate || isPending}
          />
        </Field>
        <Field>
          <DashboardFormSelect
            id="department-status"
            name="department-status"
            label={t("nav.status")}
            defaultValue="active"
            disabled={!canCreate || isPending}
            options={activeStatusOptions(t)}
          />
        </Field>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
      <Button type="submit" disabled={!canCreate || isPending}>
        <PlusIcon data-icon="inline-start" />
        {isPending ? t("actions.creating") : t("forms.createDepartment")}
      </Button>
    </form>
  )
}

export function EditWorkspaceDepartmentDialog({
  workspaceId,
  department,
}: {
  workspaceId?: string
  department: WorkspaceDepartment
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const canUpdate = Boolean(workspaceId)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setError(undefined)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !canUpdate) {
      setError(t("forms.workspaceRequired"))
      return
    }

    setError(undefined)
    setIsPending(true)

    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch(
        `/api/control/workspaces/${encodeURIComponent(
          workspaceId
        )}/departments/${encodeURIComponent(department.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.get("department-name"),
            description: formData.get("department-description"),
            status: formData.get("department-status"),
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.updateDepartmentFailed"))
        )
      }

      setOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.updateDepartmentFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            title={t("actions.edit")}
            aria-label={t("actions.edit")}
          />
        }
      >
        <EditIcon />
        <span className="sr-only">{t("actions.edit")}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("forms.editDepartment")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.departmentsDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`department-name-${department.id}`}>
                {t("forms.departmentName")}
              </FieldLabel>
              <Input
                id={`department-name-${department.id}`}
                name="department-name"
                defaultValue={department.name}
                disabled={!canUpdate || isPending}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`department-description-${department.id}`}>
                {t("forms.departmentDescription")}
              </FieldLabel>
              <Textarea
                id={`department-description-${department.id}`}
                name="department-description"
                className="min-h-24"
                defaultValue={department.description}
                disabled={!canUpdate || isPending}
              />
            </Field>
            <Field>
              <DashboardFormSelect
                id={`department-status-${department.id}`}
                name="department-status"
                label={t("nav.status")}
                defaultValue={department.status === "inactive" ? "inactive" : "active"}
                disabled={!canUpdate || isPending}
                options={activeStatusOptions(t)}
              />
            </Field>
            <FieldError>{error}</FieldError>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("common.close")}
            </DialogClose>
            <Button type="submit" disabled={!canUpdate || isPending}>
              {isPending ? t("actions.saving") : t("actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ManageDepartmentModelPermissionsDialog({
  workspaceId,
  department,
  modelCatalogs,
  disabled,
}: {
  workspaceId?: string
  department: WorkspaceDepartment
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
    if (!open || !workspaceId) {
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
          )}/departments/${encodeURIComponent(
            department.id
          )}/model-permissions`,
          {
            cache: "no-store",
          }
        )

        if (!response.ok) {
          throw new Error(
            await responseError(response, t("forms.loadModelPermissionsFailed"))
          )
        }

        const permissions =
          (await response.json()) as DepartmentModelPermissionList

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
  }, [department.id, open, t, workspaceId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !canManage) {
      setError(t("forms.workspaceRequired"))
      return
    }

    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    try {
      const response = await fetch(
        `/api/control/workspaces/${encodeURIComponent(
          workspaceId
        )}/departments/${encodeURIComponent(
          department.id
        )}/model-permissions`,
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

  const knownModelIDs = new Set(
    modelCatalogs.map((modelCatalog) => modelCatalog.id)
  )
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
            size="icon-xs"
            disabled={!canManage}
            title={t("forms.modelPermissions")}
            aria-label={t("forms.modelPermissions")}
          />
        }
      >
        <ShieldCheckIcon />
        <span className="sr-only">{t("forms.modelPermissions")}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("forms.modelPermissions")}</DialogTitle>
          <DialogDescription>{department.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <FieldSet disabled={!canManage || isLoading || isPending}>
              <div className="rounded-md border bg-muted/35 p-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <FieldLegend className="mb-0">
                      {t("forms.allowedModels")}
                    </FieldLegend>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-lg font-semibold">
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
                  <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={!canManage || isLoading || isPending}
                      onClick={() =>
                        setSelectedModelIDs(
                          modelCatalogs.map((model) => model.id)
                        )
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
                    <Skeleton key={index} className="h-[4.5rem] rounded-md" />
                  ))}
                </div>
              ) : modelCatalogs.length > 0 ? (
                <div className="max-h-[24rem] overflow-auto pr-1">
                  <FieldGroup data-slot="checkbox-group" className="gap-2">
                    {modelCatalogs.map((modelCatalog) => {
                      const checkboxID = `department-model-permission-${department.id}-${modelCatalog.id}`
                      const isSelected = selectedModelIDs.includes(
                        modelCatalog.id
                      )

                      return (
                        <Field
                          key={modelCatalog.id}
                          orientation="horizontal"
                          className={cn(
                            "rounded-md border bg-background p-2.5 transition-colors",
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
                              toggleModel(
                                modelCatalog.id,
                                event.target.checked
                              )
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
                <Empty className="min-h-40 rounded-md border">
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

export function DeleteWorkspaceDepartmentButton({
  workspaceId,
  departmentId,
  disabled,
}: {
  workspaceId?: string
  departmentId: string
  disabled?: boolean
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function remove() {
    if (!workspaceId || disabled) {
      setError(t("forms.workspaceRequired"))
      return
    }

    setError(undefined)
    setIsPending(true)

    try {
      const response = await fetch(
        `/api/control/workspaces/${encodeURIComponent(
          workspaceId
        )}/departments/${encodeURIComponent(departmentId)}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.deleteDepartmentFailed"))
        )
      }

      setOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.deleteDepartmentFailed")))
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
        description={t("forms.deleteDepartmentConfirm")}
        confirmLabel={isPending ? t("actions.deleting") : t("actions.delete")}
        confirmVariant="destructive"
        confirmDisabled={isPending}
        onConfirm={remove}
        trigger={
          <>
            <Trash2Icon />
            <span className="sr-only">
              {isPending ? t("actions.deleting") : t("actions.delete")}
            </span>
          </>
        }
        triggerRender={
          <Button
            type="button"
            variant="destructive"
            size="icon-xs"
            disabled={disabled || isPending}
            title={isPending ? t("actions.deleting") : t("actions.delete")}
            aria-label={isPending ? t("actions.deleting") : t("actions.delete")}
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
