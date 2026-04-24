import {
  gatewayRequest,
  type Workspace,
  type WorkspaceList,
  type WorkspaceMemberList,
} from "@/lib/gatewayllm"
import { settle, type Settled } from "./dashboard-data"

export type DashboardWorkspaceAccess = {
  workspaces: Settled<WorkspaceList>
  activeWorkspace?: Workspace
  canManageWorkspace: boolean
}

export async function loadDashboardWorkspaceAccess(
  token: string
): Promise<DashboardWorkspaceAccess> {
  const workspaces = await settle(
    gatewayRequest<WorkspaceList>("/control/v1/me/workspaces?limit=1", {
      token,
    })
  )
  const activeWorkspace = workspaces.ok ? workspaces.data.data[0] : undefined
  const canManageWorkspace = await canManageActiveWorkspace(
    token,
    activeWorkspace
  )

  return {
    workspaces,
    activeWorkspace,
    canManageWorkspace,
  }
}

async function canManageActiveWorkspace(
  token: string,
  workspace: Workspace | undefined
) {
  if (!workspace) {
    return false
  }

  const probe = await settle(
    gatewayRequest<WorkspaceMemberList>(
      `/control/v1/workspaces/${encodeURIComponent(
        workspace.id
      )}/members?limit=1`,
      { token }
    )
  )

  return probe.ok || probe.status !== 403
}
