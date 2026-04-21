"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/i18n-provider"
import { translateKnownError } from "@/lib/i18n"

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const { locale, t } = useI18n()
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget

    const formData = new FormData(form)
    const displayName = String(formData.get("name") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")
    const confirmPassword = String(formData.get("confirm-password") ?? "")

    if (password !== confirmPassword) {
      toast.error(t("auth.passwordsMismatch"))
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
          workspace_id: workspaceIDFromURL(),
          display_name: displayName,
          email,
          password,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        if (
          response.status === 404 &&
          (payload?.error?.code === "not_found" ||
            payload?.error?.code === "workspace_not_found" ||
            payload?.error?.code === "no_registration_workspace")
        ) {
          throw new Error(t("auth.workspaceNotFound"))
        }

        if (
          response.status === 400 &&
          payload?.error?.code === "workspace_inactive"
        ) {
          throw new Error(t("auth.workspaceInactive"))
        }

        if (
          response.status === 409 &&
          payload?.error?.code === "registration_conflict"
        ) {
          throw new Error(t("auth.registrationConflict"))
        }

        throw new Error(
          translateKnownError(
            locale,
            payload?.error?.message,
            t("auth.registrationFailed")
          )
        )
      }

      toast.success(t("auth.registrationSuccessTitle"), {
        description: t("auth.registrationSuccessDescription", {
          name: payload.display_name ?? displayName,
          email: payload.email ?? email,
          workspace: payload.workspace_id,
          status: localizeValue(t, payload.status),
        }),
      })
      form.reset()
    } catch (submitError) {
      toast.error(
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

function workspaceIDFromURL() {
  if (typeof window === "undefined") {
    return ""
  }

  return new URLSearchParams(window.location.search).get("workspace_id") ?? ""
}

function localizeValue(
  t: (key: string, values?: Record<string, string | number>) => string,
  value: string
) {
  const key = `values.${value.toLowerCase().replaceAll(" ", "_")}`
  const translated = t(key)

  return translated === key ? value : translated
}
