import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse } from "@/lib/api-route"
import {
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
  try {
    const body = (await request.json()) as SignupBody

    if (
      !body.workspace_id ||
      !body.email ||
      !body.password ||
      !body.display_name
    ) {
      return badRequest("Workspace, name, email, and password are required.")
    }

    const requestPath = `/control/v1/workspaces/${encodeURIComponent(
      body.workspace_id
    )}/registration-requests`

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
    return gatewayErrorResponse(error)
  }
}
