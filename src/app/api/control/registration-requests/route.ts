import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse } from "@/lib/api-route"
import {
  GatewayAPIError,
  gatewayRequest,
  type RegistrationRequest,
} from "@/lib/gatewayllm"

type SignupBody = {
  workspace_id?: string
  email?: string
  password?: string
  display_name?: string
}

export async function POST(request: Request) {
  let usesDefaultRegistrationWorkspace = false

  try {
    const body = (await request.json()) as SignupBody

    if (!body.email || !body.password || !body.display_name) {
      return badRequest("Name, email, and password are required.")
    }

    const workspaceID = body.workspace_id?.trim()
    const requestPath = workspaceID
      ? `/control/v1/workspaces/${encodeURIComponent(
          workspaceID
        )}/registration-requests`
      : "/control/v1/registration-requests"
    usesDefaultRegistrationWorkspace = !workspaceID

    const registration = await gatewayRequest<RegistrationRequest>(
      requestPath,
      {
        method: "POST",
        body: {
          email: body.email,
          password: body.password,
          display_name: body.display_name,
        },
      }
    )

    return NextResponse.json(registration, { status: 201 })
  } catch (error) {
    if (
      error instanceof GatewayAPIError &&
      error.status === 404 &&
      error.code === "not_found"
    ) {
      if (usesDefaultRegistrationWorkspace) {
        return NextResponse.json(
          {
            error: {
              code: "no_registration_workspace",
              message: "No active workspace is accepting registrations.",
            },
          },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          error: {
            code: "workspace_not_found",
            message:
              "Workspace was not found. Check the workspace ID or create/seed a workspace first.",
          },
        },
        { status: 404 }
      )
    }

    if (
      error instanceof GatewayAPIError &&
      error.status === 400 &&
      error.message ===
        "policy target invalid: workspace is not accepting registrations"
    ) {
      return NextResponse.json(
        {
          error: {
            code: "workspace_inactive",
            message: "Workspace is not accepting registrations.",
          },
        },
        { status: 400 }
      )
    }

    if (
      error instanceof GatewayAPIError &&
      error.status === 409 &&
      error.code === "conflict"
    ) {
      return NextResponse.json(
        {
          error: {
            code: "registration_conflict",
            message:
              "Registration request already exists or user email is already in use.",
          },
        },
        { status: 409 }
      )
    }

    return gatewayErrorResponse(error)
  }
}
