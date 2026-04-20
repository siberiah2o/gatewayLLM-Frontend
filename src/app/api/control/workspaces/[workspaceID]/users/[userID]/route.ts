import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayRequest, type User } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type UpdateWorkspaceUserBody = {
  display_name?: string
  status?: string
  email_verified?: boolean
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
    const user = await gatewayRequest<User>(
      `/control/v1/workspaces/${encodeURIComponent(
        workspaceID
      )}/users/${encodeURIComponent(userID)}`,
      { token }
    )

    return NextResponse.json(user)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function PATCH(
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
      .catch(() => ({}))) as UpdateWorkspaceUserBody
    const path = `/control/v1/workspaces/${encodeURIComponent(
      workspaceID
    )}/users/${encodeURIComponent(userID)}`
    const current = await gatewayRequest<User>(path, { token })
    const displayName = body.display_name?.trim() || current.display_name
    const status = body.status?.trim().toLowerCase() || current.status
    const emailVerified =
      typeof body.email_verified === "boolean"
        ? body.email_verified
        : current.email_verified

    if (!displayName) {
      return badRequest("Display name is required.")
    }

    if (status !== "active" && status !== "inactive") {
      return badRequest("Status must be active or inactive.")
    }

    const user = await gatewayRequest<User>(path, {
      method: "PUT",
      token,
      body: {
        display_name: displayName,
        status,
        email_verified: emailVerified,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceID: string; userID: string }> }
) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const { workspaceID, userID } = await context.params

    await gatewayRequest(
      `/control/v1/workspaces/${encodeURIComponent(
        workspaceID
      )}/users/${encodeURIComponent(userID)}`,
      {
        method: "DELETE",
        token,
      }
    )

    return NextResponse.json({ status: "removed" })
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
