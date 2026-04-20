import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type ModelCatalog } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type StatusBody = {
  status?: string
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ modelCatalogID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { modelCatalogID } = await context.params
    const body = (await request.json().catch(() => ({}))) as StatusBody
    const status = body.status?.trim().toLowerCase() || "inactive"

    if (status !== "active" && status !== "inactive") {
      return badRequest("Status must be active or inactive.")
    }

    const path = `/control/v1/model-catalogs/${encodeURIComponent(
      modelCatalogID
    )}`
    const current = await gatewayRequest<ModelCatalog>(path, { token })
    const modelCatalog = await gatewayRequest<ModelCatalog>(path, {
      method: "PUT",
      token,
      body: {
        workspace_id: current.workspace_id,
        canonical_name: current.canonical_name,
        provider: current.provider,
        input_modalities: current.input_modalities,
        output_modalities: current.output_modalities,
        pricing_rules: current.pricing_rules ?? {},
        status,
      },
    })

    return NextResponse.json(modelCatalog)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ modelCatalogID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { modelCatalogID } = await context.params

    await gatewayRequest(
      `/control/v1/model-catalogs/${encodeURIComponent(modelCatalogID)}`,
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
