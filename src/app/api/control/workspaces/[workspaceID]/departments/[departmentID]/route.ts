import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import {
  gatewayRequest,
  type WorkspaceDepartment,
} from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type UpdateWorkspaceDepartmentBody = {
  name?: string
  description?: string
  status?: string
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ workspaceID: string; departmentID: string }>
  }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID, departmentID } = await context.params
    const body = (await request.json().catch(() => ({}))) as UpdateWorkspaceDepartmentBody
    const path = `/control/v1/workspaces/${encodeURIComponent(
      workspaceID
    )}/departments/${encodeURIComponent(departmentID)}`
    const name = body.name?.trim()
    const description = body.description?.trim() || ""
    const status = body.status?.trim().toLowerCase() || "active"

    if (!name) {
      return badRequest("Department name is required.")
    }
    if (status !== "active" && status !== "inactive") {
      return badRequest("Status must be active or inactive.")
    }

    const department = await gatewayRequest<WorkspaceDepartment>(path, {
      method: "PUT",
      token,
      body: {
        name,
        description,
        status,
      },
    })

    return NextResponse.json(department)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ workspaceID: string; departmentID: string }>
  }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID, departmentID } = await context.params

    await gatewayRequest(
      `/control/v1/workspaces/${encodeURIComponent(
        workspaceID
      )}/departments/${encodeURIComponent(departmentID)}`,
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
