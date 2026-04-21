import { redirect } from "next/navigation"

import {
  GatewayAPIError,
  gatewayRequest,
  type MeResponse,
  type WorkspaceList,
} from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"
import { DashboardShell } from "./dashboard-shell"
import { settle } from "./dashboard-data"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const token = await getSessionToken()

  if (!token) {
    redirect("/login")
  }

  let me: MeResponse

  try {
    me = await gatewayRequest<MeResponse>("/control/v1/me", { token })
  } catch (error) {
    if (error instanceof GatewayAPIError && error.status === 401) {
      redirect("/login")
    }

    throw error
  }

  const workspaces = await settle(
    gatewayRequest<WorkspaceList>("/control/v1/me/workspaces?limit=20", {
      token,
    })
  )

  return (
    <DashboardShell
      user={me.user}
      workspaces={workspaces.ok ? workspaces.data.data : []}
    >
      {children}
    </DashboardShell>
  )
}
