import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse } from "@/lib/api-route"
import {
  gatewayRequest,
  type GatewaySession,
} from "@/lib/gatewayllm"
import { setSessionCookie } from "@/lib/session"

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody

    if (!body.email || !body.password) {
      return badRequest("Email and password are required.")
    }

    const session = await gatewayRequest<GatewaySession>(
      "/control/v1/sessions",
      {
        method: "POST",
        body: {
          email: body.email,
          password: body.password,
        },
      }
    )

    const response = NextResponse.json(session, { status: 201 })
    setSessionCookie(response, session)

    return response
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
