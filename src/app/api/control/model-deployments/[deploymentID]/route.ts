import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type ModelDeployment } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type UpdateModelDeploymentBody = {
  model_catalog_id?: string
  credential_id?: string
  deployment_name?: string
  region?: string
  endpoint_url?: string
  priority?: string | number
  weight?: string | number
  status?: string
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ deploymentID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { deploymentID } = await context.params
    const body = (await request.json().catch(() => ({}))) as UpdateModelDeploymentBody

    const path = `/control/v1/model-deployments/${encodeURIComponent(
      deploymentID
    )}`
    const current = await gatewayRequest<ModelDeployment>(path, { token })
    const status = body.status?.trim().toLowerCase() || current.status
    const priority =
      body.priority === undefined ? current.priority : Number(body.priority)
    const weight = body.weight === undefined ? current.weight : Number(body.weight)
    const deploymentName = body.deployment_name?.trim() || current.deployment_name
    const endpointURL =
      body.endpoint_url === undefined
        ? current.endpoint_url
        : body.endpoint_url.trim()
    const region =
      body.region === undefined ? current.region : body.region.trim()

    if (status !== "active" && status !== "inactive") {
      return badRequest("Status must be active or inactive.")
    }

    if (!Number.isInteger(priority) || priority < 0) {
      return badRequest("Priority must be a non-negative integer.")
    }

    if (!Number.isInteger(weight) || weight < 0) {
      return badRequest("Weight must be a non-negative integer.")
    }

    const deployment = await gatewayRequest<ModelDeployment>(path, {
      method: "PUT",
      token,
      body: {
        workspace_id: current.workspace_id,
        model_catalog_id:
          body.model_catalog_id?.trim() || current.model_catalog_id,
        credential_id: body.credential_id?.trim() || current.credential_id,
        deployment_name: deploymentName,
        region,
        endpoint_url: endpointURL,
        priority,
        weight,
        status,
      },
    })

    return NextResponse.json(deployment)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ deploymentID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { deploymentID } = await context.params

    await gatewayRequest(
      `/control/v1/model-deployments/${encodeURIComponent(deploymentID)}`,
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
