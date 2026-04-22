"use client"

import { type ComponentProps, type ReactNode, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n-provider"
import {
  ConfirmActionDialog,
  errorText,
  responseError,
} from "./shared"

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
