import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type UserModelPermissionList } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type PutUserModelPermissionsBody = {
  model_catalog_ids?: unknown
  allowed_models?: unknown
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceID: string; userID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID, userID } = await context.params
    const permissions = await gatewayRequest<UserModelPermissionList>(
      `/control/v1/workspaces/${encodeURIComponent(
        workspaceID
      )}/users/${encodeURIComponent(userID)}/model-permissions`,
      { token }
    )

    return NextResponse.json(permissions)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ workspaceID: string; userID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID, userID } = await context.params
    const body = (await request
      .json()
      .catch(() => ({}))) as PutUserModelPermissionsBody
    const modelCatalogIDs = parseStringArray(body.model_catalog_ids)
    const allowedModels = parseStringArray(body.allowed_models)

    if (!modelCatalogIDs || !allowedModels) {
      return badRequest("Model permission values must be string arrays.")
    }

    const permissions = await gatewayRequest<UserModelPermissionList>(
      `/control/v1/workspaces/${encodeURIComponent(
        workspaceID
      )}/users/${encodeURIComponent(userID)}/model-permissions`,
      {
        method: "PUT",
        token,
        body: {
          model_catalog_ids: modelCatalogIDs,
          allowed_models: allowedModels,
        },
      }
    )

    return NextResponse.json(permissions)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return []
  }

  if (!Array.isArray(value)) {
    return undefined
  }

  const values: string[] = []

  for (const item of value) {
    if (typeof item !== "string") {
      return undefined
    }

    const trimmed = item.trim()

    if (trimmed) {
      values.push(trimmed)
    }
  }

  return Array.from(new Set(values))
}
