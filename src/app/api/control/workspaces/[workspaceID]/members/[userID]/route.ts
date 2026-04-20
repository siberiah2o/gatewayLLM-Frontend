import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type WorkspaceMember } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type UpdateWorkspaceMemberBody = {
  role?: string
  status?: string
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceID: string; userID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID, userID } = await context.params
    const body = (await request.json().catch(() => ({}))) as UpdateWorkspaceMemberBody
    const role = body.role?.trim()
    const status = body.status?.trim()

    if (role && role !== "admin" && role !== "member") {
      return badRequest("Role must be admin or member.")
    }

    if (status && status !== "active" && status !== "inactive") {
      return badRequest("Status must be active or inactive.")
    }

    const path = `/control/v1/workspaces/${encodeURIComponent(
      workspaceID
    )}/members/${encodeURIComponent(userID)}`
    const current = await gatewayRequest<WorkspaceMember>(path, { token })
    const member = await gatewayRequest<WorkspaceMember>(path, {
      method: "PUT",
      token,
      body: {
        user_id: userID,
        role: role || current.role,
        status: status || current.status,
      },
    })

    return NextResponse.json(member)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceID: string; userID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID, userID } = await context.params

    await gatewayRequest(
      `/control/v1/workspaces/${encodeURIComponent(
        workspaceID
      )}/members/${encodeURIComponent(userID)}`,
      {
        method: "DELETE",
        token,
      }
    )

    return NextResponse.json({ status: "removed" })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
