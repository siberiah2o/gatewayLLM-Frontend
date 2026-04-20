import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { InfoRow, localizeValue } from "../dashboard-ui"
import type { DashboardSectionContentProps } from "./types"

export function AccountSection({ t, user }: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="account">
        <CardHeader>
          <CardTitle>{t("dashboard.signedInUser")}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <InfoRow
            label={t("dashboard.name")}
            value={user.display_name || t("dashboard.notSet")}
          />
          <InfoRow
            label={t("nav.status")}
            value={
              user.status
                ? localizeValue(t, user.status)
                : t("dashboard.notSet")
            }
          />
          <InfoRow
            label={t("dashboard.email")}
            value={
              user.email_verified
                ? t("dashboard.verified")
                : localizeValue(t, user.email_verification_status ?? "unverified")
            }
          />
        </CardContent>
      </Card>
    </section>
  )
}
