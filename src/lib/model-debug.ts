export type ModelDebugAction = "chat-completion" | "list-models"

export type ModelDebugUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export type ModelDebugSummary = {
  ok: boolean
  action: ModelDebugAction
  method: "GET" | "POST"
  endpoint: string
  backend_status: number
  content_type?: string | null
  latency_ms: number
  request_uid?: string | null
  requested_model?: string | null
  response_model?: string | null
  finish_reason?: string | null
  response_object?: string | null
  choice_count?: number | null
  model_count?: number | null
  occurred_at: string
}

export type ModelDebugResult = {
  backend_status: number
  content_type?: string | null
  request_uid?: string | null
  request: Record<string, unknown>
  response: unknown
  response_headers: Record<string, string>
  summary: ModelDebugSummary
  usage?: ModelDebugUsage
  extracted_text?: string | null
  extracted_models?: string[]
}

type CreateModelDebugResultOptions = {
  action: ModelDebugAction
  endpoint: string
  method: "GET" | "POST"
  backendStatus: number
  contentType?: string | null
  latencyMs: number
  requestUID?: string | null
  requestedModel?: string | null
  request: Record<string, unknown>
  response: unknown
  responseHeaders: Headers
}

const SAFE_RESPONSE_HEADERS = [
  "anthropic-request-id",
  "date",
  "openai-processing-ms",
  "retry-after",
  "server",
  "via",
  "x-ratelimit-limit-requests",
  "x-ratelimit-limit-tokens",
  "x-ratelimit-remaining-requests",
  "x-ratelimit-remaining-tokens",
  "x-request-id",
  "x-request-uid",
] as const

export function parseMaybeJSON(text: string) {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export function createModelDebugResult({
  action,
  endpoint,
  method,
  backendStatus,
  contentType,
  latencyMs,
  requestUID,
  requestedModel,
  request,
  response,
  responseHeaders,
}: CreateModelDebugResultOptions): ModelDebugResult {
  const extractedModels = extractModels(response)
  const choiceCount = extractChoiceCount(response)
  const usage = extractUsage(response)

  return {
    backend_status: backendStatus,
    content_type: contentType,
    request_uid: requestUID,
    request,
    response,
    response_headers: pickResponseHeaders(responseHeaders),
    summary: {
      ok: backendStatus >= 200 && backendStatus < 300,
      action,
      method,
      endpoint,
      backend_status: backendStatus,
      content_type: contentType,
      latency_ms: latencyMs,
      request_uid: requestUID,
      requested_model: requestedModel ?? null,
      response_model: extractResponseModel(response),
      finish_reason: extractFinishReason(response),
      response_object: extractResponseObject(response),
      choice_count: choiceCount,
      model_count: extractedModels.length > 0 ? extractedModels.length : null,
      occurred_at: new Date().toISOString(),
    },
    usage,
    extracted_text: extractResponseText(response),
    extracted_models: extractedModels,
  }
}

function pickResponseHeaders(headers: Headers) {
  return SAFE_RESPONSE_HEADERS.reduce<Record<string, string>>((acc, header) => {
    const value = headers.get(header)

    if (value) {
      acc[header] = value
    }

    return acc
  }, {})
}

function extractResponseObject(response: unknown) {
  return asString(asRecord(response)?.object)
}

function extractResponseModel(response: unknown) {
  return asString(asRecord(response)?.model)
}

function extractFinishReason(response: unknown) {
  const choices = asArray(asRecord(response)?.choices)
  return asString(asRecord(choices[0])?.finish_reason)
}

function extractChoiceCount(response: unknown) {
  const choices = asArray(asRecord(response)?.choices)
  return choices.length > 0 ? choices.length : null
}

function extractUsage(response: unknown) {
  const usage = asRecord(asRecord(response)?.usage)

  if (!usage) {
    return undefined
  }

  const promptTokens = asNumber(usage.prompt_tokens)
  const completionTokens = asNumber(usage.completion_tokens)
  const totalTokens = asNumber(usage.total_tokens)

  if (
    promptTokens === undefined &&
    completionTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined
  }

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  }
}

function extractModels(response: unknown) {
  const data = asArray(asRecord(response)?.data)

  return [...new Set(data.map(extractModelName).filter(Boolean))] as string[]
}

function extractModelName(value: unknown) {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  return (
    asString(record.id) ?? asString(record.model) ?? asString(record.name) ?? null
  )
}

function extractResponseText(response: unknown): string | null {
  if (typeof response === "string") {
    return response
  }

  const record = asRecord(response)

  if (!record) {
    return null
  }

  const choiceText = extractChoiceText(record)

  if (choiceText) {
    return choiceText
  }

  const outputText = extractValueText(record.output_text)

  if (outputText) {
    return outputText
  }

  const output = asArray(record.output)

  for (const item of output) {
    const itemText = extractValueText(asRecord(item)?.content)

    if (itemText) {
      return itemText
    }
  }

  return null
}

function extractChoiceText(record: Record<string, unknown>) {
  const choices = asArray(record.choices)

  for (const choice of choices) {
    const choiceRecord = asRecord(choice)

    if (!choiceRecord) {
      continue
    }

    const messageText = extractValueText(asRecord(choiceRecord.message)?.content)

    if (messageText) {
      return messageText
    }

    const deltaText = extractValueText(asRecord(choiceRecord.delta)?.content)

    if (deltaText) {
      return deltaText
    }

    const directText =
      extractValueText(choiceRecord.text) ??
      extractValueText(asRecord(choiceRecord.message)?.text)

    if (directText) {
      return directText
    }
  }

  return null
}

function extractValueText(value: unknown): string | null {
  if (typeof value === "string") {
    return value
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((part) => extractValueText(part))
      .filter((part): part is string => Boolean(part))

    return parts.length > 0 ? parts.join("\n\n") : null
  }

  const record = asRecord(value)

  if (!record) {
    return null
  }

  if (typeof record.text === "string") {
    return record.text
  }

  const textValue = asRecord(record.text)?.value

  if (typeof textValue === "string") {
    return textValue
  }

  if (typeof record.value === "string") {
    return record.value
  }

  if (typeof record.content === "string") {
    return record.content
  }

  return extractValueText(record.content)
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
