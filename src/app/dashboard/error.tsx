"use client"

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react"

import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useI18n()
  const message = error.message || t("dashboard.controlPlaneUnavailableDetail")

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/25 p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-2 flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
            <AlertTriangleIcon className="size-4" />
          </div>
          <CardTitle>{t("dashboard.controlPlaneUnavailableTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.controlPlaneUnavailableDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="rounded-md border border-border/70 bg-muted/35 px-3 py-2 font-mono text-xs leading-5 text-muted-foreground">
            {message}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reset}>
              <RefreshCwIcon className="size-4" />
              {t("actions.retry")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.href = "/login"
              }}
            >
              {t("auth.signIn")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
