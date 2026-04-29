import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import {
  gatewayRequest,
  type ProviderSetup,
  type ProviderSetupList,
} from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type CreateProviderSetupBody = {
  workspace_id?: string
  provider?: string
  model_name?: string
  credential_secret?: string
  credential_name?: string
  deployment_name?: string
  endpoint_url?: string
  region?: string
  priority?: string | number
  weight?: string | number
  pricing_currency?: string
  prompt_cache_hit_micro_amount_per_million?: string | number
  prompt_micro_amount_per_million?: string | number
  completion_micro_amount_per_million?: string | number
  prompt_microusd_per_million?: string | number
  completion_microusd_per_million?: string | number
}

export async function GET(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { searchParams } = new URL(request.url)
    const params = new URLSearchParams()

    for (const key of ["workspace_id", "provider", "status", "limit", "offset"]) {
      const value = searchParams.get(key)?.trim()
      if (value) {
        params.set(key, value)
      }
    }

    const path = params.size
      ? `/control/v1/provider-setups?${params.toString()}`
      : "/control/v1/provider-setups"
    const setups = await gatewayRequest<ProviderSetupList>(path, { token })

    return NextResponse.json(setups)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const body = (await request.json()) as CreateProviderSetupBody
    const workspaceID = body.workspace_id?.trim()
    const provider = body.provider?.trim()
    const modelName = body.model_name?.trim()
    const credentialSecret = body.credential_secret?.trim()

    if (!workspaceID || !provider || !modelName || !credentialSecret) {
      return badRequest(
        "Workspace, provider, model name, and secret are required."
      )
    }

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

    const setup = await gatewayRequest<ProviderSetup>("/control/v1/provider-setups", {
      method: "POST",
      token,
      body: {
        workspace_id: workspaceID,
        provider,
        model_name: modelName,
        credential_secret: credentialSecret,
        credential_name: body.credential_name?.trim() || undefined,
        deployment_name: body.deployment_name?.trim() || undefined,
        endpoint_url: body.endpoint_url?.trim() || undefined,
        region: body.region?.trim() || undefined,
        priority,
        weight,
        pricing_currency: body.pricing_currency?.trim().toUpperCase() || undefined,
        prompt_cache_hit_micro_amount_per_million: promptCacheHitPrice,
        prompt_micro_amount_per_million: promptPrice,
        completion_micro_amount_per_million: completionPrice,
      },
    })

    return NextResponse.json(setup, { status: 201 })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
