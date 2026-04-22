"use client"

import { useEffect, useState } from "react"

import { useI18n } from "@/components/i18n-provider"
import type {
  ModelCatalogOption,
  ModelCatalogOptions,
  ModelCatalogProviderOption,
} from "@/lib/gatewayllm"
import { errorText, responseError } from "./shared"

export function useRegistryProviderOptions({
  enabled,
  t,
}: {
  enabled: boolean
  t: ReturnType<typeof useI18n>["t"]
}) {
  const [providers, setProviders] = useState<ModelCatalogProviderOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!enabled) {
      return
    }

    let ignore = false

    async function loadProviderOptions() {
      setIsLoading(true)
      setError(undefined)

      try {
        const response = await fetch("/api/control/model-catalog-options?limit=200")

        if (!response.ok) {
          throw new Error(
            await responseError(
              response,
              t("forms.loadModelCatalogOptionsFailed")
            )
          )
        }

        const payload = (await response.json()) as ModelCatalogOptions

        if (ignore) {
          return
        }

        setProviders(payload.providers)
      } catch (loadError) {
        if (ignore) {
          return
        }

        setProviders([])
        setError(errorText(loadError, t("forms.loadModelCatalogOptionsFailed")))
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void loadProviderOptions()

    return () => {
      ignore = true
    }
  }, [enabled, t])

  if (!enabled) {
    return {
      providers: [],
      isLoading: false,
      error: undefined,
    }
  }

  return {
    providers,
    isLoading,
    error,
  }
}

export function defaultCredentialName(provider: string) {
  const trimmedProvider = provider.trim()

  return trimmedProvider ? `${trimmedProvider}-default` : ""
}

export function suggestedValueText({
  isLoading,
  registryValue,
  fallbackKey,
  t,
}: {
  isLoading: boolean
  registryValue?: string
  fallbackKey: string
  t: ReturnType<typeof useI18n>["t"]
}) {
  if (isLoading) {
    return t("forms.loadingDeploymentDefaults")
  }

  if (registryValue) {
    return t("forms.registrySuggestedValue", { value: registryValue })
  }

  return t(fallbackKey)
}

export function endpointURLPlaceholder({
  providerOption,
  suggestedEndpointURL,
}: {
  providerOption?: ModelCatalogProviderOption
  suggestedEndpointURL?: string
}) {
  return suggestedEndpointURL || providerOption?.endpoint_url_placeholder
}

export function endpointURLHelp({
  provider,
  providerOption,
  endpointURLPlaceholder,
  t,
}: {
  provider?: string
  providerOption?: ModelCatalogProviderOption
  endpointURLPlaceholder?: string
  t: ReturnType<typeof useI18n>["t"]
}) {
  const normalizedProvider = provider?.trim().toLowerCase()
  const placeholder =
    endpointURLPlaceholder ?? providerOption?.endpoint_url_placeholder

  if (normalizedProvider === "azure" || normalizedProvider === "azure_ai") {
    return t("forms.azureEndpointUrlHelp")
  }

  if (placeholder) {
    return t("forms.endpointUrlPlaceholderHelp", {
      value: placeholder,
    })
  }

  return undefined
}

export function encodeRegistryModelValue(option: ModelCatalogOption | undefined) {
  if (!option) {
    return ""
  }

  return JSON.stringify({
    provider: option.provider,
    canonical_name: option.canonical_name,
  })
}

export function decodeRegistryModelValue(value: string) {
  try {
    const parsed = JSON.parse(value) as {
      provider?: unknown
      canonical_name?: unknown
    }

    if (
      typeof parsed.provider !== "string" ||
      typeof parsed.canonical_name !== "string"
    ) {
      return undefined
    }

    return {
      provider: parsed.provider,
      canonical_name: parsed.canonical_name,
    }
  } catch {
    return undefined
  }
}

export function formatRegistrySource(
  option: ModelCatalogOption,
  t: ReturnType<typeof useI18n>["t"]
) {
  if (option.source_provider) {
    return `${option.source} ${t("dashboard.via")} ${option.source_provider}`
  }

  return option.source
}

export function joinValues(values: string[] | undefined, fallback: string) {
  if (!values || values.length === 0) {
    return fallback
  }

  return values.join(", ")
}

export function modelCapabilities(
  option: ModelCatalogOption,
  t: ReturnType<typeof useI18n>["t"]
) {
  const labels = [
    option.supports_vision ? t("forms.capabilityVision") : null,
    option.supports_function_calling
      ? t("forms.capabilityFunctionCalling")
      : null,
    option.supports_tool_choice ? t("forms.capabilityToolChoice") : null,
    option.supports_reasoning ? t("forms.capabilityReasoning") : null,
    option.supports_audio_input ? t("forms.capabilityAudioInput") : null,
    option.supports_audio_output ? t("forms.capabilityAudioOutput") : null,
  ].filter((label): label is string => Boolean(label))

  if (labels.length === 0) {
    return t("dashboard.notSet")
  }

  return labels.join(", ")
}

export function formatTokenCount(value: number | undefined, fallback: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return value.toLocaleString()
}
