import {
  Card,
  CardDescription,
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

import {
  DashboardMonoDetailText,
  DashboardPanelContent,
  DashboardPanelHeader,
  DashboardSummaryGrid,
  DashboardSummaryTile,
  localizeValue,
} from "./dashboard-ui"
import type { DashboardSectionContentProps } from "./dashboard-section-types"

export function AccountSection({ t, user }: DashboardSectionContentProps) {
  const displayName = user.display_name || user.email
  const status = user.status ? localizeValue(t, user.status) : t("dashboard.notSet")
  const verification = user.email_verified
    ? t("dashboard.verified")
    : localizeValue(t, user.email_verification_status ?? "unverified")

  return (
    <section className="grid gap-4">
      <Card id="account">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={
              <span className="text-xs font-semibold">
                {accountInitials(displayName, user.email)}
              </span>
            }
            label={t("dashboard.signedInUser")}
            value={displayName}
            detail={user.email}
            size="default"
          />
          <DashboardSummaryTile
            icon={<ShieldCheckIcon className="size-4" />}
            label={t("dashboard.accountSecurity")}
            value={status}
            detail={verification}
            size="default"
          />
        </DashboardSummaryGrid>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <DashboardPanelHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRoundIcon className="size-4 text-muted-foreground" />
              {t("dashboard.accountIdentity")}
            </CardTitle>
            <CardDescription>{displayName}</CardDescription>
          </DashboardPanelHeader>
          <DashboardPanelContent>
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
              valueClassName="font-mono text-sm tabular-nums text-muted-foreground"
            />
          </DashboardPanelContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <DashboardPanelHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                {t("dashboard.accountSecurity")}
              </CardTitle>
            </DashboardPanelHeader>
            <DashboardPanelContent>
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
            </DashboardPanelContent>
          </Card>

          <Card>
            <DashboardPanelHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClockIcon className="size-4 text-muted-foreground" />
                {t("dashboard.accountTimeline")}
              </CardTitle>
            </DashboardPanelHeader>
            <DashboardPanelContent>
              <AccountDetail
                icon={<CalendarClockIcon className="size-4" />}
                label={t("dashboard.createdAt")}
                value={formatAccountDate(user.created_at, t("dashboard.notSet"))}
                valueClassName="font-mono text-sm tabular-nums text-foreground/80"
              />
              <AccountDetail
                icon={<Clock3Icon className="size-4" />}
                label={t("dashboard.updatedAt")}
                value={formatAccountDate(user.updated_at, t("dashboard.notSet"))}
                valueClassName="font-mono text-sm tabular-nums text-foreground/80"
              />
            </DashboardPanelContent>
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
  valueClassName,
}: {
  icon: ReactNode
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="grid min-h-14 grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 border-b py-3 last:border-b-0">
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        {valueClassName ? (
          <DashboardMonoDetailText className={valueClassName}>
            {value}
          </DashboardMonoDetailText>
        ) : (
          <div className="truncate font-medium">{value}</div>
        )}
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
