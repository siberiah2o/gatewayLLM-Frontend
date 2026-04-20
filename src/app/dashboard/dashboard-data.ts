import {
  GatewayAPIError,
  errorMessage,
  type Workspace,
} from "@/lib/gatewayllm"

export type Settled<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: string
      status?: number
    }

export async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return {
      ok: true,
      data: await promise,
    }
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error),
      status: error instanceof GatewayAPIError ? error.status : undefined,
    }
  }
}

export function skippedResult<T>(): Settled<T> {
  return {
    ok: false,
    error: "",
  }
}

export async function loadWorkspaceResource<T>(
  enabled: boolean,
  workspace: Workspace | undefined,
  noWorkspaceMessage: string,
  request: (workspace: Workspace) => Promise<T>
): Promise<Settled<T>> {
  if (!enabled) {
    return skippedResult<T>()
  }

  if (!workspace) {
    return {
      ok: false,
      error: noWorkspaceMessage,
    }
  }

  return settle(request(workspace))
}

export function showPrivilegedSection<T>(
  workspace: Workspace | undefined,
  result: Settled<T>
) {
  if (!workspace) {
    return false
  }

  return result.ok || result.status !== 403
}
