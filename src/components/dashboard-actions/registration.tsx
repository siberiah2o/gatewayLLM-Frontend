"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n-provider"
import type { RegistrationRequest } from "@/lib/gatewayllm"
import { errorText, responseError } from "./shared"

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
