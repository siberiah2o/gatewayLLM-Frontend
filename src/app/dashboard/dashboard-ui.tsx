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
import { cn } from "@/lib/utils"
import { InboxIcon } from "lucide-react"
import { Children, isValidElement, type ReactNode } from "react"
import type { DashboardPaginationState } from "./dashboard-pagination"
import { DashboardTablePagination } from "./dashboard-table-pagination"

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
        <CardTitle className="text-lg">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <DashboardDetailText>{detail}</DashboardDetailText>
      </CardContent>
    </Card>
  )
}

export function DashboardSummaryGrid({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return (
    <CardContent className={cn("grid gap-2.5 sm:grid-cols-2", className)} {...props} />
  )
}

export function DashboardPanelHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return (
    <CardHeader className={cn("border-b", className)} {...props}>
      {Children.toArray(children).filter(
        (child) => !isValidElement(child) || child.type !== CardDescription
      )}
    </CardHeader>
  )
}

export function DashboardPanelContent({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return (
    <CardContent
      className={cn("min-w-0 text-sm leading-5", className)}
      {...props}
    />
  )
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
        "grid min-w-0 gap-2.5 rounded-md border border-border/60 bg-muted/35",
        isDefault
          ? "grid-cols-[2rem_minmax(0,1fr)] p-3"
          : "grid-cols-[1.75rem_minmax(0,1fr)] p-2.5"
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
        <div className="text-xs leading-4 text-muted-foreground">{label}</div>
        <div
          className={cn(
            "truncate font-heading font-semibold leading-6",
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
    <Card size="sm">
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
    <Empty className="min-h-32 rounded-md border">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-md border bg-background/70 px-1.5 text-xs font-medium leading-none text-foreground/80">
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
      className={cn(
        "grid min-w-0 gap-2 rounded-md border border-border/70 bg-card p-2.5 text-sm leading-5 transition-colors hover:bg-muted/25",
        className
      )}
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
    <div className={cn("text-xs font-medium text-muted-foreground xl:hidden", className)}>
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
      className={cn(
        "block min-w-0 max-w-full truncate text-xs leading-5 text-muted-foreground",
        className
      )}
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
        "block min-w-0 max-w-full truncate font-mono text-xs leading-5 tabular-nums text-muted-foreground",
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
        "flex w-full flex-wrap items-center gap-1 rounded-md border border-border/70 bg-muted/35 p-1 sm:justify-end",
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
        "hidden min-w-0 xl:grid xl:gap-2 xl:px-2.5 xl:text-xs xl:font-medium xl:text-muted-foreground",
        className
      )}
    >
      {columns.map((column) => (
        <div
          key={column.label}
          className={cn("min-w-0 truncate", column.className)}
        >
          {column.label}
        </div>
      ))}
    </div>
  )
}

export function DashboardTableList({
  columns,
  className,
  paginationId = "table",
  pagination,
  children,
}: {
  columns: DashboardTableColumn[]
  className?: string
  paginationId?: string
  pagination?: DashboardPaginationState
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <DashboardTableHeader columns={columns} className={className} />
      <DashboardTablePagination paginationId={paginationId} pagination={pagination}>
        {children}
      </DashboardTablePagination>
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
    <div className="min-w-0 overflow-hidden">
      <DashboardMobileLabel label={label} />
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 [&>*]:min-w-0 [&>*]:max-w-full">
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
