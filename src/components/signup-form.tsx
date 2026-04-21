"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/i18n-provider"
import { translateKnownError } from "@/lib/i18n"

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const { locale, t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setError(undefined)
    setSuccess(undefined)

    const formData = new FormData(form)
    const workspaceID = String(formData.get("workspace-id") ?? "").trim()
    const password = String(formData.get("password") ?? "")
    const confirmPassword = String(formData.get("confirm-password") ?? "")

    if (password !== confirmPassword) {
      setError(t("auth.passwordsMismatch"))
      return
    }

    setIsPending(true)

    try {
      const response = await fetch("/api/control/registration-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceID,
          display_name: formData.get("name"),
          email: formData.get("email"),
          password,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        if (
          response.status === 404 &&
          (payload?.error?.code === "not_found" ||
            payload?.error?.code === "workspace_not_found")
        ) {
          throw new Error(t("auth.workspaceNotFound"))
        }

        if (
          response.status === 400 &&
          payload?.error?.code === "workspace_inactive"
        ) {
          throw new Error(t("auth.workspaceInactive"))
        }

        throw new Error(
          translateKnownError(
            locale,
            payload?.error?.message,
            t("auth.registrationFailed")
          )
        )
      }

      setSuccess(
        t("auth.registrationSuccess", {
          id: payload.id,
          status: localizeValue(t, payload.status),
        })
      )
      form.reset()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("auth.registrationFailed")
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card {...props}>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="workspace-id">{t("auth.workspaceId")}</FieldLabel>
              <Input
                id="workspace-id"
                name="workspace-id"
                type="text"
                autoComplete="off"
                placeholder="123e4567-e89b-12d3-a456-426614174000"
                required
                spellCheck={false}
              />
              <FieldDescription>
                {t("auth.workspaceHelp")}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="name">{t("auth.fullName")}</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder={t("auth.newUser")}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="new.user@gatewayllm.local"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">{t("auth.password")}</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
              <FieldDescription>
                {t("auth.passwordHelp")}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                {t("auth.confirmPassword")}
              </FieldLabel>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
              />
            </Field>
            <FieldError>{error}</FieldError>
            {success ? (
              <FieldDescription className="rounded-lg border bg-muted/50 p-3 text-foreground">
                {success}
              </FieldDescription>
            ) : null}
            <FieldGroup>
              <Field>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? t("auth.submitting") : t("auth.requestAccess")}
                </Button>
                <FieldDescription className="px-6 text-center">
                  {t("auth.hasAccount")}{" "}
                  <Link href="/login">{t("auth.signIn")}</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function localizeValue(
  t: (key: string, values?: Record<string, string | number>) => string,
  value: string
) {
  const key = `values.${value.toLowerCase().replaceAll(" ", "_")}`
  const translated = t(key)

  return translated === key ? value : translated
}
