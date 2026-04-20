import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayURL } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

type ChatCompletionsBody = {
  api_key?: string
  model?: string
  prompt?: string
  temperature?: string | number
}

export async function POST(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  try {
    const body = (await request.json()) as ChatCompletionsBody
    const apiKey = body.api_key?.trim()
    const model = body.model?.trim()
    const prompt = body.prompt?.trim()
    const temperature = Number(body.temperature ?? 0.2)

    if (!apiKey || !model || !prompt) {
      return badRequest("API key, model, and prompt are required.")
    }

    if (!Number.isFinite(temperature)) {
      return badRequest("Temperature must be a number.")
    }

    const backendResponse = await fetch(gatewayURL("/v1/chat/completions"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: false,
        temperature,
      }),
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
