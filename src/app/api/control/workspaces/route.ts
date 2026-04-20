import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type Workspace } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type CreateWorkspaceBody = {
  name?: string
  billing_currency?: string
}

export async function POST(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const body = (await request.json()) as CreateWorkspaceBody
    const name = body.name?.trim()
    const billingCurrency = (body.billing_currency?.trim() || "USD").toUpperCase()

    if (!name) {
      return badRequest("Workspace name is required.")
    }

    const workspace = await gatewayRequest<Workspace>("/control/v1/workspaces", {
      method: "POST",
      token,
      body: {
        name,
        status: "active",
        billing_currency: billingCurrency,
      },
    })

    return NextResponse.json(workspace, { status: 201 })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
