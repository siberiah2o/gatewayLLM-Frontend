import { redirect } from "next/navigation"

import {
  GatewayAPIError,
  gatewayRequest,
  type MeResponse,
} from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"
import { loadDashboardWorkspaceAccess } from "./dashboard-access"
import { DashboardShell } from "./dashboard-shell"

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

  const { canManageWorkspace } = await loadDashboardWorkspaceAccess(token)

  return (
    <DashboardShell user={me.user} canManageWorkspace={canManageWorkspace}>
      {children}
    </DashboardShell>
  )
}
