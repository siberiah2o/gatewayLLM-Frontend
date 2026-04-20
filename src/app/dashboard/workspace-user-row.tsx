import {
  DeleteWorkspaceUserDialog,
  EditWorkspaceUserDialog,
  ManageModelPermissionsDialog,
} from "@/components/dashboard-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ModelCatalog, User, WorkspaceMember } from "@/lib/gatewayllm"
import {
  StatusBadge,
  localizeValue,
  type Translator,
} from "./dashboard-ui"

export function WorkspaceUsersTable({
  users,
  workspaceId,
  modelCatalogs,
  t,
}: {
  users: User[]
  workspaceId?: string
  modelCatalogs: ModelCatalog[]
  t: Translator
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("dashboard.name")}</TableHead>
          <TableHead>{t("dashboard.email")}</TableHead>
          <TableHead>{t("forms.role")}</TableHead>
          <TableHead>{t("dashboard.userStatus")}</TableHead>
          <TableHead>{t("dashboard.workspaceStatus")}</TableHead>
          <TableHead>{t("dashboard.emailVerification")}</TableHead>
          <TableHead className="text-right">{t("dashboard.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <WorkspaceUserTableRow
            key={user.id}
            user={user}
            workspaceId={workspaceId}
            modelCatalogs={modelCatalogs}
            t={t}
          />
        ))}
      </TableBody>
    </Table>
  )
}

function WorkspaceUserTableRow({
  user,
  workspaceId,
  modelCatalogs,
  t,
}: {
  user: User
  workspaceId?: string
  modelCatalogs: ModelCatalog[]
  t: Translator
}) {
  const member = workspaceMemberFromUser(user)
  const isOwner = user.role === "owner"

  return (
    <TableRow>
      <TableCell className="min-w-48">
        <div className="font-medium">{user.display_name}</div>
        <div className="max-w-64 truncate text-xs text-muted-foreground">
          {user.id}
        </div>
      </TableCell>
      <TableCell className="min-w-56">
        <div className="max-w-72 truncate">{user.email}</div>
      </TableCell>
      <TableCell>
        {user.role ? (
          <StatusBadge>{localizeValue(t, user.role)}</StatusBadge>
        ) : null}
      </TableCell>
      <TableCell>
        <StatusBadge>{localizeValue(t, user.status)}</StatusBadge>
      </TableCell>
      <TableCell>
        {user.workspace_member_status ? (
          <StatusBadge>
            {localizeValue(t, user.workspace_member_status)}
          </StatusBadge>
        ) : null}
      </TableCell>
      <TableCell>
        <StatusBadge>
          {user.email_verified
            ? t("dashboard.verified")
            : localizeValue(t, user.email_verification_status)}
        </StatusBadge>
      </TableCell>
      <TableCell className="min-w-64 text-right">
        {isOwner ? (
          <div className="text-xs text-muted-foreground">
            {t("dashboard.protectedOwner")}
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <EditWorkspaceUserDialog workspaceId={workspaceId} user={user} />
            <ManageModelPermissionsDialog
              workspaceId={workspaceId}
              member={member}
              modelCatalogs={modelCatalogs}
            />
            <DeleteWorkspaceUserDialog
              workspaceId={workspaceId}
              user={user}
            />
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

function workspaceMemberFromUser(user: User): WorkspaceMember {
  return {
    workspace_id: user.workspace_id ?? "",
    user_id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role ?? "member",
    status: user.workspace_member_status ?? "active",
    created_at: user.created_at,
  }
}
