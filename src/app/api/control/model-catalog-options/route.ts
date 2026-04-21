import { NextResponse } from "next/server"

import { gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import {
  GatewayAPIError,
  gatewayRequest,
  type ModelCatalogOptions,
} from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

export async function GET(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  let hasLookupFilters = false

  try {
    const { searchParams } = new URL(request.url)
    const params = new URLSearchParams()
    const provider = searchParams.get("provider")?.trim()
    const query =
      searchParams.get("q")?.trim() || searchParams.get("query")?.trim()
    const mode = searchParams.get("mode")?.trim()
    const limit = searchParams.get("limit")?.trim()
    hasLookupFilters = Boolean(provider || query || mode)

    if (provider) {
      params.set("provider", provider)
    }
    if (query) {
      params.set("q", query)
    }
    if (mode) {
      params.set("mode", mode)
    }
    if (limit) {
      params.set("limit", limit)
    }

    const path = params.size
      ? `/control/v1/model-catalog-options?${params.toString()}`
      : "/control/v1/model-catalog-options"
    const options = await gatewayRequest<ModelCatalogOptions>(path, { token })

    return NextResponse.json(options)
  } catch (error) {
    if (
      hasLookupFilters &&
      error instanceof GatewayAPIError &&
      error.status === 404
    ) {
      return NextResponse.json(emptyModelCatalogOptions())
    }

    return gatewayErrorResponse(error)
  }
}

function emptyModelCatalogOptions(): ModelCatalogOptions {
  return {
    object: "list",
    source: "gatewayllm",
    providers: [],
    models: [],
  }
}
