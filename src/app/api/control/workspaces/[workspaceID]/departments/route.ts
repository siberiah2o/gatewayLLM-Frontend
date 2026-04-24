import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import {
  gatewayRequest,
  type WorkspaceDepartment,
  type WorkspaceDepartmentList,
} from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type PutWorkspaceDepartmentBody = {
  name?: string
  description?: string
  status?: string
}

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID } = await context.params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") || "200"
    const offset = searchParams.get("offset")?.trim()
    const status = searchParams.get("status")?.trim()
    const query = new URLSearchParams({ limit })

    if (offset) {
      query.set("offset", offset)
    }
    if (status) {
      query.set("status", status)
    }

    const departments = await gatewayRequest<WorkspaceDepartmentList>(
      `/control/v1/workspaces/${encodeURIComponent(
        workspaceID
      )}/departments?${query.toString()}`,
      { token }
    )

    return NextResponse.json(departments)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID } = await context.params
    const body = (await request.json()) as PutWorkspaceDepartmentBody
    const name = body.name?.trim()
    const description = body.description?.trim() || ""
    const status = body.status?.trim().toLowerCase() || "active"

    if (!name) {
      return badRequest("Department name is required.")
    }
    if (status !== "active" && status !== "inactive") {
      return badRequest("Status must be active or inactive.")
    }

    const department = await gatewayRequest<WorkspaceDepartment>(
      `/control/v1/workspaces/${encodeURIComponent(workspaceID)}/departments`,
      {
        method: "POST",
        token,
        body: {
          name,
          description,
          status,
        },
      }
    )

    return NextResponse.json(department, { status: 201 })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
