import { NextResponse } from "next/server"

import { GatewayAPIError } from "@/lib/gatewayllm"

export function badRequest(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "bad_request",
        message,
      },
    },
    { status: 400 }
  )
}

export function unauthorized() {
  return NextResponse.json(
    {
      error: {
        code: "unauthorized",
        message: "Sign in is required.",
      },
    },
    { status: 401 }
  )
}

export function gatewayErrorResponse(
  error: unknown,
  fallbackMessage = "GatewayLLM backend is unavailable."
) {
  if (error instanceof GatewayAPIError) {
    return NextResponse.json(
      {
        error: {
          code: error.code ?? "gateway_error",
          message: error.message,
          type: error.type,
        },
      },
      { status: error.status }
    )
  }

  return NextResponse.json(
    {
      error: {
        code: "gateway_unavailable",
        message: fallbackMessage,
      },
    },
    { status: 502 }
  )
}
