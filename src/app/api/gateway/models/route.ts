import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayURL } from "@/lib/gatewayllm"
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

    const backendResponse = await fetch(gatewayURL("/v1/models"), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    })

    const text = await backendResponse.text()
    const requestUID = backendResponse.headers.get("x-request-uid")
    const responseHeaders = new Headers()

    if (requestUID) {
      responseHeaders.set("X-Request-UID", requestUID)
    }

    return NextResponse.json(
      {
        backend_status: backendResponse.status,
        content_type: backendResponse.headers.get("content-type"),
        request_uid: requestUID,
        response: parseMaybeJSON(text),
      },
      {
        status: backendResponse.status,
        headers: responseHeaders,
      }
    )
  } catch (error) {
    return gatewayErrorResponse(error)
  }
}

function parseMaybeJSON(text: string) {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}
