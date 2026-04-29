"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  PlusIcon,
  ShieldCheckIcon,
  UserCogIcon,
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
  DepartmentModelPermissionList,
  ModelCatalog,
  UserModelPermissionList,
  Workspace,
  WorkspaceDepartment,
  WorkspaceMember,
} from "@/lib/gatewayllm"
import {
  activeStatusOptions,
  DashboardFormSelect,
  errorText,
  memberRoleOptions,
  responseError,
} from "./shared"

const NO_DEPARTMENT_VALUE = "__none__"

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
    <form className="rounded-md border p-2.5" onSubmit={handleSubmit}>
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
              <DashboardFormSelect
                id="billing-currency"
                name="billing-currency"
                label={t("forms.currency")}
                options={[
                  { value: "USD", label: t("forms.currencyUsd") },
                  { value: "CNY", label: t("forms.currencyCny") },
                ]}
                defaultValue="USD"
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
  departments = [],
}: {
  workspaceId?: string
  departments?: WorkspaceDepartment[]
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const canCreate = Boolean(workspaceId)
  const departmentOptions = buildCreateDepartmentOptions(departments, t)
  const defaultDepartmentID =
    departmentOptions.find((option) => option.value !== NO_DEPARTMENT_VALUE)
      ?.value ?? NO_DEPARTMENT_VALUE

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
            department_id:
              formData.get("member-department") === NO_DEPARTMENT_VALUE
                ? ""
                : formData.get("member-department"),
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
            <Field>
              <DashboardFormSelect
                id="member-department"
                name="member-department"
                label={t("dashboard.department")}
                defaultValue={defaultDepartmentID}
                disabled={!canCreate || isPending}
                required
                options={departmentOptions}
              />
            </Field>
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
  departments,
  disabled,
}: {
  workspaceId?: string
  member: WorkspaceMember
  departments: WorkspaceDepartment[]
  disabled?: boolean
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const canUpdate = Boolean(workspaceId) && !disabled
  const departmentOptions = buildDepartmentOptions(departments, member, t)

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
            department_id:
              formData.get("member-row-department") === NO_DEPARTMENT_VALUE
                ? ""
                : formData.get("member-row-department"),
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.updateMemberFailed"))
        )
      }

      setOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.updateMemberFailed")))
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
            size="icon-xs"
            disabled={!canUpdate}
            title={t("forms.editMemberAccess")}
            aria-label={t("forms.editMemberAccess")}
          />
        }
      >
        <UserCogIcon />
        <span className="sr-only">{t("forms.editMemberAccess")}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("forms.editMemberAccess")}</DialogTitle>
          <DialogDescription>
            {member.display_name} · {member.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <FieldGroup className="gap-3 sm:grid sm:grid-cols-2">
              <Field>
                <DashboardFormSelect
                  id={`member-role-${member.user_id}`}
                  name="member-row-role"
                  label={t("forms.role")}
                  defaultValue={member.role === "admin" ? "admin" : "member"}
                  disabled={!canUpdate || isPending}
                  required
                  options={memberRoleOptions(t)}
                />
              </Field>
              <Field>
                <DashboardFormSelect
                  id={`member-status-${member.user_id}`}
                  name="member-row-status"
                  label={t("nav.status")}
                  defaultValue={member.status === "inactive" ? "inactive" : "active"}
                  disabled={!canUpdate || isPending}
                  required
                  options={activeStatusOptions(t)}
                />
              </Field>
            </FieldGroup>
            <Field>
              <DashboardFormSelect
                id={`member-department-${member.user_id}`}
                name="member-row-department"
                label={t("dashboard.department")}
                defaultValue={member.department_id || NO_DEPARTMENT_VALUE}
                disabled={!canUpdate || isPending}
                required
                options={departmentOptions}
              />
            </Field>
            <FieldError>{error}</FieldError>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("common.close")}
            </DialogClose>
            <Button type="submit" disabled={!canUpdate || isPending}>
              {isPending ? t("actions.saving") : t("actions.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function buildDepartmentOptions(
  departments: WorkspaceDepartment[],
  member: WorkspaceMember,
  t: ReturnType<typeof useI18n>["t"]
) {
  const options = new Map<string, string>([
    [NO_DEPARTMENT_VALUE, t("dashboard.noDepartment")],
  ])

  for (const department of departments) {
    if (
      department.status !== "active" &&
      department.id !== member.department_id
    ) {
      continue
    }

    const suffix =
      department.status === "inactive" ? ` · ${t("values.inactive")}` : ""
    options.set(department.id, `${department.name}${suffix}`)
  }

  if (member.department_id && !options.has(member.department_id)) {
    options.set(
      member.department_id,
      member.department_name || member.department_id
    )
  }

  return Array.from(options.entries()).map(([value, label]) => ({
    value,
    label,
  }))
}

function buildCreateDepartmentOptions(
  departments: WorkspaceDepartment[],
  t: ReturnType<typeof useI18n>["t"]
) {
  const options = departments
    .filter((department) => department.status === "active")
    .map((department) => ({
      value: department.id,
      label: department.name,
    }))

  return [
    ...options,
    {
      value: NO_DEPARTMENT_VALUE,
      label: t("dashboard.noDepartment"),
    },
  ]
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
  const [inheritedModelIDs, setInheritedModelIDs] = useState<string[]>([])
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
        let inheritedIDs: string[] = []

        if (member.department_id) {
          const departmentResponse = await fetch(
            `/api/control/workspaces/${encodeURIComponent(
              workspaceID
            )}/departments/${encodeURIComponent(
              member.department_id
            )}/model-permissions`,
            {
              cache: "no-store",
            }
          )

          if (!departmentResponse.ok) {
            throw new Error(
              await responseError(
                departmentResponse,
                t("forms.loadModelPermissionsFailed")
              )
            )
          }

          const departmentPermissions =
            (await departmentResponse.json()) as DepartmentModelPermissionList
          inheritedIDs = departmentPermissions.data.map(
            (permission) => permission.model_catalog_id
          )
        }

        if (!ignore) {
          const directModelIDs = permissions.data.map(
            (permission) => permission.model_catalog_id
          )
          setSelectedModelIDs(
            directModelIDs.filter((id) => !inheritedIDs.includes(id))
          )
          setInheritedModelIDs(inheritedIDs)
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
  }, [member.department_id, member.user_id, open, t, workspaceId])

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

  const inheritedModelIDSet = new Set(inheritedModelIDs)
  const effectiveModelIDSet = new Set([
    ...selectedModelIDs,
    ...inheritedModelIDs,
  ])
  const knownModelIDs = new Set(modelCatalogs.map((modelCatalog) => modelCatalog.id))
  const selectedVisibleCount = modelCatalogs.filter((modelCatalog) =>
    effectiveModelIDSet.has(modelCatalog.id)
  ).length
  const inheritedVisibleCount = modelCatalogs.filter(
    (modelCatalog) =>
      inheritedModelIDSet.has(modelCatalog.id) &&
      !selectedModelIDs.includes(modelCatalog.id)
  ).length
  const hiddenSelectedCount = Array.from(effectiveModelIDSet).filter(
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
          <DialogDescription>
            {member.display_name} · {member.email}
          </DialogDescription>
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
                    {inheritedVisibleCount > 0 ? (
                      <FieldDescription className="mt-1">
                        {t("forms.inheritedModelPermissions", {
                          count: inheritedVisibleCount,
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
                          modelCatalogs
                            .map((model) => model.id)
                            .filter((id) => !inheritedModelIDSet.has(id))
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
                      const checkboxID = `model-permission-${member.user_id}-${modelCatalog.id}`
                      const isInherited = inheritedModelIDSet.has(modelCatalog.id)
                      const isSelected =
                        selectedModelIDs.includes(modelCatalog.id) || isInherited

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
                            disabled={
                              !canManage || isLoading || isPending || isInherited
                            }
                            onChange={(event) =>
                              toggleModel(modelCatalog.id, event.target.checked)
                            }
                          />
                          <FieldContent>
                            <FieldLabel
                              htmlFor={checkboxID}
                              className="flex min-w-0 flex-wrap items-center gap-2"
                            >
                              <span className="truncate">
                                {modelCatalog.canonical_name}
                              </span>
                              {isInherited ? (
                                <span className="rounded-md border bg-muted px-1.5 py-0.5 text-xs font-medium leading-none text-muted-foreground">
                                  {t("forms.inheritedFromDepartment")}
                                </span>
                              ) : null}
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
