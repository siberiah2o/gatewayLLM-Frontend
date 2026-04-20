import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type ProviderCredential } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type CreateProviderCredentialBody = {
  workspace_id?: string
  provider?: string
  credential_name?: string
  credential_secret?: string
}

export async function POST(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const body = (await request.json()) as CreateProviderCredentialBody
    const workspaceID = body.workspace_id?.trim()
    const provider = body.provider?.trim()
    const credentialName = body.credential_name?.trim()
    const credentialSecret = body.credential_secret?.trim()

    if (!workspaceID || !provider || !credentialName || !credentialSecret) {
      return badRequest("Workspace, provider, name, and secret are required.")
    }

    const credential = await gatewayRequest<ProviderCredential>(
      "/control/v1/provider-credentials",
      {
        method: "POST",
        token,
        body: {
          workspace_id: workspaceID,
          provider,
          credential_name: credentialName,
          credential_secret: credentialSecret,
          status: "active",
        },
      }
    )

    return NextResponse.json(credential, { status: 201 })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
