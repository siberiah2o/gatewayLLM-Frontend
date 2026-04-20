import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type APIKey } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type CreateAPIKeyBody = {
  workspace_id?: string
  display_name?: string
}

export async function POST(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const body = (await request.json()) as CreateAPIKeyBody
    const workspaceID = body.workspace_id?.trim()
    const displayName = body.display_name?.trim()

    if (!workspaceID || !displayName) {
      return badRequest("Workspace and display name are required.")
    }

    const apiKey = await gatewayRequest<APIKey>("/control/v1/me/api-keys", {
      method: "POST",
      token,
      body: {
        workspace_id: workspaceID,
        display_name: displayName,
        status: "active",
      },
    })

    return NextResponse.json(apiKey, { status: 201 })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
