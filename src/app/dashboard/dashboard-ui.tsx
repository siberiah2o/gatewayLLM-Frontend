import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Workspace } from "@/lib/gatewayllm"

export type Translator = (
  key: string,
  values?: Record<string, string | number>
) => string

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
        <div className="truncate text-xs text-muted-foreground">{detail}</div>
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
    <div className="grid gap-3 rounded-lg border p-3 text-sm md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="truncate font-medium">{workspace.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {workspace.id}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge>{localizeValue(t, workspace.status)}</StatusBadge>
        <span className="text-xs text-muted-foreground">
          {workspace.billing_currency}
        </span>
      </div>
    </div>
  )
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium">
      {children}
    </span>
  )
}

export function localizeValue(t: Translator, value: string) {
  const key = `values.${value.toLowerCase().replaceAll(" ", "_")}`
  const translated = t(key)

  return translated === key ? value : translated
}
