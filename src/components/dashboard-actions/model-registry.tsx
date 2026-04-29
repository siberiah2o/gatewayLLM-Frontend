"use client"

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { useRouter } from "next/navigation"
import { ChevronDownIcon } from "lucide-react"

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
  FieldContent,
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
import { cn } from "@/lib/utils"
import { errorText, responseError } from "./shared"
import {
  defaultCredentialName,
  endpointURLPlaceholder,
  formatRegistrySource,
  formatTokenCount,
  joinValues,
  modelCapabilities,
  useRegistryProviderOptions,
} from "./registry-shared"

const MICRO_AMOUNT_PER_CURRENCY_UNIT = 1_000_000
const DEFAULT_PROMPT_PRICE = "0.15"
const DEFAULT_COMPLETION_PRICE = "0.6"
const DEFAULT_PRICING_CURRENCY = "USD"
const SUPPORTED_PRICING_CURRENCIES = ["USD", "CNY"] as const
type SupportedPricingCurrency = (typeof SUPPORTED_PRICING_CURRENCIES)[number]

function isBedrockProviderName(provider: string) {
  const normalized = provider.trim().toLowerCase()
  return normalized === "bedrock" || normalized === "bedrock_converse"
}

function formStringValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function bedrockCredentialSecret({
  provider,
  formData,
  rawSecret,
  sslVerify,
}: {
  provider: string
  formData: FormData
  rawSecret: FormDataEntryValue | null
  sslVerify: boolean
}) {
  if (!isBedrockProviderName(provider)) {
    return formStringValue(rawSecret)
  }

  const credential: Record<string, string | boolean> = {
    ssl_verify: sslVerify,
  }
  const accessKeyID = formStringValue(formData.get("bedrock-access-key-id"))
  const secretAccessKey = formStringValue(
    formData.get("bedrock-secret-access-key")
  )
  const region = formStringValue(formData.get("bedrock-region"))
  const baseURL = formStringValue(formData.get("bedrock-base-url"))

  if (!accessKeyID || !secretAccessKey || !region) {
    return ""
  }
  credential.aws_access_key_id = accessKeyID
  credential.aws_secret_access_key = secretAccessKey
  credential.aws_region_name = region
  if (baseURL) {
    credential.base_url = baseURL
  }
  return JSON.stringify(credential)
}

function BedrockConnectionFields({
  idPrefix,
  sslVerify,
  disabled,
  onSSLVerifyChange,
}: {
  idPrefix: string
  sslVerify: boolean
  disabled: boolean
  onSSLVerifyChange: (verify: boolean) => void
}) {
  const { t } = useI18n()

  return (
    <FieldSet className="grid gap-3 rounded-md border p-2.5">
      <FieldLegend>{t("forms.bedrockConnection")}</FieldLegend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-region`}>
            {t("forms.bedrockRegion")}
          </FieldLabel>
          <Input
            id={`${idPrefix}-region`}
            name="bedrock-region"
            placeholder="us-west-2"
            autoComplete="off"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            data-lpignore="true"
            disabled={disabled}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-access-key-id`}>
            {t("forms.bedrockAccessKeyID")}
          </FieldLabel>
          <Input
            id={`${idPrefix}-access-key-id`}
            name="bedrock-access-key-id"
            autoComplete="off"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            data-lpignore="true"
            disabled={disabled}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-secret-access-key`}>
            {t("forms.bedrockSecretAccessKey")}
          </FieldLabel>
          <Input
            id={`${idPrefix}-secret-access-key`}
            name="bedrock-secret-access-key"
            type="password"
            autoComplete="new-password"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            data-lpignore="true"
            disabled={disabled}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-base-url`}>
            {t("forms.bedrockBaseURL")}
          </FieldLabel>
          <Input
            id={`${idPrefix}-base-url`}
            name="bedrock-base-url"
            type="url"
            placeholder="https://bedrock-runtime.us-west-2.amazonaws.com"
            autoComplete="off"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            data-lpignore="true"
            disabled={disabled}
          />
          <FieldDescription>{t("forms.bedrockBaseURLHelp")}</FieldDescription>
        </Field>
        <Field orientation="horizontal" className="items-start">
          <input
            id={`${idPrefix}-ssl-verify`}
            type="checkbox"
            checked={sslVerify}
            onChange={(event) => onSSLVerifyChange(event.currentTarget.checked)}
            disabled={disabled}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <FieldContent>
            <FieldLabel htmlFor={`${idPrefix}-ssl-verify`}>
              {t("forms.bedrockSSLVerify")}
            </FieldLabel>
            <FieldDescription>{t("forms.bedrockSSLVerifyHelp")}</FieldDescription>
          </FieldContent>
        </Field>
      </div>
    </FieldSet>
  )
}

function normalizePricingCurrency(
  currency: string | undefined,
  fallback = DEFAULT_PRICING_CURRENCY
) {
  const normalized = currency?.trim().toUpperCase()

  if (
    normalized &&
    SUPPORTED_PRICING_CURRENCIES.includes(normalized as SupportedPricingCurrency)
  ) {
    return normalized
  }

  return fallback
}

function pricingCurrencyOptions(t: ReturnType<typeof useI18n>["t"]) {
  return [
    { value: "USD", label: t("forms.currencyUsd") },
    { value: "CNY", label: t("forms.currencyCny") },
  ]
}

function microAmountToPriceInput(value: number | undefined, fallback: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return (value / MICRO_AMOUNT_PER_CURRENCY_UNIT)
    .toFixed(6)
    .replace(/\.?0+$/, "")
}

function priceInputToMicroAmount(value: string) {
  const trimmed = value.trim()
  if (trimmed === "") {
    return undefined
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) {
    return trimmed
  }

  return String(Math.round(parsed * MICRO_AMOUNT_PER_CURRENCY_UNIT))
}

function priceCurrencyUnit(
  currency: string | undefined,
  t: ReturnType<typeof useI18n>["t"]
) {
  const normalizedCurrency = currency?.trim().toUpperCase()

  if (normalizedCurrency === "CNY") {
    return t("forms.currencyUnitCny")
  }
  if (normalizedCurrency === "USD") {
    return t("forms.currencyUnitUsd")
  }

  return normalizedCurrency || t("forms.currencyUnitUsd")
}

function priceUnitText(
  currency: string | undefined,
  t: ReturnType<typeof useI18n>["t"]
) {
  return t("forms.pricePerMillionTokens", {
    currency: priceCurrencyUnit(currency, t),
  })
}

function priceFieldLabel({
  label,
  currency,
  t,
}: {
  label: string
  currency?: string
  t: ReturnType<typeof useI18n>["t"]
}) {
  return t("forms.priceLabelWithUnit", {
    label,
    unit: priceUnitText(currency, t),
  })
}

function formatMicroPrice({
  value,
  fallback,
  currency,
  t,
}: {
  value: number | undefined
  fallback: string
  currency?: string
  t: ReturnType<typeof useI18n>["t"]
}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return t("forms.pricePerMillionAmount", {
    amount: microAmountToPriceInput(value, "0"),
    unit: priceUnitText(currency, t),
  })
}

function PricingCurrencyField({
  id,
  value,
  disabled,
  onValueChange,
}: {
  id: string
  value: string
  disabled?: boolean
  onValueChange: (value: string) => void
}) {
  const { t } = useI18n()
  const options = pricingCurrencyOptions(t)

  return (
    <Field>
      <FieldLabel htmlFor={id}>{t("forms.currency")}</FieldLabel>
      <Select
        items={options}
        value={value}
        disabled={disabled}
        onValueChange={(nextValue) => {
          onValueChange(String(nextValue ?? DEFAULT_PRICING_CURRENCY))
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={t("forms.currency")} />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function modelPromptCacheHitPrice(option: ModelCatalogOption | undefined) {
  return (
    option?.prompt_cache_hit_micro_amount_per_million ??
    option?.prompt_cache_hit_microusd_per_million ??
    option?.prompt_micro_amount_per_million ??
    option?.prompt_microusd_per_million
  )
}

function modelPromptPrice(option: ModelCatalogOption | undefined) {
  return (
    option?.prompt_micro_amount_per_million ??
    option?.prompt_microusd_per_million
  )
}

function modelCompletionPrice(option: ModelCatalogOption | undefined) {
  return (
    option?.completion_micro_amount_per_million ??
    option?.completion_microusd_per_million
  )
}

function RegistryProviderField({
  id,
  name,
  value,
  options,
  isLoading,
  error,
  enabled,
  disabled,
  required,
  onValueChange,
  onRegistryProviderSelect,
}: {
  id: string
  name: string
  value: string
  options: ModelCatalogProviderOption[]
  isLoading: boolean
  error?: string
  enabled: boolean
  disabled?: boolean
  required?: boolean
  onValueChange: (value: string) => void
  onRegistryProviderSelect: (option: ModelCatalogProviderOption) => void
}) {
  const { t } = useI18n()
  const listId = `${id}-registry-options`
  const [isOpen, setIsOpen] = useState(false)
  const showDropdown = isOpen && !disabled
  const normalizedValue = value.trim().toLowerCase()
  const selectedOption = options.find(
    (option) => option.provider.trim().toLowerCase() === normalizedValue
  )

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.currentTarget.value
    const exactOption = options.find(
      (option) =>
        option.provider.trim().toLowerCase() === nextValue.trim().toLowerCase()
    )

    onValueChange(nextValue)
    if (exactOption) {
      onRegistryProviderSelect(exactOption)
    }
  }

  function selectOption(option: ModelCatalogProviderOption) {
    onRegistryProviderSelect(option)
    setIsOpen(false)
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{t("forms.provider")}</FieldLabel>
      <div
        className="relative"
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120)
        }}
      >
        <div className="flex">
          <Input
            id={id}
            name={name}
            value={value}
            placeholder={t("forms.providerPlaceholder")}
            autoComplete="off"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            data-lpignore="true"
            spellCheck={false}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showDropdown}
            onFocus={() => setIsOpen(true)}
            onChange={handleChange}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                setIsOpen(true)
              }
              if (event.key === "Escape") {
                setIsOpen(false)
              }
            }}
            disabled={disabled}
            required={required}
            className="rounded-r-none border-r-0"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("forms.registryProviders")}
            aria-controls={listId}
            aria-expanded={showDropdown}
            disabled={disabled}
            className="rounded-l-none"
            onMouseDown={(event) => {
              event.preventDefault()
            }}
            onClick={() => setIsOpen((current) => !current)}
          >
            <ChevronDownIcon />
          </Button>
        </div>
        {showDropdown ? (
          <div
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {isLoading ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {t("forms.loadingProviderRegistryOptions")}
              </div>
            ) : options.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {t("forms.noProviderRegistryOptions")}
              </div>
            ) : (
              options.map((option) => {
                const selected = selectedOption?.provider === option.provider

                return (
                  <button
                    key={option.provider}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full min-w-0 flex-col rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                      selected && "bg-accent text-accent-foreground"
                    )}
                    onMouseDown={(event) => {
                      event.preventDefault()
                    }}
                    onClick={() => selectOption(option)}
                  >
                    <span className="truncate text-sm font-medium">
                      {option.provider}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {option.display_name} ({option.model_count})
                    </span>
                  </button>
                )
              })
            )}
          </div>
        ) : null}
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
      {!isLoading && !error && options.length === 0 && enabled ? (
        <FieldDescription>{t("forms.noProviderRegistryOptions")}</FieldDescription>
      ) : null}
    </Field>
  )
}

function RegistryModelRouteField({
  id,
  name,
  value,
  provider,
  placeholder,
  options,
  selectedOption,
  isLoading,
  error,
  enabled,
  disabled,
  required,
  onValueChange,
  onRegistryModelSelect,
  onOpenChange,
}: {
  id: string
  name: string
  value: string
  provider: string
  placeholder?: string
  options: ModelCatalogOption[]
  selectedOption?: ModelCatalogOption
  isLoading: boolean
  error?: string
  enabled: boolean
  disabled?: boolean
  required?: boolean
  onValueChange: (value: string) => void
  onRegistryModelSelect: (option: ModelCatalogOption) => void
  onOpenChange?: (open: boolean) => void
}) {
  const { t } = useI18n()
  const listId = `${id}-registry-options`
  const includeProvider = provider.trim() === ""
  const [isOpen, setIsOpen] = useState(false)
  const showDropdown = isOpen && !disabled
  const visibleOptions = options.slice(0, 50)

  function setDropdownOpen(open: boolean) {
    setIsOpen(open)
    onOpenChange?.(open)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.currentTarget.value
    const exactOption = options.find(
      (option) => option.canonical_name === nextValue
    )

    onValueChange(nextValue)
    if (exactOption) {
      onRegistryModelSelect(exactOption)
    }
  }

  function selectOption(option: ModelCatalogOption) {
    onRegistryModelSelect(option)
    setDropdownOpen(false)
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{t("forms.modelRoute")}</FieldLabel>
      <div
        className="relative"
        onBlur={() => {
          window.setTimeout(() => setDropdownOpen(false), 120)
        }}
      >
        <div className="flex">
          <Input
            id={id}
            name={name}
            value={value}
            placeholder={placeholder || t("forms.modelRoutePlaceholder")}
            autoComplete="off"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            data-lpignore="true"
            spellCheck={false}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showDropdown}
            onFocus={() => setDropdownOpen(true)}
            onChange={handleChange}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                setDropdownOpen(true)
              }
              if (event.key === "Escape") {
                setDropdownOpen(false)
              }
            }}
            disabled={disabled}
            required={required}
            className="rounded-r-none border-r-0"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("forms.registryMatches")}
            aria-controls={listId}
            aria-expanded={showDropdown}
            disabled={disabled}
            className="rounded-l-none"
            onMouseDown={(event) => {
              event.preventDefault()
            }}
            onClick={() => setDropdownOpen(!isOpen)}
          >
            <ChevronDownIcon />
          </Button>
        </div>
        {showDropdown ? (
          <div
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {isLoading ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {t("forms.loadingModelCatalogOptions")}
              </div>
            ) : visibleOptions.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {t("forms.noModelCatalogOptions")}
              </div>
            ) : (
              visibleOptions.map((option) => {
                const selected =
                  selectedOption?.provider === option.provider &&
                  selectedOption.canonical_name === option.canonical_name
                const sourceText = includeProvider
                  ? `${option.provider} - ${formatRegistrySource(option, t)}`
                  : formatRegistrySource(option, t)
                const detailText = option.upstream_model_name
                  ? option.upstream_model_name
                  : sourceText

                return (
                  <button
                    key={`${option.provider}:${option.canonical_name}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full min-w-0 flex-col rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                      selected && "bg-accent text-accent-foreground"
                    )}
                    onMouseDown={(event) => {
                      event.preventDefault()
                    }}
                    onClick={() => selectOption(option)}
                  >
                    <span className="truncate text-sm font-medium">
                      {option.canonical_name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {detailText}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        ) : null}
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
      {!isLoading && !error && options.length === 0 && enabled ? (
        <FieldDescription>{t("forms.noModelCatalogOptions")}</FieldDescription>
      ) : null}
      {!isLoading &&
      !error &&
      enabled &&
      value.trim() !== "" &&
      !selectedOption ? (
        <FieldDescription>{t("forms.noExactModelMatch")}</FieldDescription>
      ) : null}
    </Field>
  )
}

export function CreateModelCatalogForm({
  workspaceId,
  workspaceCurrency,
}: {
  workspaceId?: string
  workspaceCurrency?: string
}) {
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
  const [isModelRouteDropdownOpen, setIsModelRouteDropdownOpen] =
    useState(false)
  const [selectedProvider, setSelectedProvider] = useState("")
  const [modelName, setModelName] = useState("")
  const [promptCacheHitPrice, setPromptCacheHitPrice] =
    useState(DEFAULT_PROMPT_PRICE)
  const [promptPrice, setPromptPrice] = useState(DEFAULT_PROMPT_PRICE)
  const [completionPrice, setCompletionPrice] =
    useState(DEFAULT_COMPLETION_PRICE)
  const [pricingCurrency, setPricingCurrency] = useState(() =>
    normalizePricingCurrency(workspaceCurrency)
  )
  const deferredModelName = useDeferredValue(modelName)
  const previousSuggestedPricingCurrencyRef = useRef(
    normalizePricingCurrency(workspaceCurrency)
  )
  const previousSuggestedPricingRef = useRef({
    promptCacheHitPrice: DEFAULT_PROMPT_PRICE,
    promptPrice: DEFAULT_PROMPT_PRICE,
    completionPrice: DEFAULT_COMPLETION_PRICE,
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
  const matchingModelOptions = modelOptions.filter((option) => {
    if (!normalizedSelectedProvider) {
      return true
    }

    return option.provider.trim().toLowerCase() === normalizedSelectedProvider
  })
  const selectedRegistryModel = matchingModelOptions.find((option) => {
    if (option.canonical_name !== modelName) {
      return false
    }

    return true
  })
  const suggestedPricingCurrency = normalizePricingCurrency(
    selectedRegistryModel?.pricing_currency ?? workspaceCurrency
  )
  const effectivePricingCurrency = normalizePricingCurrency(
    pricingCurrency,
    suggestedPricingCurrency
  )
  const suggestedPromptCacheHitPrice = microAmountToPriceInput(
    modelPromptCacheHitPrice(selectedRegistryModel),
    DEFAULT_PROMPT_PRICE
  )
  const suggestedPromptPrice = microAmountToPriceInput(
    modelPromptPrice(selectedRegistryModel),
    DEFAULT_PROMPT_PRICE
  )
  const suggestedCompletionPrice = microAmountToPriceInput(
    modelCompletionPrice(selectedRegistryModel),
    DEFAULT_COMPLETION_PRICE
  )

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
        const query = isModelRouteDropdownOpen ? "" : deferredModelName.trim()

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
  }, [
    deferredModelName,
    isModelRouteDropdownOpen,
    selectedProvider,
    t,
    workspaceId,
  ])

  useEffect(() => {
    const previous = previousSuggestedPricingRef.current

    setPromptCacheHitPrice((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.promptCacheHitPrice) {
        return suggestedPromptCacheHitPrice
      }

      return current
    })
    setPromptPrice((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.promptPrice) {
        return suggestedPromptPrice
      }

      return current
    })
    setCompletionPrice((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.completionPrice) {
        return suggestedCompletionPrice
      }

      return current
    })

    previousSuggestedPricingRef.current = {
      promptCacheHitPrice: suggestedPromptCacheHitPrice,
      promptPrice: suggestedPromptPrice,
      completionPrice: suggestedCompletionPrice,
    }
  }, [
    suggestedCompletionPrice,
    suggestedPromptCacheHitPrice,
    suggestedPromptPrice,
  ])

  useEffect(() => {
    setPricingCurrency((current) => {
      const normalizedCurrent = normalizePricingCurrency(current, "")
      if (
        normalizedCurrent === "" ||
        normalizedCurrent === previousSuggestedPricingCurrencyRef.current
      ) {
        return suggestedPricingCurrency
      }

      return normalizedCurrent
    })
    previousSuggestedPricingCurrencyRef.current = suggestedPricingCurrency
  }, [suggestedPricingCurrency])

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
          pricing_currency: effectivePricingCurrency,
          prompt_cache_hit_micro_amount_per_million:
            priceInputToMicroAmount(promptCacheHitPrice),
          prompt_micro_amount_per_million:
            priceInputToMicroAmount(promptPrice),
          completion_micro_amount_per_million:
            priceInputToMicroAmount(completionPrice),
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
      setPricingCurrency(normalizePricingCurrency(workspaceCurrency))
      setPromptCacheHitPrice(DEFAULT_PROMPT_PRICE)
      setPromptPrice(DEFAULT_PROMPT_PRICE)
      setCompletionPrice(DEFAULT_COMPLETION_PRICE)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createModelFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form
      className="rounded-md border p-2.5"
      autoComplete="off"
      data-form-type="other"
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <RegistryProviderField
          id="provider"
          name="provider"
          value={selectedProvider}
          options={registryProviderOptions.providers}
          isLoading={registryProviderOptions.isLoading}
          error={registryProviderOptions.error}
          enabled={Boolean(workspaceId)}
          disabled={!workspaceId}
          required
          onValueChange={(nextProvider) => {
            setSelectedProvider(nextProvider)
            setSuccess(undefined)
            setError(undefined)
          }}
          onRegistryProviderSelect={(option) => {
            setSelectedProvider(option.provider)
            setSuccess(undefined)
            setError(undefined)
          }}
        />
        <RegistryModelRouteField
          id="model-name"
          name="model-name"
          value={modelName}
          provider={selectedProvider}
          placeholder={selectedProviderOption?.default_model_placeholder}
          options={matchingModelOptions}
          selectedOption={selectedRegistryModel}
          isLoading={isLoadingModelOptions}
          error={modelOptionsError}
          enabled={Boolean(workspaceId)}
          disabled={!workspaceId}
          required
          onValueChange={(nextModelName) => {
            setModelName(nextModelName)
            setSuccess(undefined)
            setError(undefined)
          }}
          onRegistryModelSelect={(option) => {
            setModelName(option.canonical_name)
            if (!normalizedSelectedProvider) {
              setSelectedProvider(option.provider)
            }
            setSuccess(undefined)
            setError(undefined)
          }}
          onOpenChange={setIsModelRouteDropdownOpen}
        />
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
              {selectedRegistryModel.upstream_model_name ? (
                <FieldDescription>
                  <span className="font-medium text-foreground">
                    {t("forms.upstreamModelName")}:
                  </span>{" "}
                  {selectedRegistryModel.upstream_model_name}
                </FieldDescription>
              ) : null}
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
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.promptCacheHitPrice")}:
                </span>{" "}
                {formatMicroPrice({
                  value: modelPromptCacheHitPrice(selectedRegistryModel),
                  fallback: t("dashboard.notSet"),
                  currency: effectivePricingCurrency,
                  t,
                })}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.promptPrice")}:
                </span>{" "}
                {formatMicroPrice({
                  value: modelPromptPrice(selectedRegistryModel),
                  fallback: t("dashboard.notSet"),
                  currency: effectivePricingCurrency,
                  t,
                })}
              </FieldDescription>
              <FieldDescription>
                <span className="font-medium text-foreground">
                  {t("forms.completionPrice")}:
                </span>{" "}
                {formatMicroPrice({
                  value: modelCompletionPrice(selectedRegistryModel),
                  fallback: t("dashboard.notSet"),
                  currency: effectivePricingCurrency,
                  t,
                })}
              </FieldDescription>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-4">
          <PricingCurrencyField
            id="pricing-currency"
            value={effectivePricingCurrency}
            disabled={!workspaceId}
            onValueChange={(nextCurrency) => {
              setPricingCurrency(normalizePricingCurrency(nextCurrency))
              setSuccess(undefined)
              setError(undefined)
            }}
          />
          <Field>
            <FieldLabel htmlFor="prompt-cache-hit-price">
              {priceFieldLabel({
                label: t("forms.promptCacheHitPrice"),
                currency: effectivePricingCurrency,
                t,
              })}
            </FieldLabel>
            <Input
              id="prompt-cache-hit-price"
              name="prompt-cache-hit-price"
              type="number"
              min="0"
              step="0.000001"
              value={promptCacheHitPrice}
              onChange={(event) => {
                setPromptCacheHitPrice(event.currentTarget.value)
                setSuccess(undefined)
                setError(undefined)
              }}
              disabled={!workspaceId}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="prompt-price">
              {priceFieldLabel({
                label: t("forms.promptPrice"),
                currency: effectivePricingCurrency,
                t,
              })}
            </FieldLabel>
            <Input
              id="prompt-price"
              name="prompt-price"
              type="number"
              min="0"
              step="0.000001"
              value={promptPrice}
              onChange={(event) => {
                setPromptPrice(event.currentTarget.value)
                setSuccess(undefined)
                setError(undefined)
              }}
              disabled={!workspaceId}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="completion-price">
              {priceFieldLabel({
                label: t("forms.completionPrice"),
                currency: effectivePricingCurrency,
                t,
              })}
            </FieldLabel>
            <Input
              id="completion-price"
              name="completion-price"
              type="number"
              min="0"
              step="0.000001"
              value={completionPrice}
              onChange={(event) => {
                setCompletionPrice(event.currentTarget.value)
                setSuccess(undefined)
                setError(undefined)
              }}
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
  const [bedrockSSLVerify, setBedrockSSLVerify] = useState(true)
  const registryProviderOptions = useRegistryProviderOptions({
    enabled: Boolean(workspaceId),
    t,
  })
  const isBedrockProvider = isBedrockProviderName(selectedProvider)

  function updateSelectedProvider(nextProvider: string) {
    const previousDefault = defaultCredentialName(selectedProvider)

    setSelectedProvider(nextProvider)
    if (credentialName.trim() === "" || credentialName === previousDefault) {
      setCredentialName(defaultCredentialName(nextProvider))
    }
    setSuccess(undefined)
    setError(undefined)
  }

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
    const credentialSecret = bedrockCredentialSecret({
      provider: selectedProvider,
      formData,
      rawSecret: formData.get("credential-secret"),
      sslVerify: bedrockSSLVerify,
    })

    if (!credentialSecret) {
      setError(t("errors.workspaceProviderNameSecretRequired"))
      setIsPending(false)
      return
    }

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
          credential_secret: credentialSecret,
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
      setBedrockSSLVerify(true)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createCredentialFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form
      className="rounded-md border p-2.5"
      autoComplete="off"
      data-form-type="other"
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="credential-name">
            {t("forms.newCredential")}
          </FieldLabel>
          <Input
            id="credential-name"
            name="credential-name"
            value={credentialName}
            autoComplete="off"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            data-lpignore="true"
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
          <RegistryProviderField
            id="credential-provider"
            name="credential-provider"
            value={selectedProvider}
            options={registryProviderOptions.providers}
            isLoading={registryProviderOptions.isLoading}
            error={registryProviderOptions.error}
            enabled={Boolean(workspaceId)}
            disabled={!workspaceId}
            required
            onValueChange={updateSelectedProvider}
            onRegistryProviderSelect={(option) =>
              updateSelectedProvider(option.provider)
            }
          />
          {!isBedrockProvider ? (
            <Field>
              <FieldLabel htmlFor="credential-secret">
                {t("forms.secret")}
              </FieldLabel>
              <Input
                id="credential-secret"
                name="credential-secret"
                type="password"
                placeholder="sk-..."
                autoComplete="new-password"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                data-lpignore="true"
                disabled={!workspaceId}
                required
              />
            </Field>
          ) : null}
        </div>
        {isBedrockProvider ? (
          <BedrockConnectionFields
            idPrefix="credential-bedrock"
            sslVerify={bedrockSSLVerify}
            disabled={!workspaceId}
            onSSLVerifyChange={(verify) => {
              setBedrockSSLVerify(verify)
              setSuccess(undefined)
              setError(undefined)
            }}
          />
        ) : null}
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

export function CreateProviderSetupForm({
  workspaceId,
  workspaceCurrency,
}: {
  workspaceId?: string
  workspaceCurrency?: string
}) {
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
  const [isModelRouteDropdownOpen, setIsModelRouteDropdownOpen] =
    useState(false)
  const [selectedProvider, setSelectedProvider] = useState("")
  const [modelName, setModelName] = useState("")
  const [credentialName, setCredentialName] = useState("")
  const [deploymentName, setDeploymentName] = useState("")
  const [endpointURL, setEndpointURL] = useState("")
  const [bedrockSSLVerify, setBedrockSSLVerify] = useState(true)
  const [promptCacheHitPrice, setPromptCacheHitPrice] =
    useState(DEFAULT_PROMPT_PRICE)
  const [promptPrice, setPromptPrice] = useState(DEFAULT_PROMPT_PRICE)
  const [completionPrice, setCompletionPrice] =
    useState(DEFAULT_COMPLETION_PRICE)
  const [pricingCurrency, setPricingCurrency] = useState(() =>
    normalizePricingCurrency(workspaceCurrency)
  )
  const deferredModelName = useDeferredValue(modelName)
  const previousCredentialDefaultRef = useRef("")
  const previousGeneratedNameRef = useRef("")
  const previousSuggestedDefaultsRef = useRef({
    endpointURL: "",
  })
  const previousSuggestedPricingCurrencyRef = useRef(
    normalizePricingCurrency(workspaceCurrency)
  )
  const previousSuggestedPricingRef = useRef({
    promptCacheHitPrice: DEFAULT_PROMPT_PRICE,
    promptPrice: DEFAULT_PROMPT_PRICE,
    completionPrice: DEFAULT_COMPLETION_PRICE,
  })
  const normalizedSelectedProvider = selectedProvider.trim().toLowerCase()
  const isBedrockProvider =
    normalizedSelectedProvider === "bedrock" ||
    normalizedSelectedProvider === "bedrock_converse"
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
  const matchingModelOptions = modelOptions.filter((option) => {
    if (!normalizedSelectedProvider) {
      return true
    }

    return option.provider.trim().toLowerCase() === normalizedSelectedProvider
  })
  const selectedRegistryModel = matchingModelOptions.find((option) => {
    if (option.canonical_name !== modelName) {
      return false
    }

    return true
  })
  const suggestedPricingCurrency = normalizePricingCurrency(
    selectedRegistryModel?.pricing_currency ?? workspaceCurrency
  )
  const effectivePricingCurrency = normalizePricingCurrency(
    pricingCurrency,
    suggestedPricingCurrency
  )
  const suggestedEndpointURL =
    selectedRegistryModel?.default_endpoint_url ??
    selectedProviderOption?.default_endpoint_url ??
    ""
  const suggestedEndpointURLPlaceholder = endpointURLPlaceholder({
    providerOption: selectedProviderOption,
    suggestedEndpointURL,
  })
  const suggestedPromptCacheHitPrice = microAmountToPriceInput(
    modelPromptCacheHitPrice(selectedRegistryModel),
    DEFAULT_PROMPT_PRICE
  )
  const suggestedPromptPrice = microAmountToPriceInput(
    modelPromptPrice(selectedRegistryModel),
    DEFAULT_PROMPT_PRICE
  )
  const suggestedCompletionPrice = microAmountToPriceInput(
    modelCompletionPrice(selectedRegistryModel),
    DEFAULT_COMPLETION_PRICE
  )
  const isEndpointRequired =
    normalizedSelectedProvider !== "" && !suggestedEndpointURL
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
        const query = isModelRouteDropdownOpen ? "" : deferredModelName.trim()

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
  }, [
    deferredModelName,
    isModelRouteDropdownOpen,
    selectedProvider,
    t,
    workspaceId,
  ])

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
    previousSuggestedDefaultsRef.current = {
      endpointURL: suggestedEndpointURL,
    }
  }, [suggestedEndpointURL])

  useEffect(() => {
    const previous = previousSuggestedPricingRef.current

    setPromptCacheHitPrice((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.promptCacheHitPrice) {
        return suggestedPromptCacheHitPrice
      }

      return current
    })
    setPromptPrice((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.promptPrice) {
        return suggestedPromptPrice
      }

      return current
    })
    setCompletionPrice((current) => {
      const trimmed = current.trim()
      if (trimmed === "" || trimmed === previous.completionPrice) {
        return suggestedCompletionPrice
      }

      return current
    })

    previousSuggestedPricingRef.current = {
      promptCacheHitPrice: suggestedPromptCacheHitPrice,
      promptPrice: suggestedPromptPrice,
      completionPrice: suggestedCompletionPrice,
    }
  }, [
    suggestedCompletionPrice,
    suggestedPromptCacheHitPrice,
    suggestedPromptPrice,
  ])

  useEffect(() => {
    setPricingCurrency((current) => {
      const normalizedCurrent = normalizePricingCurrency(current, "")
      if (
        normalizedCurrent === "" ||
        normalizedCurrent === previousSuggestedPricingCurrencyRef.current
      ) {
        return suggestedPricingCurrency
      }

      return normalizedCurrent
    })
    previousSuggestedPricingCurrencyRef.current = suggestedPricingCurrency
  }, [suggestedPricingCurrency])

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
    const credentialSecret = bedrockCredentialSecret({
      provider: selectedProvider,
      formData,
      rawSecret: formData.get("credential-secret"),
      sslVerify: bedrockSSLVerify,
    })

    if (!credentialSecret) {
      setError(t("errors.workspaceProviderNameSecretRequired"))
      setIsPending(false)
      return
    }

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
          credential_secret: credentialSecret,
          credential_name: credentialName.trim() || undefined,
          deployment_name: deploymentName.trim() || undefined,
          endpoint_url: endpointURL.trim() || undefined,
          priority: formData.get("priority"),
          weight: formData.get("weight"),
          pricing_currency: effectivePricingCurrency,
          prompt_cache_hit_micro_amount_per_million:
            priceInputToMicroAmount(promptCacheHitPrice),
          prompt_micro_amount_per_million:
            priceInputToMicroAmount(promptPrice),
          completion_micro_amount_per_million:
            priceInputToMicroAmount(completionPrice),
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
      setBedrockSSLVerify(true)
      setPricingCurrency(normalizePricingCurrency(workspaceCurrency))
      setPromptCacheHitPrice(DEFAULT_PROMPT_PRICE)
      setPromptPrice(DEFAULT_PROMPT_PRICE)
      setCompletionPrice(DEFAULT_COMPLETION_PRICE)
      router.refresh()
    } catch (submitError) {
      setError(errorText(submitError, t("forms.createProviderSetupFailed")))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form
      className="rounded-md border p-2.5"
      autoComplete="off"
      data-form-type="other"
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <RegistryProviderField
          id="provider-setup-provider"
          name="provider"
          value={selectedProvider}
          options={registryProviderOptions.providers}
          isLoading={registryProviderOptions.isLoading}
          error={registryProviderOptions.error}
          enabled={Boolean(workspaceId)}
          disabled={!workspaceId}
          required
          onValueChange={(nextProvider) => {
            setSelectedProvider(nextProvider)
            setSuccess(undefined)
            setError(undefined)
          }}
          onRegistryProviderSelect={(option) => {
            setSelectedProvider(option.provider)
            setSuccess(undefined)
            setError(undefined)
          }}
        />

        <RegistryModelRouteField
          id="provider-setup-model"
          name="model-name"
          value={modelName}
          provider={selectedProvider}
          placeholder={selectedProviderOption?.default_model_placeholder}
          options={matchingModelOptions}
          selectedOption={selectedRegistryModel}
          isLoading={isLoadingModelOptions}
          error={modelOptionsError}
          enabled={Boolean(workspaceId)}
          disabled={!workspaceId}
          required
          onValueChange={(nextModelName) => {
            setModelName(nextModelName)
            setSuccess(undefined)
            setError(undefined)
          }}
          onRegistryModelSelect={(option) => {
            setModelName(option.canonical_name)
            if (!normalizedSelectedProvider) {
              setSelectedProvider(option.provider)
            }
            setSuccess(undefined)
            setError(undefined)
          }}
          onOpenChange={setIsModelRouteDropdownOpen}
        />

        {isBedrockProvider ? (
          <BedrockConnectionFields
            idPrefix="provider-setup-bedrock"
            sslVerify={bedrockSSLVerify}
            disabled={!workspaceId}
            onSSLVerifyChange={(verify) => {
              setBedrockSSLVerify(verify)
              setSuccess(undefined)
              setError(undefined)
            }}
          />
        ) : null}

        {!isBedrockProvider ? (
          <Field>
            <FieldLabel htmlFor="provider-setup-secret">{t("forms.secret")}</FieldLabel>
            <Input
              id="provider-setup-secret"
              name="credential-secret"
              type="password"
              placeholder="sk-..."
              autoComplete="new-password"
              data-1p-ignore="true"
              data-bwignore="true"
              data-form-type="other"
              data-lpignore="true"
              disabled={!workspaceId}
              required
            />
          </Field>
        ) : null}

        <FieldSet className="grid gap-3 rounded-md border p-2.5">
          <FieldLegend>{t("forms.advancedOptions")}</FieldLegend>
          <div className="grid gap-3">
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
                placeholder={suggestedEndpointURLPlaceholder}
              />
              {isEndpointRequired ? (
                <FieldDescription>
                  {t("forms.endpointUrlRequiredForOpenAICompatible")}
                </FieldDescription>
              ) : null}
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
              <FieldDescription>{t("forms.priorityHelp")}</FieldDescription>
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
              <FieldDescription>{t("forms.weightHelp")}</FieldDescription>
            </Field>
            <PricingCurrencyField
              id="provider-setup-pricing-currency"
              value={effectivePricingCurrency}
              disabled={!workspaceId}
              onValueChange={(nextCurrency) => {
                setPricingCurrency(normalizePricingCurrency(nextCurrency))
                setSuccess(undefined)
                setError(undefined)
              }}
            />
            <Field>
              <FieldLabel htmlFor="provider-setup-prompt-cache-hit-price">
                {priceFieldLabel({
                  label: t("forms.promptCacheHitPrice"),
                  currency: effectivePricingCurrency,
                  t,
                })}
              </FieldLabel>
              <Input
                id="provider-setup-prompt-cache-hit-price"
                name="prompt-cache-hit-price"
                type="number"
                min="0"
                step="0.000001"
                value={promptCacheHitPrice}
                onChange={(event) => {
                  setPromptCacheHitPrice(event.currentTarget.value)
                  setSuccess(undefined)
                  setError(undefined)
                }}
                disabled={!workspaceId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-prompt-price">
                {priceFieldLabel({
                  label: t("forms.promptPrice"),
                  currency: effectivePricingCurrency,
                  t,
                })}
              </FieldLabel>
              <Input
                id="provider-setup-prompt-price"
                name="prompt-price"
                type="number"
                min="0"
                step="0.000001"
                value={promptPrice}
                onChange={(event) => {
                  setPromptPrice(event.currentTarget.value)
                  setSuccess(undefined)
                  setError(undefined)
                }}
                disabled={!workspaceId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-setup-completion-price">
                {priceFieldLabel({
                  label: t("forms.completionPrice"),
                  currency: effectivePricingCurrency,
                  t,
                })}
              </FieldLabel>
              <Input
                id="provider-setup-completion-price"
                name="completion-price"
                type="number"
                min="0"
                step="0.000001"
                value={completionPrice}
                onChange={(event) => {
                  setCompletionPrice(event.currentTarget.value)
                  setSuccess(undefined)
                  setError(undefined)
                }}
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
