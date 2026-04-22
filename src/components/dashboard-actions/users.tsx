"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { PencilIcon, Trash2Icon } from "lucide-react"

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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/i18n-provider"
import type { User } from "@/lib/gatewayllm"
import {
  activeStatusOptions,
  DashboardFormSelect,
  emailVerificationOptions,
  errorText,
  responseError,
} from "./shared"

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
