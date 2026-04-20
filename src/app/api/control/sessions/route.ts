import { NextResponse } from "next/server"

import { badRequest, gatewayErrorResponse } from "@/lib/api-route"
import {
  gatewayRequest,
  type GatewaySession,
} from "@/lib/gatewayllm"
import { setSessionCookie } from "@/lib/session"

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  let formSubmission = false

  try {
    const parsed = await parseLoginRequest(request)
    const body = parsed.body
    formSubmission = parsed.formSubmission

    if (!body.email || !body.password) {
      if (formSubmission) {
        return redirectToLogin(request)
      }

      return badRequest("Email and password are required.")
    }

    const session = await gatewayRequest<GatewaySession>(
      "/control/v1/sessions",
      {
        method: "POST",
        body: {
          email: body.email,
          password: body.password,
        },
      }
    )

    const response = formSubmission
      ? NextResponse.redirect(new URL("/dashboard", request.url), {
          status: 303,
        })
      : NextResponse.json(session, { status: 201 })
    setSessionCookie(response, session)

    return response
  } catch (error) {
    if (formSubmission) {
      return redirectToLogin(request)
    }

    return gatewayErrorResponse(error)
  }
}

async function parseLoginRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData()

    return {
      body: {
        email: stringValue(formData.get("email")),
        password: stringValue(formData.get("password")),
      },
      formSubmission: true,
    }
  }

  return {
    body: (await request.json().catch(() => ({}))) as LoginBody,
    formSubmission: false,
  }
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : undefined
}

function redirectToLogin(request: Request) {
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 })
}
