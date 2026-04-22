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
  SessionUser,
  User,
  UserList,
  Workspace,
  WorkspaceList,
  WorkspaceMember,
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
  workspaceList: Workspace[]
  workspaces: Settled<WorkspaceList>
  health: Settled<HealthResponse>
  ready: Settled<ReadyResponse>
  balance: Settled<Balance>
  apiKeys: Settled<APIKeyList>
  dailyUsage: Settled<DailyUsageList>
  workspaceUsers: Settled<UserList>
  workspaceUserList: User[]
  workspaceMembers: Settled<WorkspaceMemberList>
  workspaceMemberList: WorkspaceMember[]
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
  showUserManagement: boolean
  showMemberManagement: boolean
  showRegistration: boolean
  showModelCatalogManagement: boolean
  showProviderCredentialManagement: boolean
  showModelDeploymentManagement: boolean
}
