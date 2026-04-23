"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { locale, t } = useI18n()
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setError(undefined)
    setIsPending(true)

    const formData = new FormData(form)

    try {
      const response = await fetch("/api/control/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          translateKnownError(
            locale,
            payload?.error?.message,
            t("auth.signInFailed")
          )
        )
      }

      router.push("/dashboard")
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("auth.signInFailed")
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardContent>
          <form
            action="/api/control/sessions"
            method="post"
            onSubmit={handleSubmit}
            suppressHydrationWarning
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@gatewayllm.local"
                  required
                  suppressHydrationWarning
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">{t("auth.password")}</FieldLabel>
                  <Link
                    href="/login"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  suppressHydrationWarning
                />
              </Field>
              <FieldError>{error}</FieldError>
              <Field>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? t("auth.signingIn") : t("auth.signIn")}
                </Button>
                <FieldDescription className="text-center">
                  {t("auth.noAccount")}{" "}
                  <Link href="/signup">{t("auth.signUp")}</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
