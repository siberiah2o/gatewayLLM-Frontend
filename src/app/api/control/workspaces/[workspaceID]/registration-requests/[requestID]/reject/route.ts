import { NextResponse } from "next/server"

import { gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type RegistrationRequest } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

export async function POST(
  _request: Request,
  context: { params: Promise<{ workspaceID: string; requestID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID, requestID } = await context.params

    const registration = await gatewayRequest<RegistrationRequest>(
      `/control/v1/workspaces/${encodeURIComponent(
        workspaceID
      )}/registration-requests/${encodeURIComponent(requestID)}/reject`,
      {
        method: "POST",
        token,
      }
    )

    return NextResponse.json(registration)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
