import { cookies } from "next/headers"
import type { NextResponse } from "next/server"

import { GATEWAY_SESSION_COOKIE, type GatewaySession } from "@/lib/gatewayllm"

const secure = process.env.NODE_ENV === "production"

export async function getSessionToken() {
  const cookieStore = await cookies()

  return cookieStore.get(GATEWAY_SESSION_COOKIE)?.value
}

export function setSessionCookie(
  response: NextResponse,
  session: GatewaySession
) {
  response.cookies.set(GATEWAY_SESSION_COOKIE, session.token, {
    expires: new Date(session.expires_at),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(GATEWAY_SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
  })
}
