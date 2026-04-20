import { NextResponse } from "next/server"

import { gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type RegistrationRequest } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type ApproveBody = {
  role?: string
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceID: string; requestID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID, requestID } = await context.params
    const body = (await request.json().catch(() => ({}))) as ApproveBody
    const role = body.role?.trim() || "member"

    const registration = await gatewayRequest<RegistrationRequest>(
      `/control/v1/workspaces/${encodeURIComponent(
        workspaceID
      )}/registration-requests/${encodeURIComponent(requestID)}/approve`,
      {
        method: "POST",
        token,
        body: { role },
      }
    )

    return NextResponse.json(registration)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
