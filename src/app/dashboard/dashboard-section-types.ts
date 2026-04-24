import type {
  APIKeyList,
  Balance,
  DailyUsageList,
  HealthResponse,
  ModelCatalog,
  ModelCatalogList,
  ModelDeployment,
  ModelDeploymentList,
  ProviderCredential,
  ProviderCredentialList,
  ProviderSetup,
  ProviderSetupList,
  ReadyResponse,
  RegistrationRequestList,
  RequestLogList,
  RuntimeResourceSnapshot,
  SessionUser,
  UsageInsights,
  User,
  UserList,
  Workspace,
  WorkspaceDepartment,
  WorkspaceDepartmentList,
  WorkspaceMemberList,
} from "@/lib/gatewayllm"
import type { Settled } from "./dashboard-data"
import type { DashboardPaginationState } from "./dashboard-pagination"
import type { DashboardSection } from "./dashboard-routes"
import type { Translator } from "./dashboard-ui"

export type DashboardSectionContentProps = {
  section: DashboardSection
  t: Translator
  user: SessionUser
  activeWorkspace?: Workspace
  health: Settled<HealthResponse>
  ready: Settled<ReadyResponse>
  frontendRuntime: Settled<RuntimeResourceSnapshot>
  backendRuntime: Settled<RuntimeResourceSnapshot>
  balance: Settled<Balance>
  apiKeys: Settled<APIKeyList>
  dailyUsage: Settled<DailyUsageList>
  usageInsights: Settled<UsageInsights>
  requestLogs: Settled<RequestLogList>
  workspaceUsers: Settled<UserList>
  workspaceUserList: User[]
  workspaceMembers: Settled<WorkspaceMemberList>
  workspaceDepartments: Settled<WorkspaceDepartmentList>
  workspaceDepartmentList: WorkspaceDepartment[]
  registrationRequests: Settled<RegistrationRequestList>
  modelCatalogs: Settled<ModelCatalogList>
  modelCatalogList: ModelCatalog[]
  providerCredentials: Settled<ProviderCredentialList>
  providerCredentialList: ProviderCredential[]
  providerSetups: Settled<ProviderSetupList>
  providerSetupList: ProviderSetup[]
  modelDeployments: Settled<ModelDeploymentList>
  modelDeploymentList: ModelDeployment[]
  tablePagination: Record<string, DashboardPaginationState | undefined>
  chatSmokeModel: string
  chatSmokeBaseUrl: string
  canManageWorkspace: boolean
  showUserManagement: boolean
  showDepartmentManagement: boolean
  showRegistration: boolean
  showModelCatalogManagement: boolean
  showProviderCredentialManagement: boolean
  showModelDeploymentManagement: boolean
}
