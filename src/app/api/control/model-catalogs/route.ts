import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type ModelCatalog } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type CreateModelCatalogBody = {
  workspace_id?: string
  canonical_name?: string
  provider?: string
  prompt_microusd_per_million?: string | number
  completion_microusd_per_million?: string | number
}

export async function POST(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const body = (await request.json()) as CreateModelCatalogBody
    const workspaceID = body.workspace_id?.trim()
    const canonicalName = body.canonical_name?.trim()
    const provider = body.provider?.trim()
    const promptPrice = Number(body.prompt_microusd_per_million)
    const completionPrice = Number(body.completion_microusd_per_million)

    if (!workspaceID || !canonicalName || !provider) {
      return badRequest("Workspace, model name, and provider are required.")
    }

    if (!Number.isFinite(promptPrice) || !Number.isFinite(completionPrice)) {
      return badRequest("Pricing values must be numbers.")
    }

    const modelCatalog = await gatewayRequest<ModelCatalog>(
      "/control/v1/model-catalogs",
      {
        method: "POST",
        token,
        body: {
          workspace_id: workspaceID,
          canonical_name: canonicalName,
          provider,
          pricing_rules: {
            version: 1,
            currency: "USD",
            token_rates: {
              prompt_microusd_per_million: promptPrice,
              completion_microusd_per_million: completionPrice,
            },
          },
          status: "active",
        },
      }
    )

    return NextResponse.json(modelCatalog, { status: 201 })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
