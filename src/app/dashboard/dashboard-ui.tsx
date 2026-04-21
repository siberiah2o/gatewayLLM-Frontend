import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty"
import type { Workspace } from "@/lib/gatewayllm"
import { cn } from "@/lib/utils"
import { Building2Icon, InboxIcon } from "lucide-react"
import type { ReactNode } from "react"

export type Translator = (
  key: string,
  values?: Record<string, string | number>
) => string

type DashboardTableColumn = {
  label: string
  className?: string
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <DashboardDetailText>{detail}</DashboardDetailText>
      </CardContent>
    </Card>
  )
}

export function WorkspaceRow({
  workspace,
  t,
}: {
  workspace: Workspace
  t: Translator
}) {
  return (
    <DashboardRow className="gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center">
      <DashboardPrimaryCell
        label={t("dashboard.name")}
        title={<div className="truncate font-medium">{workspace.name}</div>}
      >
        <DashboardMonoDetailText>{workspace.id}</DashboardMonoDetailText>
      </DashboardPrimaryCell>
      <div className="flex items-center gap-2">
        <StatusBadge>{localizeValue(t, workspace.status)}</StatusBadge>
        <DashboardDetailText className="text-right">
          {workspace.billing_currency}
        </DashboardDetailText>
      </div>
    </DashboardRow>
  )
}

export function DashboardSummaryGrid({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return (
    <CardContent className={cn("grid gap-3 sm:grid-cols-2", className)} {...props} />
  )
}

export function DashboardPanelHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return <CardHeader className={cn("border-b", className)} {...props} />
}

export function DashboardPanelContent({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return <CardContent className={cn("text-sm", className)} {...props} />
}

export function DashboardStackContent({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return (
    <DashboardPanelContent className={cn("flex flex-col gap-2", className)} {...props} />
  )
}

export function DashboardSummaryTile({
  icon,
  label,
  value,
  detail,
  size = "compact",
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  size?: "compact" | "default"
}) {
  const isDefault = size === "default"

  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 rounded-md bg-muted/50",
        isDefault
          ? "grid-cols-[2rem_minmax(0,1fr)] p-3"
          : "grid-cols-[1.75rem_minmax(0,1fr)] p-2"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-foreground/10",
          isDefault ? "size-8" : "size-7"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={cn(
            "truncate font-heading font-semibold",
            isDefault ? "text-lg" : "text-base"
          )}
        >
          {value}
        </div>
        <DashboardDetailText>{detail}</DashboardDetailText>
      </div>
    </div>
  )
}

export function getWorkspaceScope(
  workspace: Workspace | undefined,
  t: Translator
) {
  return {
    label: workspace?.name ?? t("dashboard.noWorkspaceAvailable"),
    detail: workspace?.id ?? t("dashboard.notSet"),
  }
}

export function DashboardWorkspaceScopeTile({
  workspace,
  t,
}: {
  workspace?: Workspace
  t: Translator
}) {
  const scope = getWorkspaceScope(workspace, t)

  return (
    <DashboardSummaryTile
      icon={<Building2Icon className="size-4" />}
      label={t("dashboard.workspaceScope")}
      value={scope.label}
      detail={scope.detail}
    />
  )
}

export function DashboardSidebarCard({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <DashboardPanelHeader>
        <CardTitle className={cn(icon ? "flex items-center gap-2" : undefined)}>
          {icon}
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </DashboardPanelHeader>
      <DashboardStackContent>{children}</DashboardStackContent>
    </Card>
  )
}

export function EmptyState({
  message,
  icon = <InboxIcon />,
}: {
  message: string
  icon?: ReactNode
}) {
  return (
    <Empty className="min-h-32 rounded-lg border">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded-md border px-1.5 text-[0.72rem] font-medium">
      {children}
    </span>
  )
}

export function DashboardRow({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid gap-2.5 rounded-lg border p-2.5 text-sm", className)}
      {...props}
    />
  )
}

function DashboardMobileLabel({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <div className={cn("text-[0.72rem] text-muted-foreground xl:hidden", className)}>
      {label}
    </div>
  )
}

export function DashboardPrimaryCell({
  label,
  title,
  children,
  className,
}: {
  label: string
  title: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <DashboardMobileLabel label={label} />
      <div className="min-w-0">{title}</div>
      {children}
    </div>
  )
}

export function DashboardDetailText({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("block truncate text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export function DashboardMonoDetailText({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "block truncate font-mono text-xs tabular-nums text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export function DashboardActionCluster({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dashboard-action-cluster"
      className={cn(
        "flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-border/70 bg-muted/35 p-1.5 sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

export function DashboardActionCell({
  label,
  className,
  clusterClassName,
  children,
}: {
  label: string
  className?: string
  clusterClassName?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 xl:items-end", className)}>
      <DashboardMobileLabel label={label} />
      <DashboardActionCluster className={clusterClassName}>
        {children}
      </DashboardActionCluster>
    </div>
  )
}

export function DashboardTableHeader({
  columns,
  className,
}: {
  columns: DashboardTableColumn[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "hidden xl:grid xl:gap-2.5 xl:px-2.5 xl:text-[0.72rem] xl:font-medium xl:text-muted-foreground",
        className
      )}
    >
      {columns.map((column) => (
        <div key={column.label} className={column.className}>
          {column.label}
        </div>
      ))}
    </div>
  )
}

export function DashboardTableList({
  columns,
  className,
  children,
}: {
  columns: DashboardTableColumn[]
  className?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <DashboardTableHeader columns={columns} className={className} />
      {children}
    </div>
  )
}

export function DashboardRowMeta({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <DashboardMobileLabel label={label} />
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {children}
      </div>
    </div>
  )
}

export function localizeValue(t: Translator, value: string) {
  const key = `values.${value.toLowerCase().replaceAll(" ", "_")}`
  const translated = t(key)

  return translated === key ? value : translated
}
