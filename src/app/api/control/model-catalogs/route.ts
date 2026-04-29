import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type ModelCatalog } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type CreateModelCatalogBody = {
  workspace_id?: string
  canonical_name?: string
  provider?: string
  pricing_currency?: string
  prompt_cache_hit_micro_amount_per_million?: string | number
  prompt_micro_amount_per_million?: string | number
  completion_micro_amount_per_million?: string | number
  prompt_microusd_per_million?: string | number
  completion_microusd_per_million?: string | number
}

function parseOptionalNumeric(value: string | number | undefined) {
  if (value === undefined) {
    return undefined
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined
  }

  return Number(value)
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
    const pricingCurrency = (body.pricing_currency?.trim() || "USD").toUpperCase()
    const promptCacheHitPrice = parseOptionalNumeric(
      body.prompt_cache_hit_micro_amount_per_million
    )
    const promptPrice = parseOptionalNumeric(
      body.prompt_micro_amount_per_million ?? body.prompt_microusd_per_million
    )
    const completionPrice = parseOptionalNumeric(
      body.completion_micro_amount_per_million ??
        body.completion_microusd_per_million
    )

    if (!workspaceID || !canonicalName || !provider) {
      return badRequest("Workspace, model name, and provider are required.")
    }

    if (
      (promptPrice !== undefined && !Number.isFinite(promptPrice)) ||
      (promptCacheHitPrice !== undefined &&
        !Number.isFinite(promptCacheHitPrice)) ||
      (completionPrice !== undefined && !Number.isFinite(completionPrice))
    ) {
      return badRequest("Pricing values must be numbers.")
    }

    if (
      (promptPrice === undefined) !== (completionPrice === undefined)
    ) {
      return badRequest("Prompt and completion pricing must be provided together.")
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
          pricing_rules:
            promptPrice === undefined || completionPrice === undefined
              ? undefined
              : {
                  version: 1,
                  currency: pricingCurrency,
                  token_rates: {
                    prompt_cache_hit_micro_amount_per_million:
                      promptCacheHitPrice ?? promptPrice,
                    prompt_micro_amount_per_million: promptPrice,
                    completion_micro_amount_per_million: completionPrice,
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
