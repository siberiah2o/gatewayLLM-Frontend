export const GATEWAY_SESSION_COOKIE = "gatewayllm_session"

const DEFAULT_GATEWAY_BASE_URL = "http://127.0.0.1:8080"

export type GatewayErrorPayload = {
  error?: {
    code?: string
    message?: string
    type?: string
  }
}

export class GatewayAPIError extends Error {
  status: number
  code?: string
  type?: string
  payload?: unknown

  constructor({
    status,
    message,
    code,
    type,
    payload,
  }: {
    status: number
    message: string
    code?: string
    type?: string
    payload?: unknown
  }) {
    super(message)
    this.name = "GatewayAPIError"
    this.status = status
    this.code = code
    this.type = type
    this.payload = payload
  }
}

export type GatewayRequestOptions = {
  method?: string
  token?: string
  body?: unknown
  headers?: HeadersInit
}

export type HealthResponse = {
  service: string
  status: string
  time: string
}

export type ReadyResponse = {
  status: string
}

export type SessionUser = {
  id: string
  email: string
  display_name: string
  status: string
  email_verified: boolean
  email_verification_status: string
  email_verified_at?: string
  created_at?: string
  updated_at?: string
}

export type GatewaySession = {
  token: string
  expires_at: string
  user: SessionUser
}

export type MeResponse = {
  user: SessionUser
}

export type Workspace = {
  id: string
  name: string
  status: string
  billing_currency: string
  created_at: string
  updated_at: string
}

export type WorkspaceList = {
  object: string
  data: Workspace[]
}

export type WorkspaceMember = {
  workspace_id: string
  user_id: string
  email: string
  display_name: string
  role: string
  status: string
  created_at: string
}

export type WorkspaceMemberList = {
  object: string
  data: WorkspaceMember[]
}

export type User = {
  workspace_id?: string
  id: string
  email: string
  display_name: string
  status: string
  email_verified: boolean
  email_verification_status: string
  email_verified_at?: string
  role?: string
  workspace_member_status?: string
  created_at: string
  updated_at: string
}

export type UserList = {
  object: string
  data: User[]
}

export type UserModelPermission = {
  workspace_id: string
  user_id: string
  model_catalog_id: string
  model_canonical_name: string
  provider: string
  created_at: string
}

export type UserModelPermissionList = {
  object: string
  data: UserModelPermission[]
}

export type APIKey = {
  id: string
  workspace_id: string
  display_name: string
  status: string
  expires_at?: string
  last_used_at?: string
  created_at: string
  updated_at: string
  api_key?: string
}

export type APIKeyList = {
  object: string
  data: APIKey[]
}

export type Balance = {
  workspace_id?: string
  total_spend_usd: string
  month_to_date_spend_usd: string
  last_projected_at?: string
  api_key_count: number
}

export type DailyUsage = {
  usage_date: string
  request_count: number
  success_count: number
  failure_count: number
  prompt_tokens: number
  completion_tokens: number
  spend_usd: string
}

export type DailyUsageList = {
  object: string
  data: DailyUsage[]
}

export type RequestLogAttempt = {
  id: string
  request_id: string
  deployment_id?: string
  deployment_name?: string
  provider: string
  status: string
  attempt_no: number
  latency_ms?: number
  prompt_tokens?: number
  completion_tokens?: number
  error_code?: string
  error_message?: string
  response_payload?: string
  response_content_type?: string
  started_at: string
  completed_at?: string
}

export type RequestLog = {
  id: string
  workspace_id: string
  api_key_id?: string
  api_key_display_name?: string
  model_catalog_id?: string
  model_canonical_name?: string
  model_provider?: string
  request_uid: string
  endpoint: string
  status: string
  stream: boolean
  trace_id?: string
  client_ip?: string
  request_started_at: string
  first_token_at?: string
  first_token_latency_ms?: number
  completed_at?: string
  duration_ms?: number
  request_payload?: string
  attempt_count: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  spend_usd: string
  latest_attempt?: RequestLogAttempt
  attempts: RequestLogAttempt[]
}

export type RequestLogList = {
  object: string
  data: RequestLog[]
}

export type RegistrationRequest = {
  id: string
  workspace_id: string
  email: string
  display_name: string
  status: string
  reviewed_by_user_id?: string
  approved_user_id?: string
  created_at: string
  reviewed_at?: string
}

export type RegistrationRequestList = {
  object: string
  data: RegistrationRequest[]
}

export type ModelCatalog = {
  workspace_id: string
  id: string
  canonical_name: string
  provider: string
  input_modalities: string[]
  output_modalities: string[]
  pricing_rules: Record<string, unknown>
  status: string
  created_at: string
  updated_at: string
}

export type ModelCatalogList = {
  object: string
  data: ModelCatalog[]
}

export type ModelCatalogProviderOption = {
  provider: string
  display_name: string
  model_count: number
  default_model_placeholder?: string
  default_endpoint_url?: string
  default_region?: string
  endpoint_url_placeholder?: string
}

export type ModelCatalogOption = {
  canonical_name: string
  provider: string
  source: string
  source_provider?: string
  default_endpoint_url?: string
  default_region?: string
  modes?: string[]
  input_modalities?: string[]
  output_modalities?: string[]
  prompt_microusd_per_million?: number
  completion_microusd_per_million?: number
  supports_vision?: boolean
  supports_function_calling?: boolean
  supports_tool_choice?: boolean
  supports_reasoning?: boolean
  supports_audio_input?: boolean
  supports_audio_output?: boolean
  max_input_tokens?: number
  max_output_tokens?: number
}

export type ModelCatalogOptions = {
  object: string
  source: string
  providers: ModelCatalogProviderOption[]
  models: ModelCatalogOption[]
}

export type ProviderCredential = {
  workspace_id: string
  id: string
  provider: string
  credential_name: string
  status: string
  secret_configured: boolean
  created_at: string
  updated_at: string
}

export type ProviderCredentialList = {
  object: string
  data: ProviderCredential[]
}

export type ModelDeployment = {
  workspace_id: string
  id: string
  model_catalog_id: string
  model_canonical_name: string
  provider: string
  credential_id: string
  credential_name: string
  deployment_name: string
  region: string
  endpoint_url: string
  priority: number
  weight: number
  status: string
  created_at: string
  updated_at: string
}

export type ModelDeploymentList = {
  object: string
  data: ModelDeployment[]
}

export type ProviderSetupCredential = {
  id: string
  name: string
  secret_configured: boolean
}

export type ProviderSetupModelCatalog = {
  id: string
  pricing_rules: Record<string, unknown>
}

export type ProviderSetupRefs = {
  model_catalog_id: string
  credential_id: string
  deployment_id: string
}

export type ProviderSetup = {
  id: string
  workspace_id: string
  provider: string
  provider_display_name: string
  model_name: string
  deployment_name: string
  endpoint_url: string
  region: string
  priority: number
  weight: number
  status: string
  credential: ProviderSetupCredential
  model_catalog: ProviderSetupModelCatalog
  refs: ProviderSetupRefs
  created_at: string
  updated_at: string
}

export type ProviderSetupList = {
  object: string
  data: ProviderSetup[]
}

export function gatewayBaseURL() {
  return process.env.GATEWAYLLM_API_BASE_URL ?? DEFAULT_GATEWAY_BASE_URL
}

export function gatewayURL(path: string) {
  return new URL(path, gatewayBaseURL()).toString()
}

export function errorMessage(error: unknown) {
  if (error instanceof GatewayAPIError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unexpected gateway error"
}

export async function gatewayRequest<T>(
  path: string,
  { method = "GET", token, body, headers }: GatewayRequestOptions = {}
): Promise<T> {
  const requestHeaders = new Headers(headers)

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`)
  }

  let requestBody: BodyInit | undefined
  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json")
    requestBody = JSON.stringify(body)
  }

  const response = await fetch(gatewayURL(path), {
    method,
    headers: requestHeaders,
    body: requestBody,
    cache: "no-store",
  })

  const payload = await readJSON(response)

  if (!response.ok) {
    const gatewayPayload = payload as GatewayErrorPayload | null
    const gatewayError = gatewayPayload?.error

    throw new GatewayAPIError({
      status: response.status,
      message: gatewayError?.message ?? response.statusText,
      code: gatewayError?.code,
      type: gatewayError?.type,
      payload,
    })
  }

  return payload as T
}

async function readJSON(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}
