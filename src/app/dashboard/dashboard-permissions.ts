import type { DashboardSection } from "./dashboard-routes"

export const USER_DASHBOARD_SECTIONS: DashboardSection[] = [
  "models",
  "chat-smoke",
  "api-keys",
  "account",
]

export function isUserDashboardSection(section: DashboardSection) {
  return USER_DASHBOARD_SECTIONS.includes(section)
}
