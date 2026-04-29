import {
  DeleteWorkspaceUserDialog,
  EditWorkspaceUserDialog,
} from "@/components/dashboard-actions/users"
import {
  ManageModelPermissionsDialog,
  UpdateWorkspaceMemberForm,
} from "@/components/dashboard-actions/workspace"
import type {
  ModelCatalog,
  User,
  WorkspaceDepartment,
  WorkspaceMember,
} from "@/lib/gatewayllm"
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
import type { DashboardPaginationState } from "./dashboard-pagination"

export function WorkspaceUsersTable({
  users,
  workspaceId,
  modelCatalogs,
  departments,
  pagination,
  t,
}: {
  users: User[]
  workspaceId?: string
  modelCatalogs: ModelCatalog[]
  departments: WorkspaceDepartment[]
  pagination?: DashboardPaginationState
  t: Translator
}) {
  return (
    <DashboardTableList
      className="xl:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(9rem,0.7fr)_auto]"
      paginationId="workspace_users"
      pagination={pagination}
      columns={[
        { label: t("dashboard.name") },
        { label: t("dashboard.email") },
        { label: t("nav.access") },
        { label: t("dashboard.userStatus") },
        { label: t("dashboard.actions"), className: "text-right" },
      ]}
    >
      {users.map((user) => (
        <WorkspaceUserTableRow
          key={user.id}
          user={user}
          workspaceId={workspaceId}
          modelCatalogs={modelCatalogs}
          departments={departments}
          t={t}
        />
      ))}
    </DashboardTableList>
  )
}

function WorkspaceUserTableRow({
  user,
  workspaceId,
  modelCatalogs,
  departments,
  t,
}: {
  user: User
  workspaceId?: string
  modelCatalogs: ModelCatalog[]
  departments: WorkspaceDepartment[]
  t: Translator
}) {
  const isOwner = user.role === "owner"
  const isAdminAccess = user.role === "owner" || user.role === "admin"
  const member = toWorkspaceMember(user, workspaceId)
  const accessRoleLabel = isAdminAccess
    ? localizeValue(t, "admin")
    : localizeValue(t, user.role || "member")
  const accessDetailLabel = isAdminAccess
    ? "admin"
    : user.department_name?.trim() ||
      user.department_id?.trim() ||
      t("dashboard.noDepartment")

  return (
    <DashboardRow className="gap-2 rounded-md p-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(9rem,0.7fr)_auto] xl:items-center">
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
      <DashboardRowMeta label={t("nav.access")}>
        <StatusBadge>{accessRoleLabel}</StatusBadge>
        <span className="truncate text-xs text-muted-foreground">
          {accessDetailLabel}
        </span>
      </DashboardRowMeta>
      <DashboardRowMeta label={t("dashboard.userStatus")}>
        <StatusBadge>{localizeValue(t, user.status)}</StatusBadge>
        <StatusBadge>
          {user.email_verified
            ? t("dashboard.verified")
            : localizeValue(t, user.email_verification_status)}
        </StatusBadge>
      </DashboardRowMeta>
      <DashboardActionCell
        label={t("dashboard.actions")}
        clusterClassName="w-auto rounded-md p-1"
      >
        {isOwner ? (
          <div className="px-1 text-xs text-muted-foreground">
            {t("dashboard.protectedOwner")}
          </div>
        ) : (
          <>
            <EditWorkspaceUserDialog workspaceId={workspaceId} user={user} />
            <UpdateWorkspaceMemberForm
              workspaceId={workspaceId}
              member={member}
              departments={departments}
            />
            <ManageModelPermissionsDialog
              workspaceId={workspaceId}
              member={member}
              modelCatalogs={modelCatalogs}
            />
            <DeleteWorkspaceUserDialog workspaceId={workspaceId} user={user} />
          </>
        )}
      </DashboardActionCell>
    </DashboardRow>
  )
}

function toWorkspaceMember(
  user: User,
  workspaceId?: string
): WorkspaceMember {
  return {
    workspace_id: user.workspace_id || workspaceId || "",
    user_id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role || "member",
    status: user.workspace_member_status || "active",
    department_id: user.department_id,
    department_name: user.department_name,
    department_status: user.department_status,
    created_at: user.created_at,
  }
}
