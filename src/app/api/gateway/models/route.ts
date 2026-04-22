import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayURL } from "@/lib/gatewayllm"
import { createModelDebugResult, parseMaybeJSON } from "@/lib/model-debug"
import { getSessionToken } from "@/lib/session"

type ModelsBody = {
  api_key?: string
}

export async function POST(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const body = (await request.json()) as ModelsBody
    const apiKey = body.api_key?.trim()

    if (!apiKey) {
      return badRequest("API key is required.")
    }

    const startedAt = Date.now()
    const backendResponse = await fetch(gatewayURL("/v1/models"), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    })

    const text = await backendResponse.text()
    const latencyMs = Date.now() - startedAt
    const requestUID = backendResponse.headers.get("x-request-uid")
    const responseHeaders = new Headers()

    if (requestUID) {
      responseHeaders.set("X-Request-UID", requestUID)
    }

    return NextResponse.json(
      createModelDebugResult({
        action: "list-models",
        endpoint: "/v1/models",
        method: "GET",
        backendStatus: backendResponse.status,
        contentType: backendResponse.headers.get("content-type"),
        latencyMs,
        requestUID,
        request: {
          endpoint: "/v1/models",
          method: "GET",
        },
        response: parseMaybeJSON(text),
        responseHeaders: backendResponse.headers,
      }),
      {
        status: backendResponse.status,
        headers: responseHeaders,
      }
    )
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}
