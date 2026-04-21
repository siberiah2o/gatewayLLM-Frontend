import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type ModelDeployment } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type CreateModelDeploymentBody = {
  workspace_id?: string
  model_catalog_id?: string
  credential_id?: string
  deployment_name?: string
  region?: string
  endpoint_url?: string
  priority?: string | number
  weight?: string | number
}

export async function POST(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const body = (await request.json()) as CreateModelDeploymentBody
    const workspaceID = body.workspace_id?.trim()
    const modelCatalogID = body.model_catalog_id?.trim()
    const credentialID = body.credential_id?.trim()
    const deploymentName = body.deployment_name?.trim()
    const region = body.region?.trim()
    const endpointURL = body.endpoint_url?.trim()
    const priority = Number(body.priority ?? 1)
    const weight = Number(body.weight ?? 100)

    if (!workspaceID || !modelCatalogID || !credentialID || !deploymentName) {
      return badRequest("Workspace, model catalog, credential, and name are required.")
    }

    if (!Number.isInteger(priority) || !Number.isInteger(weight)) {
      return badRequest("Priority and weight must be integers.")
    }

    const deployment = await gatewayRequest<ModelDeployment>(
      "/control/v1/model-deployments",
      {
        method: "POST",
        token,
        body: {
          workspace_id: workspaceID,
          model_catalog_id: modelCatalogID,
          credential_id: credentialID,
          deployment_name: deploymentName,
          region: region || undefined,
          endpoint_url: endpointURL || undefined,
          priority,
          weight,
          status: "active",
        },
      }
    )

    return NextResponse.json(deployment, { status: 201 })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
