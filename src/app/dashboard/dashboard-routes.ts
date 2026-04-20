export const DASHBOARD_SECTIONS = [
  "status",
  "usage",
  "workspaces",
  "account",
  "users",
  "members",
  "registration",
  "api-keys",
  "models",
  "credentials",
  "deployments",
  "chat-smoke",
] as const

export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number]

export function normalizeDashboardSection(section: string) {
  return DASHBOARD_SECTIONS.includes(section as DashboardSection)
    ? (section as DashboardSection)
    : null
}

export function dashboardSectionTitleKey(section: DashboardSection) {
  switch (section) {
    case "status":
      return "nav.status"
    case "usage":
      return "nav.usage"
    case "workspaces":
      return "nav.workspaces"
    case "account":
      return "nav.signedInUser"
    case "users":
      return "nav.users"
    case "members":
      return "nav.members"
    case "registration":
      return "nav.registrationRequests"
    case "api-keys":
      return "nav.apiKeys"
    case "models":
      return "nav.catalogs"
    case "credentials":
      return "nav.credentials"
    case "deployments":
      return "nav.deployments"
    case "chat-smoke":
      return "nav.smokeTest"
  }
}
