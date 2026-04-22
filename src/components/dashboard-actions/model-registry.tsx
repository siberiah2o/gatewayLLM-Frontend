"use client"

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
  ModelCatalogOption,
  ModelCatalogOptions,
  ModelCatalogProviderOption,
  ProviderCredential,
  ProviderSetup,
} from "@/lib/gatewayllm"
import { errorText, responseError } from "./shared"
import {
  defaultCredentialName,
  decodeRegistryModelValue,
  encodeRegistryModelValue,
  formatRegistrySource,
  formatTokenCount,
  joinValues,
  modelCapabilities,
  suggestedValueText,
  useRegistryProviderOptions,
} from "./registry-shared"

export function CreateModelCatalogForm({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const [isLoadingModelOptions, setIsLoadingModelOptions] = useState(false)
  const [modelOptionsError, setModelOptionsError] = useState<string>()
  const [providerOptions, setProviderOptions] = useState<ModelCatalogProviderOption[]>(
    []
  )
  const [modelOptions, setModelOptions] = useState<ModelCatalogOption[]>([])
  const [selectedProvider, setSelectedProvider] = useState("")
  const [modelName, setModelName] = useState("")
  const deferredModelName = useDeferredValue(modelName)
  const normalizedSelectedProvider = selectedProvider.trim().toLowerCase()
  const registryProviderOptions = useRegistryProviderOptions({
    enabled: Boolean(workspaceId),
    t,
  })
  const selectedProviderOption =
    providerOptions.find(
      (option) => option.provider === normalizedSelectedProvider
    ) ??
    registryProviderOptions.providers.find(
      (option) => option.provider === normalizedSelectedProvider
    )
  const selectedRegistryModel = modelOptions.find((option) => {
    if (option.canonical_name !== modelName) {
      return false
    }

    if (!normalizedSelectedProvider) {
      return true
    }

    return option.provider === normalizedSelectedProvider
  })

  useEffect(() => {
    if (!workspaceId) {
      return
    }

    let ignore = false

    async function loadOptions() {
      setIsLoadingModelOptions(true)
      setModelOptionsError(undefined)

      try {
        const params = new URLSearchParams({
          limit: "200",
        })
        const provider = selectedProvider.trim()
        const query = deferredModelName.trim()

        if (provider) {
          params.set("provider", provider)
        }
        if (query) {
          params.set("q", query)
        }

        const response = await fetch(
          `/api/control/model-catalog-options?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error(
            await responseError(response, t("forms.loadModelCatalogOptionsFailed"))
          )
        }

        const payload = (await response.json()) as ModelCatalogOptions

        if (ignore) {
          return
        }

        setProviderOptions(payload.providers)
        setModelOptions(payload.models)
      } catch (loadError) {
        if (ignore) {
          return
        }

        setProviderOptions([])
        setModelOptions([])
        setModelOptionsError(
          errorText(loadError, t("forms.loadModelCatalogOptionsFailed"))
        )
      } finally {
        if (!ignore) {
          setIsLoadingModelOptions(false)
        }
      }
    }

    void loadOptions()

    return () => {
      ignore = true
    }
  }, [deferredModelName, selectedProvider, t, workspaceId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }
    if (!selectedProvider.trim() || !modelName.trim()) {
      setError(t("errors.workspaceModelProviderRequired"))
      return
    }

    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch("/api/control/model-catalogs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          canonical_name: modelName.trim(),
          provider: selectedProvider.trim(),
          prompt_microusd_per_million: formData.get("prompt-price"),
          completion_microusd_per_million: formData.get("completion-price"),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createModelFailed"))
        )
      }

      const catalog = (await response.json()) as ModelCatalog

      setSuccess(t("actions.created", { name: catalog.canonical_name }))
      form.reset()
      setModelName("")
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createModelFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="provider">{t("forms.provider")}</FieldLabel>
          <Input
            id="provider"
            name="provider"
            value={selectedProvider}
            onChange={(event) => {
              setSelectedProvider(event.currentTarget.value)
              setSuccess(undefined)
              setError(undefined)
            }}
            disabled={!workspaceId}
            required
          />
          <FieldDescription>{t("forms.providerRegistryHelp")}</FieldDescription>
          {registryProviderOptions.error ? (
            <FieldError>{registryProviderOptions.error}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel id="provider-suggestion-label">
            {t("forms.registryProviders")}
          </FieldLabel>
          <Select
            items={registryProviderOptions.providers.map((option) => ({
              label: `${option.display_name} (${option.model_count})`,
              value: option.provider,
            }))}
            value={
              registryProviderOptions.providers.some(
                (option) => option.provider === selectedProvider.trim()
              )
                ? selectedProvider.trim()
                : null
            }
            disabled={
              !workspaceId ||
              registryProviderOptions.isLoading ||
              registryProviderOptions.providers.length === 0
            }
            onValueChange={(value) => {
              setSelectedProvider(String(value ?? ""))
              setSuccess(undefined)
              setError(undefined)
            }}
          >
            <SelectTrigger
              id="provider-suggestion"
              aria-labelledby="provider-suggestion-label"
              className="w-full"
            >
              <SelectValue placeholder={t("forms.registryProviders")} />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                {registryProviderOptions.providers.map((option) => (
                  <SelectItem key={option.provider} value={option.provider}>
                    {option.display_name} ({option.model_count})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            {registryProviderOptions.isLoading
              ? t("forms.loadingProviderRegistryOptions")
              : t("forms.registryProvidersHelp")}
          </FieldDescription>
          {!registryProviderOptions.isLoading &&
          !registryProviderOptions.error &&
          registryProviderOptions.providers.length === 0 &&
          workspaceId ? (
            <FieldDescription>
              {t("forms.noProviderRegistryOptions")}
            </FieldDescription>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="model-name">{t("forms.modelName")}</FieldLabel>
          <Input
            id="model-name"
            name="model-name"
            value={modelName}
            placeholder={selectedProviderOption?.default_model_placeholder}
            onChange={(event) => {
              setModelName(event.currentTarget.value)
              setSuccess(undefined)
              setError(undefined)
            }}
            disabled={!workspaceId}
            required
          />
          <FieldDescription>{t("forms.modelNameHelp")}</FieldDescription>
          {selectedProviderOption?.default_model_placeholder ? (
            <FieldDescription>
              {t("forms.registryRouteExample", {
                value: selectedProviderOption.default_model_placeholder,
              })}
            </FieldDescription>
          ) : null}
        </Field>
        <Field>
          <FieldLabel id="registry-match-label">
            {t("forms.registryMatches")}
          </FieldLabel>
          <Select
            items={modelOptions.map((option) => ({
              label: selectedProvider.trim()
                ? option.canonical_name
                : `${option.canonical_name} (${option.provider})`,
              value: encodeRegistryModelValue(option),
            }))}
            value={
              modelOptions.some(
                (option) =>
                  option.canonical_name === modelName &&
                  option.provider === selectedRegistryModel?.provider
              )
                ? encodeRegistryModelValue(selectedRegistryModel)
                : null
            }
            disabled={
              !workspaceId || isLoadingModelOptions || modelOptions.length === 0
            }
            onValueChange={(value) => {
              const nextSelection = decodeRegistryModelValue(String(value ?? ""))

              if (!nextSelection) {
                return
              }

              setModelName(nextSelection.canonical_name)
              setSelectedProvider(nextSelection.provider)
              setSuccess(undefined)
              setError(undefined)
            }}
          >
            <SelectTrigger
              id="registry-match"
              aria-labelledby="registry-match-label"
              className="w-full"
            >
              <SelectValue placeholder={t("forms.registryMatches")} />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                {modelOptions.map((option) => (
                  <SelectItem
                    key={`${option.provider}:${option.canonical_name}`}
                    value={encodeRegistryModelValue(option)}
                  >
                    {selectedProvider.trim()
                      ? option.canonical_name
                      : `${option.canonical_name} (${option.provider})`}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            {isLoadingModelOptions
              ? t("forms.loadingModelCatalogOptions")
              : t("forms.registryMatchesHelp")}
          </FieldDescription>
          {modelOptionsError ? <FieldError>{modelOptionsError}</FieldError> : null}
          {!isLoadingModelOptions &&
          !modelOptionsError &&
          modelOptions.length === 0 &&
          workspaceId ? (
            <FieldDescription>{t("forms.noModelCatalogOptions")}</FieldDescription>
          ) : null}
          {!isLoadingModelOptions &&
          !modelOptionsError &&
          modelName.trim() !== "" &&
          !selectedRegistryModel ? (
            <FieldDescription>{t("forms.noExactModelMatch")}</FieldDescription>
          ) : null}
        </Field>
        {selectedRegistryModel ? (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{selectedRegistryModel.canonical_name}</CardTitle>
              <CardDescription>
                {t("forms.registrySource")}:{" "}
                {formatRegistrySource(selectedRegistryModel, t)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.registryModes")}:
                </span>{" "}
                {joinValues(selectedRegistryModel.modes, t("dashboard.notSet"))}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.capabilities")}:
                </span>{" "}
                {modelCapabilities(selectedRegistryModel, t)}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.inputModalities")}:
                </span>{" "}
                {joinValues(
                  selectedRegistryModel.input_modalities,
                  t("dashboard.notSet")
                )}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.outputModalities")}:
                </span>{" "}
                {joinValues(
                  selectedRegistryModel.output_modalities,
                  t("dashboard.notSet")
                )}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.maxInputTokens")}:
                </span>{" "}
                {formatTokenCount(
                  selectedRegistryModel.max_input_tokens,
                  t("dashboard.notSet")
                )}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.maxOutputTokens")}:
                </span>{" "}
                {formatTokenCount(
                  selectedRegistryModel.max_output_tokens,
                  t("dashboard.notSet")
                )}
              </FieldDescription>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="prompt-price">
              {t("forms.promptPrice")}
            </FieldLabel>
            <Input
              id="prompt-price"
              name="prompt-price"
              type="number"
              defaultValue="150000"
              disabled={!workspaceId}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="completion-price">
              {t("forms.completionPrice")}
            </FieldLabel>
            <Input
              id="completion-price"
              name="completion-price"
              type="number"
              defaultValue="600000"
              disabled={!workspaceId}
              required
            />
          </Field>
        </div>
        <Button
          type="submit"
          disabled={
            !workspaceId ||
            isPending ||
            selectedProvider.trim() === "" ||
            modelName.trim() === ""
          }
        >
          {isPending ? t("actions.creating") : t("forms.createModel")}
        </Button>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
    </form>
  )
}

export function CreateProviderCredentialForm({
  workspaceId,
}: {
  workspaceId?: string
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState("")
  const [credentialName, setCredentialName] = useState("")
  const registryProviderOptions = useRegistryProviderOptions({
    enabled: Boolean(workspaceId),
    t,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }
    if (!selectedProvider.trim() || !credentialName.trim()) {
      setError(t("errors.workspaceProviderNameSecretRequired"))
      return
    }

    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch("/api/control/provider-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          provider: selectedProvider.trim(),
          credential_name: credentialName.trim(),
          credential_secret: formData.get("credential-secret"),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createCredentialFailed"))
        )
      }

      const credential = (await response.json()) as ProviderCredential

      setSuccess(t("actions.created", { name: credential.credential_name }))
      form.reset()
      setCredentialName(defaultCredentialName(selectedProvider))
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createCredentialFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="credential-name">
            {t("forms.newCredential")}
          </FieldLabel>
          <Input
            id="credential-name"
            name="credential-name"
            value={credentialName}
            onChange={(event) => {
              setCredentialName(event.currentTarget.value)
              setSuccess(undefined)
              setError(undefined)
            }}
            disabled={!workspaceId}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="credential-provider">{t("forms.provider")}</FieldLabel>
            <Input
              id="credential-provider"
              name="credential-provider"
              value={selectedProvider}
              onChange={(event) => {
                const nextProvider = event.currentTarget.value
                const previousDefault = defaultCredentialName(selectedProvider)

                setSelectedProvider(nextProvider)
                if (
                  credentialName.trim() === "" ||
                  credentialName === previousDefault
                ) {
                  setCredentialName(defaultCredentialName(nextProvider))
                }
                setSuccess(undefined)
                setError(undefined)
              }}
              disabled={!workspaceId}
              required
            />
            <FieldDescription>{t("forms.providerRegistryHelp")}</FieldDescription>
            {registryProviderOptions.error ? (
              <FieldError>{registryProviderOptions.error}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel id="credential-provider-label">
              {t("forms.registryProviders")}
            </FieldLabel>
            <Select
              items={registryProviderOptions.providers.map((option) => ({
                label: `${option.display_name} (${option.model_count})`,
                value: option.provider,
              }))}
              value={
                registryProviderOptions.providers.some(
                  (option) => option.provider === selectedProvider.trim()
                )
                  ? selectedProvider.trim()
                  : null
              }
              disabled={
                !workspaceId ||
                registryProviderOptions.isLoading ||
                registryProviderOptions.providers.length === 0
              }
              onValueChange={(value) => {
                const nextProvider = String(value ?? "").trim()
                const previousDefault = defaultCredentialName(selectedProvider)

                setSelectedProvider(nextProvider)
                if (
                  credentialName.trim() === "" ||
                  credentialName === previousDefault
                ) {
                  setCredentialName(defaultCredentialName(nextProvider))
                }
                setSuccess(undefined)
                setError(undefined)
              }}
            >
              <SelectTrigger
                id="credential-provider-suggestion"
                aria-labelledby="credential-provider-label"
                className="w-full"
              >
                <SelectValue placeholder={t("forms.registryProviders")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {registryProviderOptions.providers.map((option) => (
                    <SelectItem key={option.provider} value={option.provider}>
                      {option.display_name} ({option.model_count})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              {registryProviderOptions.isLoading
                ? t("forms.loadingProviderRegistryOptions")
                : t("forms.registryProvidersHelp")}
            </FieldDescription>
            {!registryProviderOptions.isLoading &&
            !registryProviderOptions.error &&
            registryProviderOptions.providers.length === 0 &&
            workspaceId ? (
              <FieldDescription>
                {t("forms.noProviderRegistryOptions")}
              </FieldDescription>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="credential-secret">
              {t("forms.secret")}
            </FieldLabel>
            <Input
              id="credential-secret"
              name="credential-secret"
              type="password"
              placeholder="sk-..."
              disabled={!workspaceId}
              required
            />
          </Field>
        </div>
        <Button
          type="submit"
          disabled={
            !workspaceId ||
            isPending ||
            selectedProvider.trim() === "" ||
            credentialName.trim() === ""
          }
        >
          {isPending ? t("actions.creating") : t("forms.createCredential")}
        </Button>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
    </form>
  )
}

export function CreateProviderSetupForm({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const [isLoadingModelOptions, setIsLoadingModelOptions] = useState(false)
  const [modelOptionsError, setModelOptionsError] = useState<string>()
  const [providerOptions, setProviderOptions] = useState<ModelCatalogProviderOption[]>(
    []
  )
  const [modelOptions, setModelOptions] = useState<ModelCatalogOption[]>([])
  const [selectedProvider, setSelectedProvider] = useState("")
  const [modelName, setModelName] = useState("")
  const [credentialName, setCredentialName] = useState("")
  const [deploymentName, setDeploymentName] = useState("")
  const [endpointURL, setEndpointURL] = useState("")
  const [region, setRegion] = useState("")
  const deferredModelName = useDeferredValue(modelName)
  const previousCredentialDefaultRef = useRef("")
  const previousGeneratedNameRef = useRef("")
  const previousSuggestedDefaultsRef = useRef({
    endpointURL: "",
    region: "",
  })
  const normalizedSelectedProvider = selectedProvider.trim().toLowerCase()
  const registryProviderOptions = useRegistryProviderOptions({
    enabled: Boolean(workspaceId),
    t,
  })
  const selectedProviderOption =
    providerOptions.find(
      (option) => option.provider === normalizedSelectedProvider
    ) ??
    registryProviderOptions.providers.find(
      (option) => option.provider === normalizedSelectedProvider
    )
  const selectedRegistryModel = modelOptions.find((option) => {
    if (option.canonical_name !== modelName) {
      return false
    }

    if (!normalizedSelectedProvider) {
      return true
    }

    return option.provider === normalizedSelectedProvider
  })
  const suggestedEndpointURL =
    selectedRegistryModel?.default_endpoint_url ??
    selectedProviderOption?.default_endpoint_url ??
    ""
  const suggestedRegion =
    selectedRegistryModel?.default_region ??
    selectedProviderOption?.default_region ??
    ""
  const isEndpointRequired =
    normalizedSelectedProvider === "openai_compatible" && !suggestedEndpointURL
  const generatedDeploymentName = modelName.trim()
    ? `${modelName.trim()}-default`
    : ""
  const generatedCredentialName = defaultCredentialName(selectedProvider)

  useEffect(() => {
    if (!workspaceId) {
      return
    }

    let ignore = false

    async function loadOptions() {
      setIsLoadingModelOptions(true)
      setModelOptionsError(undefined)

      try {
        const params = new URLSearchParams({
          limit: "200",
        })
        const provider = selectedProvider.trim()
        const query = deferredModelName.trim()

        if (provider) {
          params.set("provider", provider)
        }
        if (query) {
          params.set("q", query)
        }

        const response = await fetch(
          `/api/control/model-catalog-options?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error(
            await responseError(response, t("forms.loadModelCatalogOptionsFailed"))
          )
        }

        const payload = (await response.json()) as ModelCatalogOptions

        if (ignore) {
          return
        }

        setProviderOptions(payload.providers)
        setModelOptions(payload.models)
      } catch (loadError) {
        if (ignore) {
          return
        }

        setProviderOptions([])
        setModelOptions([])
        setModelOptionsError(
          errorText(loadError, t("forms.loadModelCatalogOptionsFailed"))
        )
      } finally {
        if (!ignore) {
          setIsLoadingModelOptions(false)
        }
      }
    }

    void loadOptions()

    return () => {
      ignore = true
    }
  }, [deferredModelName, selectedProvider, t, workspaceId])

  useEffect(() => {
    setCredentialName((current) => {
      if (
        current.trim() === "" ||
        current === previousCredentialDefaultRef.current
      ) {
        return generatedCredentialName
      }

      return current
    })
    previousCredentialDefaultRef.current = generatedCredentialName
  }, [generatedCredentialName])

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
        return suggestedEndpointURL
      }

      return current
    })
    setRegion((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.region) {
        return suggestedRegion
      }

      return current
    })

    previousSuggestedDefaultsRef.current = {
      endpointURL: suggestedEndpointURL,
      region: suggestedRegion,
    }
  }, [suggestedEndpointURL, suggestedRegion])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) {
      setError(t("forms.workspaceRequired"))
      return
    }
    if (!selectedProvider.trim() || !modelName.trim()) {
      setError(t("errors.workspaceModelProviderRequired"))
      return
    }
    if (isEndpointRequired && !endpointURL.trim()) {
      setError(t("errors.endpointUrlRequiredForOpenAICompatible"))
      return
    }

    setError(undefined)
    setSuccess(undefined)
    setIsPending(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch("/api/control/provider-setups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          provider: selectedProvider.trim(),
          model_name: modelName.trim(),
          credential_secret: formData.get("credential-secret"),
          credential_name: credentialName.trim() || undefined,
          deployment_name: deploymentName.trim() || undefined,
          endpoint_url: endpointURL.trim() || undefined,
          region: region.trim() || undefined,
          priority: formData.get("priority"),
          weight: formData.get("weight"),
          prompt_microusd_per_million: formData.get("prompt-price"),
          completion_microusd_per_million: formData.get("completion-price"),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await responseError(response, t("forms.createProviderSetupFailed"))
        )
      }

      const setup = (await response.json()) as ProviderSetup

      setSuccess(t("actions.created", { name: setup.model_name }))
      form.reset()
      setModelName("")
      setSelectedProvider("")
      setCredentialName("")
      setDeploymentName("")
      setEndpointURL("")
      setRegion("")
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createProviderSetupFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form className="rounded-lg border p-3" onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="provider-setup-provider">
              {t("forms.provider")}
            </FieldLabel>
            <Input
              id="provider-setup-provider"
              name="provider"
              value={selectedProvider}
              onChange={(event) => {
                setSelectedProvider(event.currentTarget.value)
                setSuccess(undefined)
                setError(undefined)
              }}
              disabled={!workspaceId}
              required
            />
            <FieldDescription>{t("forms.providerRegistryHelp")}</FieldDescription>
            {registryProviderOptions.error ? (
              <FieldError>{registryProviderOptions.error}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel id="provider-setup-provider-label">
              {t("forms.registryProviders")}
            </FieldLabel>
            <Select
              items={registryProviderOptions.providers.map((option) => ({
                label: `${option.display_name} (${option.model_count})`,
                value: option.provider,
              }))}
              value={
                registryProviderOptions.providers.some(
                  (option) => option.provider === selectedProvider.trim()
                )
                  ? selectedProvider.trim()
                  : null
              }
              disabled={
                !workspaceId ||
                registryProviderOptions.isLoading ||
                registryProviderOptions.providers.length === 0
              }
              onValueChange={(value) => {
                setSelectedProvider(String(value ?? ""))
                setSuccess(undefined)
                setError(undefined)
              }}
            >
              <SelectTrigger
                id="provider-setup-provider-suggestion"
                aria-labelledby="provider-setup-provider-label"
                className="w-full"
              >
                <SelectValue placeholder={t("forms.registryProviders")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {registryProviderOptions.providers.map((option) => (
                    <SelectItem key={option.provider} value={option.provider}>
                      {option.display_name} ({option.model_count})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              {registryProviderOptions.isLoading
                ? t("forms.loadingProviderRegistryOptions")
                : t("forms.registryProvidersHelp")}
            </FieldDescription>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="provider-setup-model">
              {t("forms.modelRoute")}
            </FieldLabel>
            <Input
              id="provider-setup-model"
              name="model-name"
              value={modelName}
              placeholder={selectedProviderOption?.default_model_placeholder}
              onChange={(event) => {
                setModelName(event.currentTarget.value)
                setSuccess(undefined)
                setError(undefined)
              }}
              disabled={!workspaceId}
              required
            />
            <FieldDescription>{t("forms.modelNameHelp")}</FieldDescription>
            {selectedProviderOption?.default_model_placeholder ? (
              <FieldDescription>
                {t("forms.registryRouteExample", {
                  value: selectedProviderOption.default_model_placeholder,
                })}
              </FieldDescription>
            ) : null}
          </Field>
          <Field>
            <FieldLabel id="provider-setup-model-match-label">
              {t("forms.registryMatches")}
            </FieldLabel>
            <Select
              items={modelOptions.map((option) => ({
                label: selectedProvider.trim()
                  ? option.canonical_name
                  : `${option.canonical_name} (${option.provider})`,
                value: encodeRegistryModelValue(option),
              }))}
              value={
                modelOptions.some(
                  (option) =>
                    option.canonical_name === modelName &&
                    option.provider === selectedRegistryModel?.provider
                )
                  ? encodeRegistryModelValue(selectedRegistryModel)
                  : null
              }
              disabled={
                !workspaceId || isLoadingModelOptions || modelOptions.length === 0
              }
              onValueChange={(value) => {
                const nextSelection = decodeRegistryModelValue(String(value ?? ""))

                if (!nextSelection) {
                  return
                }

                setModelName(nextSelection.canonical_name)
                setSelectedProvider(nextSelection.provider)
                setSuccess(undefined)
                setError(undefined)
              }}
            >
              <SelectTrigger
                id="provider-setup-model-match"
                aria-labelledby="provider-setup-model-match-label"
                className="w-full"
              >
                <SelectValue placeholder={t("forms.registryMatches")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {modelOptions.map((option) => (
                    <SelectItem
                      key={`${option.provider}:${option.canonical_name}`}
                      value={encodeRegistryModelValue(option)}
                    >
                      {selectedProvider.trim()
                        ? option.canonical_name
                        : `${option.canonical_name} (${option.provider})`}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              {isLoadingModelOptions
                ? t("forms.loadingModelCatalogOptions")
                : t("forms.registryMatchesHelp")}
            </FieldDescription>
            {modelOptionsError ? <FieldError>{modelOptionsError}</FieldError> : null}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="provider-setup-secret">{t("forms.secret")}</FieldLabel>
          <Input
            id="provider-setup-secret"
            name="credential-secret"
            type="password"
            placeholder="sk-..."
            disabled={!workspaceId}
            required
          />
        </Field>

        <FieldSet className="grid gap-3 rounded-lg border p-3">
          <FieldLegend>{t("forms.advancedOptions")}</FieldLegend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="provider-setup-endpoint-url">
                {t("forms.endpointUrl")}
              </FieldLabel>
              <Input
                id="provider-setup-endpoint-url"
                name="endpoint-url"
                type="url"
                value={endpointURL}
                onChange={(event) => {
                  setEndpointURL(event.currentTarget.value)
                  setSuccess(undefined)
                  setError(undefined)
                }}
                disabled={!workspaceId}
                required={isEndpointRequired}
              />
              <FieldDescription>
                {suggestedValueText({
                  isLoading: isLoadingModelOptions,
                  registryValue: suggestedEndpointURL,
                  fallbackKey: "forms.deploymentDefaultsHelp",
                  t,
                })}
              </FieldDescription>
              {isEndpointRequired ? (
                <FieldDescription>
                  {t("forms.endpointUrlRequiredForOpenAICompatible")}
                </FieldDescription>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-region">
                {t("dashboard.region")}
              </FieldLabel>
              <Input
                id="provider-setup-region"
                name="region"
                value={region}
                onChange={(event) => {
                  setRegion(event.currentTarget.value)
                  setSuccess(undefined)
                  setError(undefined)
                }}
                disabled={!workspaceId}
              />
              <FieldDescription>
                {suggestedValueText({
                  isLoading: isLoadingModelOptions,
                  registryValue: suggestedRegion,
                  fallbackKey: "forms.deploymentDefaultsHelp",
                  t,
                })}
              </FieldDescription>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="provider-setup-priority">
                {t("dashboard.priority")}
              </FieldLabel>
              <Input
                id="provider-setup-priority"
                name="priority"
                type="number"
                defaultValue="1"
                disabled={!workspaceId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-weight">
                {t("dashboard.weight")}
              </FieldLabel>
              <Input
                id="provider-setup-weight"
                name="weight"
                type="number"
                defaultValue="100"
                disabled={!workspaceId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-prompt-price">
                {t("forms.promptPrice")}
              </FieldLabel>
              <Input
                id="provider-setup-prompt-price"
                name="prompt-price"
                type="number"
                defaultValue="150000"
                disabled={!workspaceId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-completion-price">
                {t("forms.completionPrice")}
              </FieldLabel>
              <Input
                id="provider-setup-completion-price"
                name="completion-price"
                type="number"
                defaultValue="600000"
                disabled={!workspaceId}
              />
            </Field>
          </div>
        </FieldSet>

        <Button
          type="submit"
          disabled={
            !workspaceId ||
            isPending ||
            selectedProvider.trim() === "" ||
            modelName.trim() === ""
          }
        >
          {isPending ? t("actions.creating") : t("forms.createProviderSetup")}
        </Button>
        <FieldError>{error}</FieldError>
        {success ? <FieldDescription>{success}</FieldDescription> : null}
      </FieldGroup>
    </form>
  )
}
