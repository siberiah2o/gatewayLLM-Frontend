import { MetricCard, localizeValue } from "../dashboard-ui"
import type { DashboardSectionContentProps } from "./types"

export function StatusSection({
  t,
  health,
  ready,
  workspaces,
  workspaceList,
  registrationRequests,
  workspaceUsers,
  workspaceMembers,
  modelDeployments,
  balance,
  showRegistration,
  showUserManagement,
  showMemberManagement,
  showModelDeploymentManagement,
}: DashboardSectionContentProps) {
  return (
    <section
      id="status"
      className="grid auto-rows-min gap-4 md:grid-cols-3 xl:grid-cols-7"
    >
      <MetricCard
        label={t("dashboard.httpServer")}
        value={
          health.ok ? localizeValue(t, health.data.status) : t("dashboard.offline")
        }
        detail={health.ok ? health.data.service : health.error}
      />
      <MetricCard
        label={t("dashboard.readiness")}
        value={
          ready.ok ? localizeValue(t, ready.data.status) : t("dashboard.unknown")
        }
        detail={ready.ok ? "readyz" : ready.error}
      />
      <MetricCard
        label={t("dashboard.workspaces")}
        value={String(workspaceList.length)}
        detail={workspaces.ok ? t("dashboard.visibleToSession") : workspaces.error}
      />
      {showRegistration ? (
        <MetricCard
          label={t("dashboard.pendingSignups")}
          value={
            registrationRequests.ok
              ? String(registrationRequests.data.data.length)
              : "0"
          }
          detail={
            registrationRequests.ok
              ? t("dashboard.registrationRequests")
              : registrationRequests.error
          }
        />
      ) : null}
      {showUserManagement ? (
        <MetricCard
          label={t("dashboard.users")}
          value={
            workspaceUsers.ok ? String(workspaceUsers.data.data.length) : "0"
          }
          detail={
            workspaceUsers.ok
              ? t("dashboard.workspaceUsers")
              : workspaceUsers.error
          }
        />
      ) : null}
      {showMemberManagement ? (
        <MetricCard
          label={t("dashboard.members")}
          value={
            workspaceMembers.ok ? String(workspaceMembers.data.data.length) : "0"
          }
          detail={
            workspaceMembers.ok
              ? t("dashboard.workspaceMembers")
              : workspaceMembers.error
          }
        />
      ) : null}
      {showModelDeploymentManagement ? (
        <MetricCard
          label={t("dashboard.deployments")}
          value={
            modelDeployments.ok ? String(modelDeployments.data.data.length) : "0"
          }
          detail={
            modelDeployments.ok
              ? t("dashboard.activeModels")
              : modelDeployments.error
          }
        />
      ) : null}
      <MetricCard
        label={t("dashboard.monthSpend")}
        value={balance.ok ? `$${balance.data.month_to_date_spend_usd}` : "$0"}
        detail={balance.ok ? t("dashboard.monthToDate") : balance.error}
      />
    </section>
  )
}
