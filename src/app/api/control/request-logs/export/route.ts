import { unauthorized } from "@/lib/api-route"
import { gatewayURL } from "@/lib/gatewayllm"
import { getSessionToken } from "@/lib/session"

export async function GET(request: Request) {
  const token = await getSessionToken()

  if (!token) {
    return unauthorized()
  }

  const url = new URL(request.url)
  const backendResponse = await fetch(
    gatewayURL(`/control/v1/request-logs/export?${url.searchParams.toString()}`),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  )
  const body = await backendResponse.arrayBuffer()
  const headers = new Headers()

  for (const name of [
    "content-disposition",
    "content-type",
    "x-export-row-count",
    "x-export-truncated",
  ]) {
    const value = backendResponse.headers.get(name)
    if (value) {
      headers.set(name, value)
    }
  }

  return new Response(body, {
    status: backendResponse.status,
    headers,
  })
}
