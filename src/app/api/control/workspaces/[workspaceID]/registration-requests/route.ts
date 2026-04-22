import { NextResponse } from "next/server"

import { gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type RegistrationRequestList } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID } = await context.params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending"
    const limit = searchParams.get("limit") || "20"
    const offset = searchParams.get("offset")?.trim()
    const query = new URLSearchParams({ status, limit })
    if (offset) {
      query.set("offset", offset)
    }

    const requests = await gatewayRequest<RegistrationRequestList>(
      `/control/v1/workspaces/${encodeURIComponent(
        workspaceID
      )}/registration-requests?${query.toString()}`,
      { token }
    )

    return NextResponse.json(requests)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
