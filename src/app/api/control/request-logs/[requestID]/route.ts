import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type RequestLog } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

export async function GET(
  request: Request,
  context: { params: Promise<{ requestID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { requestID } = await context.params
    const { searchParams } = new URL(request.url)
    const workspaceID = searchParams.get("workspace_id")?.trim()

    if (!workspaceID) {
      return badRequest("workspace_id is required.")
    }

    const requestLog = await gatewayRequest<RequestLog>(
      `/control/v1/request-logs/${encodeURIComponent(
        requestID
      )}?workspace_id=${encodeURIComponent(workspaceID)}`,
      {
        token,
      }
    )

    return NextResponse.json(requestLog)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
