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
