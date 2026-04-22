import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse, unauthorized } from "@/lib/api-route"
import { gatewayURL } from "@/lib/gatewayllm"
import { createModelDebugResult, parseMaybeJSON } from "@/lib/model-debug"
import { getSessionToken } from "@/lib/session"

type ChatCompletionsBody = {
  api_key?: string
  model?: string
  prompt?: string
  temperature?: string | number
  stream?: boolean
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
    const wantsStream = body.stream === true

    if (!apiKey || !model || !prompt) {
      return badRequest("API key, model, and prompt are required.")
    }

    if (!Number.isFinite(temperature)) {
      return badRequest("Temperature must be a number.")
    }

    const startedAt = Date.now()
    const requestPayload = {
      model,
      temperature,
      stream: wantsStream,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }
    const backendResponse = await fetch(gatewayURL("/v1/chat/completions"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
      cache: "no-store",
    })

    const requestUID = backendResponse.headers.get("x-request-uid")
    const contentType = backendResponse.headers.get("content-type")

    if (
      wantsStream &&
      backendResponse.ok &&
      contentType?.includes("text/event-stream") &&
      backendResponse.body
    ) {
      return createStreamProxyResponse({
        backendResponse,
        requestPayload,
        requestUID,
        startedAt,
        model,
      })
    }

    const text = await backendResponse.text()
    const latencyMs = Date.now() - startedAt
    const responseHeaders = new Headers()

    if (requestUID) {
      responseHeaders.set("X-Request-UID", requestUID)
    }

    return NextResponse.json(
      createModelDebugResult({
        action: "chat-completion",
        endpoint: "/v1/chat/completions",
        method: "POST",
        backendStatus: backendResponse.status,
        contentType,
        latencyMs,
        requestUID,
        requestedModel: model,
        request: requestPayload,
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

function createStreamProxyResponse({
  backendResponse,
  requestPayload,
  requestUID,
  startedAt,
  model,
}: {
  backendResponse: Response
  requestPayload: Record<string, unknown>
  requestUID: string | null
  startedAt: number
  model: string
}) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const reader = backendResponse.body!.getReader()
  const streamState = createStreamState()
  let buffer = ""

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          if (!value) {
            continue
          }

          controller.enqueue(value)
          buffer += decoder.decode(value, { stream: true })
          buffer = consumeStreamBuffer(buffer, streamState)
        }

        buffer += decoder.decode()
        buffer = consumeStreamBuffer(buffer, streamState)

        if (buffer.trim() !== "") {
          consumeStreamEvent(buffer, streamState)
        }
      } finally {
        const summaryPayload = createModelDebugResult({
          action: "chat-completion",
          endpoint: "/v1/chat/completions",
          method: "POST",
          backendStatus: backendResponse.status,
          contentType: backendResponse.headers.get("content-type"),
          latencyMs: Date.now() - startedAt,
          requestUID,
          requestedModel: model,
          request: requestPayload,
          response: buildStreamResponse(streamState, model),
          responseHeaders: backendResponse.headers,
        })

        try {
          controller.enqueue(
            encoder.encode(
              encodeSSEEvent("gateway-summary", JSON.stringify(summaryPayload))
            )
          )
        } catch {}

        try {
          controller.close()
        } catch {}

        try {
          reader.releaseLock()
        } catch {}
      }
    },
    async cancel(reason) {
      await reader.cancel(reason).catch(() => undefined)
    },
  })

  const headers = new Headers()
  headers.set("Content-Type", "text/event-stream; charset=utf-8")
  headers.set("Cache-Control", "no-cache, no-transform")
  headers.set("Connection", "keep-alive")

  if (requestUID) {
    headers.set("X-Request-UID", requestUID)
  }

  return new Response(stream, {
    status: backendResponse.status,
    headers,
  })
}

type StreamState = {
  chunkCount: number
  model: string | null
  object: string | null
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  finishReasons: Map<number, string>
  outputByChoice: Map<number, string>
  reasoningByChoice: Map<number, string>
}

function createStreamState(): StreamState {
  return {
    chunkCount: 0,
    model: null,
    object: null,
    usage: undefined,
    finishReasons: new Map(),
    outputByChoice: new Map(),
    reasoningByChoice: new Map(),
  }
}

function consumeStreamBuffer(buffer: string, state: StreamState) {
  let remaining = buffer

  while (true) {
    const match = remaining.match(/\r?\n\r?\n/)

    if (!match || match.index === undefined) {
      break
    }

    const block = remaining.slice(0, match.index)
    remaining = remaining.slice(match.index + match[0].length)
    consumeStreamEvent(block, state)
  }

  return remaining
}

function consumeStreamEvent(block: string, state: StreamState) {
  if (block.trim() === "") {
    return
  }

  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""))
    .join("\n")

  if (!data || data === "[DONE]") {
    return
  }

  const payload = parseMaybeJSON(data)
  const record = asRecord(payload)

  if (!record) {
    return
  }

  state.chunkCount += 1
  state.model = asString(record.model) ?? state.model
  state.object = asString(record.object) ?? state.object

  const usage = asRecord(record.usage)

  if (usage) {
    state.usage = {
      prompt_tokens: asNumber(usage.prompt_tokens),
      completion_tokens: asNumber(usage.completion_tokens),
      total_tokens: asNumber(usage.total_tokens),
    }
  }

  const choices = asArray(record.choices)

  choices.forEach((choice, index) => {
    const choiceRecord = asRecord(choice)

    if (!choiceRecord) {
      return
    }

    const choiceIndex = asNumber(choiceRecord.index) ?? index
    const text = extractStreamText(choiceRecord)
    const reasoning = extractStreamReasoning(choiceRecord)

    if (text) {
      state.outputByChoice.set(
        choiceIndex,
        `${state.outputByChoice.get(choiceIndex) ?? ""}${text}`
      )
    }

    if (reasoning) {
      state.reasoningByChoice.set(
        choiceIndex,
        `${state.reasoningByChoice.get(choiceIndex) ?? ""}${reasoning}`
      )
    }

    const finishReason = asString(choiceRecord.finish_reason)

    if (finishReason) {
      state.finishReasons.set(choiceIndex, finishReason)
    }
  })
}

function buildStreamResponse(state: StreamState, requestedModel: string) {
  const choiceIndexes = [
    ...new Set([
      ...state.outputByChoice.keys(),
      ...state.reasoningByChoice.keys(),
      ...state.finishReasons.keys(),
    ]),
  ].sort((left, right) => left - right)

  const choices = choiceIndexes.map((index) => {
    const content = state.outputByChoice.get(index) ?? ""
    const reasoning = state.reasoningByChoice.get(index)

    return {
      index,
      message: {
        role: "assistant",
        content,
        ...(reasoning ? { reasoning_content: reasoning } : {}),
      },
      finish_reason: state.finishReasons.get(index) ?? null,
    }
  })

  return {
    object: state.object ?? "chat.completion",
    model: state.model ?? requestedModel,
    choices,
    usage: state.usage,
    stream: true,
    chunks_received: state.chunkCount,
  }
}

function extractStreamText(choice: Record<string, unknown>) {
  return (
    extractTextValue(asRecord(choice.delta)?.content) ??
    extractTextValue(asRecord(choice.message)?.content) ??
    extractTextValue(choice.text) ??
    null
  )
}

function extractStreamReasoning(choice: Record<string, unknown>) {
  const delta = asRecord(choice.delta)
  const message = asRecord(choice.message)

  return mergeTextParts(
    extractReasoningValue(delta),
    extractReasoningValue(message),
    extractReasoningValue(choice)
  )
}

function extractReasoningValue(record: Record<string, unknown> | null) {
  if (!record) {
    return null
  }

  return mergeTextParts(
    extractTextValue(record.reasoning_content),
    extractTextValue(record.reasoningContent),
    extractTextValue(record.reasoning),
    extractTextValue(record.thinking),
    extractTextValue(record.thought),
    extractTextValue(record.thoughts),
    extractThinkingBlocks(record.thinking_blocks),
    extractThinkingBlocks(record.thinkingBlocks),
    extractReasoningItems(record.reasoning_items),
    extractReasoningItems(record.reasoningItems),
    extractReasoningItems(record.reasoning_details),
    extractReasoningItems(record.reasoningDetails)
  )
}

function extractThinkingBlocks(value: unknown) {
  const items = asArray(value)
  const parts = items
    .map((item) => {
      const record = asRecord(item)

      if (!record || record.type === "redacted_thinking") {
        return null
      }

      return (
        extractTextValue(record.thinking) ??
        extractTextValue(record.text) ??
        extractTextValue(record.content) ??
        null
      )
    })
    .filter((item): item is string => Boolean(item))

  return parts.length > 0 ? parts.join("") : null
}

function extractReasoningItems(value: unknown) {
  const items = asArray(value)
  const parts = items
    .map((item) => {
      const record = asRecord(item)

      if (!record) {
        return extractTextValue(item)
      }

      if (record.type === "redacted_thinking") {
        return null
      }

      return mergeTextParts(
        extractTextValue(record.summary),
        extractTextValue(record.text),
        extractTextValue(record.content),
        extractTextValue(record.reasoning),
        extractTextValue(record.reasoning_content),
        extractTextValue(record.thinking)
      )
    })
    .filter((item): item is string => Boolean(item))

  return parts.length > 0 ? parts.join("\n\n") : null
}

function mergeTextParts(...values: Array<string | null | undefined>) {
  const parts: string[] = []

  values.forEach((value) => {
    const normalized = value?.trim()

    if (!normalized) {
      return
    }

    parts.push(normalized)
  })

  return parts.length > 0 ? parts.join("\n\n") : null
}

function extractTextValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractTextValue(item))
      .filter((item): item is string => Boolean(item))

    return parts.length > 0 ? parts.join("") : null
  }

  const record = asRecord(value)

  if (!record) {
    return null
  }

  if (typeof record.text === "string") {
    return record.text
  }

  if (typeof record.value === "string") {
    return record.value
  }

  if (typeof record.content === "string") {
    return record.content
  }

  return extractTextValue(record.content)
}

function encodeSSEEvent(event: string, data: string) {
  return `event: ${event}\ndata: ${data}\n\n`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}
