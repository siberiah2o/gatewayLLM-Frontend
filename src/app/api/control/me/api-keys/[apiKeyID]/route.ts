import { NextResponse } from "next/server"

import { gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ apiKeyID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { apiKeyID } = await context.params

    await gatewayRequest(
      `/control/v1/me/api-keys/${encodeURIComponent(apiKeyID)}`,
      {
        method: "DELETE",
        token,
      }
    )

    return NextResponse.json({ status: "inactive" })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
