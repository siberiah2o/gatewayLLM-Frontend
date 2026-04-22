export const DASHBOARD_SECTIONS = [
  "status",
  "usage",
  "logs",
  "workspaces",
  "account",
  "users",
  "members",
  "registration",
  "api-keys",
  "provider-setups",
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
    case "logs":
      return "nav.logs"
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
    case "provider-setups":
      return "nav.providerSetups"
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
