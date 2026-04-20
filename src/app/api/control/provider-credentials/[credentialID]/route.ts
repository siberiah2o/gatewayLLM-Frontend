import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type ProviderCredential } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type StatusBody = {
  status?: string
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ credentialID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { credentialID } = await context.params
    const body = (await request.json().catch(() => ({}))) as StatusBody
    const status = body.status?.trim().toLowerCase() || "inactive"

    if (status !== "active" && status !== "inactive") {
      return badRequest("Status must be active or inactive.")
    }

    const path = `/control/v1/provider-credentials/${encodeURIComponent(
      credentialID
    )}`
    const current = await gatewayRequest<ProviderCredential>(path, { token })
    const credential = await gatewayRequest<ProviderCredential>(path, {
      method: "PUT",
      token,
      body: {
        workspace_id: current.workspace_id,
        provider: current.provider,
        credential_name: current.credential_name,
        status,
      },
    })

    return NextResponse.json(credential)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ credentialID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { credentialID } = await context.params

    await gatewayRequest(
      `/control/v1/provider-credentials/${encodeURIComponent(credentialID)}`,
      {
        method: "DELETE",
        token,
      }
    )

    return NextResponse.json({ status: "deleted" })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
