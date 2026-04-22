"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/components/i18n-provider"
import type {
  ModelCatalog,
  ModelCatalogOptions,
  ModelDeployment,
  ProviderCredential,
} from "@/lib/gatewayllm"
import {
  activeStatusOptions,
  DashboardFormSelect,
  errorText,
  responseError,
} from "./shared"
import { suggestedValueText } from "./registry-shared"

type DeploymentRegistryDefaults = {
  suggestedEndpointURL: string
  suggestedRegion: string
  isLoading: boolean
  error?: string
}

function useDeploymentRegistryDefaults({
  enabled,
  modelCatalog,
  t,
}: {
  enabled: boolean
  modelCatalog?: ModelCatalog
  t: ReturnType<typeof useI18n>["t"]
}) {
  const isEnabled = enabled && Boolean(modelCatalog)
  const [defaults, setDefaults] = useState<DeploymentRegistryDefaults>({
    suggestedEndpointURL: "",
    suggestedRegion: "",
    isLoading: false,
  })

  useEffect(() => {
    if (!isEnabled || !modelCatalog) {
      return
    }

    const currentModelCatalog = modelCatalog
    let ignore = false

    async function loadDefaults() {
      setDefaults((current) => ({
        ...current,
        isLoading: true,
        error: undefined,
      }))

      try {
        const params = new URLSearchParams({
          provider: currentModelCatalog.provider,
          q: currentModelCatalog.canonical_name,
          limit: "20",
        })
        const response = await fetch(
          `/api/control/model-catalog-options?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error(
            await responseError(response, t("forms.loadDeploymentDefaultsFailed"))
          )
        }

        const payload = (await response.json()) as ModelCatalogOptions
        const providerOption = payload.providers.find(
          (option) => option.provider === currentModelCatalog.provider
        )
        const modelOption = payload.models.find(
          (option) =>
            option.provider === currentModelCatalog.provider &&
            option.canonical_name === currentModelCatalog.canonical_name
        )

        if (ignore) {
          return
        }

        setDefaults({
          suggestedEndpointURL:
            modelOption?.default_endpoint_url ??
            providerOption?.default_endpoint_url ??
            "",
          suggestedRegion:
            modelOption?.default_region ?? providerOption?.default_region ?? "",
          isLoading: false,
        })
      } catch (loadError) {
        if (ignore) {
          return
        }

        setDefaults({
          suggestedEndpointURL: "",
          suggestedRegion: "",
          isLoading: false,
          error: errorText(loadError, t("forms.loadDeploymentDefaultsFailed")),
        })
      }
    }

    void loadDefaults()

    return () => {
      ignore = true
    }
  }, [isEnabled, modelCatalog, t])

  if (!isEnabled) {
    return {
      suggestedEndpointURL: "",
      suggestedRegion: "",
      isLoading: false,
    } satisfies DeploymentRegistryDefaults
  }

  return defaults
}

export function CreateModelDeploymentForm({
  workspaceId,
  modelCatalogs,
  providerCredentials,
}: {
  workspaceId?: string
  modelCatalogs: ModelCatalog[]
  providerCredentials: ProviderCredential[]
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const [selectedModelCatalogID, setSelectedModelCatalogID] = useState(
    modelCatalogs[0]?.id ?? ""
  )
  const [selectedCredentialID, setSelectedCredentialID] = useState("")
  const [deploymentName, setDeploymentName] = useState("")
  const [endpointURL, setEndpointURL] = useState("")
  const [region, setRegion] = useState("")
  const previousSuggestedDefaultsRef = useRef({
    endpointURL: "",
    region: "",
  })
  const previousGeneratedNameRef = useRef("")
  const resolvedModelCatalogID = modelCatalogs.some(
    (modelCatalog) => modelCatalog.id === selectedModelCatalogID
  )
    ? selectedModelCatalogID
    : modelCatalogs[0]?.id ?? ""

  const selectedModelCatalog = modelCatalogs.find(
    (modelCatalog) => modelCatalog.id === resolvedModelCatalogID
  )
  const matchingCredentials = selectedModelCatalog
    ? providerCredentials.filter(
        (credential) => credential.provider === selectedModelCatalog.provider
      )
    : []
  const deploymentDefaults = useDeploymentRegistryDefaults({
    enabled: Boolean(workspaceId && selectedModelCatalog),
    modelCatalog: selectedModelCatalog,
    t,
  })
  const canCreate =
    Boolean(workspaceId) &&
    modelCatalogs.length > 0 &&
    matchingCredentials.length > 0
  const generatedDeploymentName = selectedModelCatalog
    ? `${selectedModelCatalog.canonical_name}-default`
    : ""
  const resolvedCredentialID = matchingCredentials.some(
    (credential) => credential.id === selectedCredentialID
  )
    ? selectedCredentialID
    : matchingCredentials[0]?.id ?? ""

  useEffect(() => {
    setDeploymentName((current) => {
      if (current.trim() === "" || current === previousGeneratedNameRef.current) {
        return generatedDeploymentName
      }

      return current
    })
    previousGeneratedNameRef.current = generatedDeploymentName
  }, [generatedDeploymentName])

  useEffect(() => {
    const previous = previousSuggestedDefaultsRef.current

    setEndpointURL((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.endpointURL) {
        return deploymentDefaults.suggestedEndpointURL
      }

      return current
    })
    setRegion((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.region) {
        return deploymentDefaults.suggestedRegion
      }

      return current
    })

    previousSuggestedDefaultsRef.current = {
      endpointURL: deploymentDefaults.suggestedEndpointURL,
      region: deploymentDefaults.suggestedRegion,
    }
  }, [
    deploymentDefaults.suggestedEndpointURL,
    deploymentDefaults.suggestedRegion,
  ])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }

    if (!resolvedModelCatalogID || !resolvedCredentialID) {
      setError(
        matchingCredentials.length === 0
          ? t("forms.noMatchingCredentials")
          : t("forms.deploymentPrerequisite")
      )
      return
    }

    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch("/api/control/model-deployments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          model_catalog_id: resolvedModelCatalogID,
          credential_id: resolvedCredentialID,
          deployment_name: deploymentName,
          region,
          endpoint_url: endpointURL,
          priority: formData.get("priority"),
          weight: formData.get("weight"),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createDeploymentFailed"))
        )
      }

      const deployment = (await response.json()) as ModelDeployment

      setSuccess(t("actions.created", { name: deployment.deployment_name }))
      form.reset()
      setSelectedModelCatalogID(modelCatalogs[0]?.id ?? "")
      setSelectedCredentialID("")
      setDeploymentName("")
      setEndpointURL("")
      setRegion("")
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createDeploymentFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="deployment-name">
            {t("forms.newDeployment")}
          </FieldLabel>
          <Input
            id="deployment-name"
            name="deployment-name"
            value={deploymentName}
            onChange={(event) => {
              setDeploymentName(event.currentTarget.value)
              setSuccess(undefined)
              setError(undefined)
            }}
            disabled={!workspaceId || modelCatalogs.length === 0}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel id="deployment-model-catalog-label">
              {t("forms.modelCatalog")}
            </FieldLabel>
            <Select
              name="model-catalog-id"
              items={modelCatalogs.map((modelCatalog) => ({
                label: modelCatalog.canonical_name,
                value: modelCatalog.id,
              }))}
              value={resolvedModelCatalogID || null}
              disabled={!workspaceId || modelCatalogs.length === 0}
              required
              onValueChange={(value) => {
                setSelectedModelCatalogID(String(value ?? ""))
                setSuccess(undefined)
                setError(undefined)
              }}
            >
              <SelectTrigger
                id="model-catalog-id"
                aria-labelledby="deployment-model-catalog-label"
                className="w-full"
              >
                <SelectValue placeholder={t("forms.modelCatalog")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {modelCatalogs.map((modelCatalog) => (
                    <SelectItem key={modelCatalog.id} value={modelCatalog.id}>
                      {modelCatalog.canonical_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel id="deployment-credential-label">
              {t("forms.credential")}
            </FieldLabel>
            <Select
              name="credential-id"
              items={matchingCredentials.map((credential) => ({
                label: credential.credential_name,
                value: credential.id,
              }))}
              value={resolvedCredentialID || null}
              disabled={!workspaceId || matchingCredentials.length === 0}
              required
              onValueChange={(value) => {
                setSelectedCredentialID(String(value ?? ""))
                setSuccess(undefined)
                setError(undefined)
              }}
            >
              <SelectTrigger
                id="credential-id"
                aria-labelledby="deployment-credential-label"
                className="w-full"
              >
                <SelectValue placeholder={t("forms.credential")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {matchingCredentials.map((credential) => (
                    <SelectItem key={credential.id} value={credential.id}>
                      {credential.credential_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {workspaceId && matchingCredentials.length === 0 ? (
              <FieldDescription>{t("forms.noMatchingCredentials")}</FieldDescription>
            ) : null}
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="endpoint-url">{t("forms.endpointUrl")}</FieldLabel>
          <Input
            id="endpoint-url"
            name="endpoint-url"
            type="url"
            value={endpointURL}
            onChange={(event) => {
              setEndpointURL(event.currentTarget.value)
              setSuccess(undefined)
              setError(undefined)
            }}
            disabled={!workspaceId || modelCatalogs.length === 0}
          />
          <FieldDescription>
            {suggestedValueText({
              isLoading: deploymentDefaults.isLoading,
              registryValue: deploymentDefaults.suggestedEndpointURL,
              fallbackKey: "forms.deploymentDefaultsHelp",
              t,
            })}
          </FieldDescription>
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="deployment-region">
              {t("dashboard.region")}
            </FieldLabel>
            <Input
              id="deployment-region"
              name="deployment-region"
              value={region}
              onChange={(event) => {
                setRegion(event.currentTarget.value)
                setSuccess(undefined)
                setError(undefined)
              }}
              disabled={!workspaceId || modelCatalogs.length === 0}
            />
            <FieldDescription>
              {suggestedValueText({
                isLoading: deploymentDefaults.isLoading,
                registryValue: deploymentDefaults.suggestedRegion,
                fallbackKey: "forms.deploymentDefaultsHelp",
                t,
              })}
            </FieldDescription>
            {deploymentDefaults.error ? (
              <FieldError>{deploymentDefaults.error}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="priority">{t("dashboard.priority")}</FieldLabel>
            <Input
              id="priority"
              name="priority"
              type="number"
              defaultValue="1"
              min="0"
              disabled={!canCreate}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="weight">{t("dashboard.weight")}</FieldLabel>
            <Input
              id="weight"
              name="weight"
              type="number"
              defaultValue="100"
              min="0"
              disabled={!canCreate}
              required
            />
          </Field>
        </div>
        <Button
          type="submit"
          disabled={
            !canCreate ||
            isPending ||
            resolvedModelCatalogID.trim() === "" ||
            resolvedCredentialID.trim() === "" ||
            deploymentName.trim() === ""
          }
        >
          {isPending ? t("actions.creating") : t("forms.createDeployment")}
        </Button>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
    </form>
  )
}

export function EditModelDeploymentDialog({
  deployment,
  modelCatalogs,
  providerCredentials,
}: {
  deployment: ModelDeployment
  modelCatalogs: ModelCatalog[]
  providerCredentials: ProviderCredential[]
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const [selectedModelCatalogID, setSelectedModelCatalogID] = useState(
    deployment.model_catalog_id
  )
  const [selectedCredentialID, setSelectedCredentialID] = useState(
    deployment.credential_id
  )
  const [deploymentName, setDeploymentName] = useState(deployment.deployment_name)
  const [endpointURL, setEndpointURL] = useState(deployment.endpoint_url)
  const [region, setRegion] = useState(deployment.region)
  const previousSuggestedDefaultsRef = useRef({
    endpointURL: "",
    region: "",
  })
  const previousGeneratedNameRef = useRef("")
  const resolvedModelCatalogID = modelCatalogs.some(
    (modelCatalog) => modelCatalog.id === selectedModelCatalogID
  )
    ? selectedModelCatalogID
    : deployment.model_catalog_id
  const selectedModelCatalog = modelCatalogs.find(
    (modelCatalog) => modelCatalog.id === resolvedModelCatalogID
  )
  const matchingCredentials = selectedModelCatalog
    ? providerCredentials.filter(
        (credential) => credential.provider === selectedModelCatalog.provider
      )
    : []
  const deploymentDefaults = useDeploymentRegistryDefaults({
    enabled: open && Boolean(selectedModelCatalog),
    modelCatalog: selectedModelCatalog,
    t,
  })
  const generatedDeploymentName = selectedModelCatalog
    ? `${selectedModelCatalog.canonical_name}-default`
    : ""
  const resolvedCredentialID = matchingCredentials.some(
    (credential) => credential.id === selectedCredentialID
  )
    ? selectedCredentialID
    : matchingCredentials[0]?.id ?? ""

  useEffect(() => {
    if (!open) {
      return
    }

    setDeploymentName((current) => {
      if (current.trim() === "" || current === previousGeneratedNameRef.current) {
        return generatedDeploymentName
      }

      return current
    })
    previousGeneratedNameRef.current = generatedDeploymentName
  }, [generatedDeploymentName, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const previous = previousSuggestedDefaultsRef.current

    setEndpointURL((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.endpointURL) {
        return deploymentDefaults.suggestedEndpointURL
      }

      return current
    })
    setRegion((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.region) {
        return deploymentDefaults.suggestedRegion
      }

      return current
    })

    previousSuggestedDefaultsRef.current = {
      endpointURL: deploymentDefaults.suggestedEndpointURL,
      region: deploymentDefaults.suggestedRegion,
    }
  }, [
    deploymentDefaults.suggestedEndpointURL,
    deploymentDefaults.suggestedRegion,
    open,
  ])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)

    if (!resolvedModelCatalogID || !resolvedCredentialID) {
      setError(t("forms.noMatchingCredentials"))
      return
    }

    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch(
        `/api/control/model-deployments/${encodeURIComponent(deployment.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model_catalog_id: resolvedModelCatalogID,
            credential_id: resolvedCredentialID,
            deployment_name: deploymentName,
            region,
            endpoint_url: endpointURL,
            priority: formData.get("edit-priority"),
            weight: formData.get("edit-weight"),
            status: formData.get("edit-status"),
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.updateDeploymentFailed"))
        )
      }

      setOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.updateDeploymentFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setSelectedModelCatalogID(deployment.model_catalog_id)
          setSelectedCredentialID(deployment.credential_id)
          setDeploymentName(deployment.deployment_name)
          setEndpointURL(deployment.endpoint_url)
          setRegion(deployment.region)
          previousSuggestedDefaultsRef.current = {
            endpointURL: "",
            region: "",
          }
          previousGeneratedNameRef.current =
            `${deployment.model_canonical_name}-default`
        }
        setOpen(nextOpen)
        setError(undefined)
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="xs" />}>
        {t("actions.edit")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("forms.editDeployment")}</DialogTitle>
          <DialogDescription>{deployment.deployment_name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`edit-deployment-name-${deployment.id}`}>
                {t("dashboard.name")}
              </FieldLabel>
              <Input
                id={`edit-deployment-name-${deployment.id}`}
                name="edit-deployment-name"
                value={deploymentName}
                onChange={(event) => {
                  setDeploymentName(event.currentTarget.value)
                  setError(undefined)
                }}
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel id={`edit-model-catalog-label-${deployment.id}`}>
                  {t("forms.modelCatalog")}
                </FieldLabel>
                <Select
                  name="edit-model-catalog-id"
                  items={modelCatalogs.map((modelCatalog) => ({
                    label: modelCatalog.canonical_name,
                    value: modelCatalog.id,
                  }))}
                  value={resolvedModelCatalogID || null}
                  required
                  onValueChange={(value) => {
                    setSelectedModelCatalogID(String(value ?? ""))
                    setError(undefined)
                  }}
                >
                  <SelectTrigger
                    id={`edit-model-catalog-id-${deployment.id}`}
                    aria-labelledby={`edit-model-catalog-label-${deployment.id}`}
                    className="w-full"
                  >
                    <SelectValue placeholder={t("forms.modelCatalog")} />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {modelCatalogs.map((modelCatalog) => (
                        <SelectItem key={modelCatalog.id} value={modelCatalog.id}>
                          {modelCatalog.canonical_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel id={`edit-credential-label-${deployment.id}`}>
                  {t("forms.credential")}
                </FieldLabel>
                <Select
                  name="edit-credential-id"
                  items={matchingCredentials.map((credential) => ({
                    label: credential.credential_name,
                    value: credential.id,
                  }))}
                  value={resolvedCredentialID || null}
                  disabled={matchingCredentials.length === 0}
                  required
                  onValueChange={(value) => {
                    setSelectedCredentialID(String(value ?? ""))
                    setError(undefined)
                  }}
                >
                  <SelectTrigger
                    id={`edit-credential-id-${deployment.id}`}
                    aria-labelledby={`edit-credential-label-${deployment.id}`}
                    className="w-full"
                  >
                    <SelectValue placeholder={t("forms.credential")} />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {matchingCredentials.map((credential) => (
                        <SelectItem key={credential.id} value={credential.id}>
                          {credential.credential_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {matchingCredentials.length === 0 ? (
                  <FieldDescription>{t("forms.noMatchingCredentials")}</FieldDescription>
                ) : null}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`edit-endpoint-url-${deployment.id}`}>
                {t("forms.endpointUrl")}
              </FieldLabel>
              <Input
                id={`edit-endpoint-url-${deployment.id}`}
                name="edit-endpoint-url"
                type="url"
                value={endpointURL}
                onChange={(event) => {
                  setEndpointURL(event.currentTarget.value)
                  setError(undefined)
                }}
              />
              <FieldDescription>
                {suggestedValueText({
                  isLoading: deploymentDefaults.isLoading,
                  registryValue: deploymentDefaults.suggestedEndpointURL,
                  fallbackKey: "forms.deploymentDefaultsHelp",
                  t,
                })}
              </FieldDescription>
            </Field>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field>
                <FieldLabel htmlFor={`edit-deployment-region-${deployment.id}`}>
                  {t("dashboard.region")}
                </FieldLabel>
                <Input
                  id={`edit-deployment-region-${deployment.id}`}
                  name="edit-deployment-region"
                  value={region}
                  onChange={(event) => {
                    setRegion(event.currentTarget.value)
                    setError(undefined)
                  }}
                />
                <FieldDescription>
                  {suggestedValueText({
                    isLoading: deploymentDefaults.isLoading,
                    registryValue: deploymentDefaults.suggestedRegion,
                    fallbackKey: "forms.deploymentDefaultsHelp",
                    t,
                  })}
                </FieldDescription>
                {deploymentDefaults.error ? (
                  <FieldError>{deploymentDefaults.error}</FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={`edit-priority-${deployment.id}`}>
                  {t("dashboard.priority")}
                </FieldLabel>
                <Input
                  id={`edit-priority-${deployment.id}`}
                  name="edit-priority"
                  type="number"
                  min="0"
                  defaultValue={String(deployment.priority)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`edit-weight-${deployment.id}`}>
                  {t("dashboard.weight")}
                </FieldLabel>
                <Input
                  id={`edit-weight-${deployment.id}`}
                  name="edit-weight"
                  type="number"
                  min="0"
                  defaultValue={String(deployment.weight)}
                  required
                />
              </Field>
              <Field>
                <DashboardFormSelect
                  id={`edit-status-${deployment.id}`}
                  name="edit-status"
                  label={t("nav.status")}
                  defaultValue={deployment.status}
                  required
                  options={activeStatusOptions(t)}
                />
              </Field>
            </div>
            <FieldError>{error}</FieldError>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="submit"
              disabled={
                isPending ||
                resolvedModelCatalogID.trim() === "" ||
                resolvedCredentialID.trim() === "" ||
                deploymentName.trim() === ""
              }
            >
              {isPending ? t("actions.saving") : t("actions.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
