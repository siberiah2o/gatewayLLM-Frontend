"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  CopyIcon,
  EyeIcon,
  PlusIcon,
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import type { APIKey } from "@/lib/gatewayllm"
import { errorText, responseError } from "./shared"

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
          <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-2.5 text-sm">
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
            <div className="rounded-md border border-dashed p-2.5 text-muted-foreground">
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
