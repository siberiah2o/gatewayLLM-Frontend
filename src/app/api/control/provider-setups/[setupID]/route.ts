import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type ProviderSetup } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type PatchProviderSetupBody = {
  provider?: string
  model_name?: string
  credential_secret?: string
  credential_name?: string
  deployment_name?: string
  endpoint_url?: string
  region?: string
  priority?: string | number
  weight?: string | number
  status?: string
  update_pricing?: boolean
  pricing_currency?: string
  prompt_cache_hit_micro_amount_per_million?: string | number
  prompt_micro_amount_per_million?: string | number
  completion_micro_amount_per_million?: string | number
  prompt_microusd_per_million?: string | number
  completion_microusd_per_million?: string | number
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ setupID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { setupID } = await context.params
    const setup = await gatewayRequest<ProviderSetup>(
      `/control/v1/provider-setups/${encodeURIComponent(setupID)}`,
      { token }
    )

    return NextResponse.json(setup)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ setupID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { setupID } = await context.params
    const body = (await request.json().catch(() => ({}))) as PatchProviderSetupBody
    const priority =
      body.priority === undefined ? undefined : Number(body.priority)
    const weight = body.weight === undefined ? undefined : Number(body.weight)
    const promptCacheHitPrice =
      body.prompt_cache_hit_micro_amount_per_million === undefined
        ? undefined
        : Number(body.prompt_cache_hit_micro_amount_per_million)
    const promptPrice =
      body.prompt_micro_amount_per_million === undefined &&
      body.prompt_microusd_per_million === undefined
        ? undefined
        : Number(body.prompt_micro_amount_per_million ?? body.prompt_microusd_per_million)
    const completionPrice =
      body.completion_micro_amount_per_million === undefined &&
      body.completion_microusd_per_million === undefined
        ? undefined
        : Number(
            body.completion_micro_amount_per_million ??
              body.completion_microusd_per_million
          )

    if (
      (priority !== undefined && !Number.isInteger(priority)) ||
      (weight !== undefined && !Number.isInteger(weight))
    ) {
      return badRequest("Priority and weight must be integers.")
    }

    if (
      (promptPrice !== undefined && !Number.isFinite(promptPrice)) ||
      (promptCacheHitPrice !== undefined &&
        !Number.isFinite(promptCacheHitPrice)) ||
      (completionPrice !== undefined && !Number.isFinite(completionPrice))
    ) {
      return badRequest("Pricing values must be numbers.")
    }

    const setup = await gatewayRequest<ProviderSetup>(
      `/control/v1/provider-setups/${encodeURIComponent(setupID)}`,
      {
        method: "PATCH",
        token,
        body: {
          provider: body.provider?.trim() || undefined,
          model_name: body.model_name?.trim() || undefined,
          credential_secret: body.credential_secret?.trim() || undefined,
          credential_name: body.credential_name?.trim() || undefined,
          deployment_name: body.deployment_name?.trim() || undefined,
          endpoint_url: body.endpoint_url?.trim() || undefined,
          region: body.region?.trim() || undefined,
          priority,
          weight,
          status: body.status?.trim() || undefined,
          update_pricing: body.update_pricing,
          pricing_currency: body.pricing_currency?.trim().toUpperCase() || undefined,
          prompt_cache_hit_micro_amount_per_million: promptCacheHitPrice,
          prompt_micro_amount_per_million: promptPrice,
          completion_micro_amount_per_million: completionPrice,
        },
      }
    )

    return NextResponse.json(setup)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ setupID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { setupID } = await context.params

    await gatewayRequest(
      `/control/v1/provider-setups/${encodeURIComponent(setupID)}`,
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
