"use client"

// Legacy barrel. Prefer importing from domain-specific dashboard-actions modules.
export {
  CreateAPIKeyForm,
  RevokeAPIKeyButton,
  ViewAPIKeyDialog,
} from "./dashboard-actions/api-keys"
export { ChatSmokeTestForm } from "./dashboard-actions/chat-smoke"
export {
  CreateModelDeploymentForm,
  EditModelDeploymentDialog,
} from "./dashboard-actions/deployments"
export {
  CreateModelCatalogForm,
  CreateProviderCredentialForm,
  CreateProviderSetupForm,
} from "./dashboard-actions/model-registry"
export {
  ActivateModelCatalogButton,
  ActivateModelDeploymentButton,
  ActivateProviderCredentialButton,
  ActivateProviderSetupButton,
  DeactivateModelCatalogButton,
  DeactivateModelDeploymentButton,
  DeactivateProviderCredentialButton,
  DeactivateProviderSetupButton,
  DeleteModelCatalogButton,
  DeleteModelDeploymentButton,
  DeleteProviderCredentialButton,
  DeleteProviderSetupButton,
} from "./dashboard-actions/resource-actions"
export { ReviewRegistrationRequestActions } from "./dashboard-actions/registration"
export {
  CreateWorkspaceForm,
  CreateWorkspaceUserDialog,
  ManageModelPermissionsDialog,
  RemoveWorkspaceMemberButton,
  UpdateWorkspaceMemberForm,
} from "./dashboard-actions/workspace"
export {
  DeleteWorkspaceUserDialog,
  EditWorkspaceUserDialog,
} from "./dashboard-actions/users"
