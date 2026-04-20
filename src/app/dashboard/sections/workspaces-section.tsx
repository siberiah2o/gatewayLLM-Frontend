import { CreateWorkspaceForm } from "@/components/dashboard-actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState, WorkspaceRow } from "../dashboard-ui"
import type { DashboardSectionContentProps } from "./types"

export function WorkspacesSection({
  t,
  workspaceList,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-4">
      <Card id="workspaces">
        <CardHeader>
          <CardTitle>{t("dashboard.workspaces")}</CardTitle>
          <CardDescription>{t("dashboard.workspacesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CreateWorkspaceForm />
          {workspaceList.length > 0 ? (
            workspaceList.map((workspace) => (
              <WorkspaceRow key={workspace.id} workspace={workspace} t={t} />
            ))
          ) : (
            <EmptyState message={t("dashboard.noWorkspaces")} />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
