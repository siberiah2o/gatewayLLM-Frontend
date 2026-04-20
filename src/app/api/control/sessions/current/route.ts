import { NextResponse } from "next/server"

import {
  GATEWAY_SESSION_COOKIE,
  GatewayAPIError,
  gatewayRequest,
} from "@/lib/gatewayllm"
import { clearSessionCookie } from "@/lib/session"

export async function DELETE(request: Request) {
  const token = getSessionTokenFromRequest(request)
  const response = NextResponse.json({ status: "signed_out" })

  if (token) {
    try {
      await gatewayRequest("/control/v1/sessions/current", {
        method: "DELETE",
        token,
      })
    } catch (error) {
      if (!(error instanceof GatewayAPIError) || error.status >= 500) {
        return NextResponse.json(
          {
            error: {
              code: "gateway_unavailable",
              message: "Could not sign out from GatewayLLM.",
            },
          },
          { status: 502 }
        )
      }
    }
  }

  clearSessionCookie(response)

  return response
}

function getSessionTokenFromRequest(request: Request) {
  const cookie = request.headers.get("cookie")

  if (!cookie) {
    return undefined
  }

  const match = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GATEWAY_SESSION_COOKIE}=`))

  return match?.split("=").slice(1).join("=")
}
