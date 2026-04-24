import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type User, type UserList } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type CreateWorkspaceUserBody = {
  email?: string
  password?: string
  display_name?: string
  role?: string
  department_id?: string | null
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
    const status = searchParams.get("status")
    const limit = searchParams.get("limit") || "50"
    const offset = searchParams.get("offset")?.trim()
    const query = new URLSearchParams({ limit })

    if (status) {
      query.set("status", status)
    }
    if (offset) {
      query.set("offset", offset)
    }

    const users = await gatewayRequest<UserList>(
      `/control/v1/workspaces/${encodeURIComponent(
        workspaceID
      )}/users?${query.toString()}`,
      { token }
    )

    return NextResponse.json(users)
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
    const body = (await request.json()) as CreateWorkspaceUserBody
    const email = body.email?.trim()
    const password = body.password?.trim()
    const displayName = body.display_name?.trim()
    const role = body.role?.trim() || "member"
    const departmentID =
      typeof body.department_id === "string"
        ? body.department_id.trim()
        : body.department_id

    if (!email || !password || !displayName) {
      return badRequest("Email, password, and display name are required.")
    }

    if (role !== "admin" && role !== "member") {
      return badRequest("Role must be admin or member.")
    }

    const user = await gatewayRequest<User>(
      `/control/v1/workspaces/${encodeURIComponent(workspaceID)}/users`,
      {
        method: "POST",
        token,
        body: {
          email,
          password,
          display_name: displayName,
          status: "active",
          email_verified: true,
          role,
          ...(departmentID !== undefined ? { department_id: departmentID ?? "" } : {}),
        },
      }
    )

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
