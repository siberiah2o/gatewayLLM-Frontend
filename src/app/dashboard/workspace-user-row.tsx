import {
  DeleteWorkspaceUserDialog,
  EditWorkspaceUserDialog,
} from "@/components/dashboard-actions"
import type { User } from "@/lib/gatewayllm"
import {
  DashboardActionCell,
  DashboardMonoDetailText,
  DashboardPrimaryCell,
  DashboardRow,
  DashboardRowMeta,
  DashboardTableList,
  StatusBadge,
  localizeValue,
  type Translator,
} from "./dashboard-ui"

export function WorkspaceUsersTable({
  users,
  workspaceId,
  t,
}: {
  users: User[]
  workspaceId?: string
  t: Translator
}) {
  return (
    <DashboardTableList
      className="xl:grid-cols-[minmax(10rem,0.95fr)_minmax(12rem,1fr)_minmax(12rem,0.85fr)_auto]"
      columns={[
        { label: t("dashboard.name") },
        { label: t("dashboard.email") },
        { label: t("dashboard.userStatus") },
        { label: t("dashboard.actions"), className: "text-right" },
      ]}
    >
      {users.map((user) => (
        <WorkspaceUserTableRow
          key={user.id}
          user={user}
          workspaceId={workspaceId}
          t={t}
        />
      ))}
    </DashboardTableList>
  )
}

function WorkspaceUserTableRow({
  user,
  workspaceId,
  t,
}: {
  user: User
  workspaceId?: string
  t: Translator
}) {
  const isOwner = user.role === "owner"

  return (
    <DashboardRow className="xl:grid-cols-[minmax(10rem,0.95fr)_minmax(12rem,1fr)_minmax(12rem,0.85fr)_auto] xl:items-center">
      <DashboardPrimaryCell
        label={t("dashboard.name")}
        title={<div className="truncate font-medium">{user.display_name}</div>}
      >
        <DashboardMonoDetailText>{user.id}</DashboardMonoDetailText>
      </DashboardPrimaryCell>
      <DashboardPrimaryCell
        label={t("dashboard.email")}
        title={<div className="truncate">{user.email}</div>}
      />
      <DashboardRowMeta label={t("dashboard.userStatus")}>
        <StatusBadge>{localizeValue(t, user.status)}</StatusBadge>
        <StatusBadge>
          {user.email_verified
            ? t("dashboard.verified")
            : localizeValue(t, user.email_verification_status)}
        </StatusBadge>
      </DashboardRowMeta>
      <DashboardActionCell label={t("dashboard.actions")}>
        {isOwner ? (
          <div className="px-1 text-xs text-muted-foreground">
            {t("dashboard.protectedOwner")}
          </div>
        ) : (
          <>
            <EditWorkspaceUserDialog workspaceId={workspaceId} user={user} />
            <DeleteWorkspaceUserDialog workspaceId={workspaceId} user={user} />
          </>
        )}
      </DashboardActionCell>
    </DashboardRow>
  )
}
