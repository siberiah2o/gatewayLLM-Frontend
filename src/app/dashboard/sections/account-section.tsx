import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  BadgeCheckIcon,
  CalendarClockIcon,
  Clock3Icon,
  FingerprintIcon,
  MailIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import { StatusBadge, localizeValue } from "../dashboard-ui"
import type { DashboardSectionContentProps } from "./types"

export function AccountSection({ t, user }: DashboardSectionContentProps) {
  const displayName = user.display_name || user.email
  const status = user.status ? localizeValue(t, user.status) : t("dashboard.notSet")
  const verification = user.email_verified
    ? t("dashboard.verified")
    : localizeValue(t, user.email_verification_status ?? "unverified")

  return (
    <section className="grid gap-4">
      <Card id="account">
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-primary text-xl font-semibold text-primary-foreground">
              {accountInitials(displayName, user.email)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-heading text-xl font-semibold">
                {t("dashboard.signedInUser")}
              </h2>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <StatusBadge>{status}</StatusBadge>
            <StatusBadge>{verification}</StatusBadge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <UserRoundIcon className="size-4 text-muted-foreground" />
              {t("dashboard.accountIdentity")}
            </CardTitle>
            <CardDescription>{displayName}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <AccountDetail
              icon={<UserRoundIcon className="size-4" />}
              label={t("dashboard.name")}
              value={user.display_name || t("dashboard.notSet")}
            />
            <AccountDetail
              icon={<MailIcon className="size-4" />}
              label={t("dashboard.email")}
              value={user.email}
            />
            <AccountDetail
              icon={<FingerprintIcon className="size-4" />}
              label={t("dashboard.accountId")}
              value={user.id}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                {t("dashboard.accountSecurity")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <AccountDetail
                icon={<BadgeCheckIcon className="size-4" />}
                label={t("nav.status")}
                value={status}
              />
              <AccountDetail
                icon={<MailIcon className="size-4" />}
                label={t("dashboard.emailVerification")}
                value={verification}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <CalendarClockIcon className="size-4 text-muted-foreground" />
                {t("dashboard.accountTimeline")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <AccountDetail
                icon={<CalendarClockIcon className="size-4" />}
                label={t("dashboard.createdAt")}
                value={formatAccountDate(user.created_at, t("dashboard.notSet"))}
              />
              <AccountDetail
                icon={<Clock3Icon className="size-4" />}
                label={t("dashboard.updatedAt")}
                value={formatAccountDate(user.updated_at, t("dashboard.notSet"))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function AccountDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="grid min-h-14 grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 border-b py-3 last:border-b-0">
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-medium">{value}</div>
      </div>
    </div>
  )
}

function accountInitials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "GL"
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length > 1) {
    return parts
      .slice(0, 2)
      .map((part) => Array.from(part)[0])
      .join("")
      .toUpperCase()
  }

  return Array.from(source).slice(0, 2).join("").toUpperCase()
}

function formatAccountDate(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${date.toISOString().replace("T", " ").slice(0, 16)} UTC`
}
