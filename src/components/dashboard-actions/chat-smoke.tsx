"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  BotIcon,
  CheckIcon,
  ChevronUpIcon,
  ClipboardListIcon,
  CopyIcon,
  KeyRoundIcon,
  Loader2Icon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n-provider";
import { translateKnownError } from "@/lib/i18n";
import {
  parseMaybeJSON,
  type ModelDebugResult,
  type ModelDebugSummary,
} from "@/lib/model-debug";
import { cn } from "@/lib/utils";
import type { APIKey } from "@/lib/gatewayllm";
import { activeClientLocale, errorText, responseError } from "./shared";

type ChatSmokeResponse = Partial<ModelDebugResult> & {
  error?: {
    message?: string;
  };
};

type PlaygroundKeySource = "session" | "manual";
type PlaygroundEndpoint = "chat-completions" | "models";

type ChatTranscriptEntry =
  | {
      id: string;
      type: "message";
      align: "start" | "end";
      label?: string;
      content: string;
      tone?: "default" | "primary" | "danger";
      footer?: string | null;
    }
  | {
      id: string;
      type: "model-list";
      label: string;
      models: string[];
      tone?: "default" | "danger";
      helper?: string;
    };

export function ChatSmokeTestForm({
  defaultModel,
  apiKeys = [],
  modelSuggestions = [],
}: {
  defaultModel: string;
  apiKeys?: APIKey[];
  modelSuggestions?: string[];
}) {
  const { t } = useI18n();
  const outputPanelRef = useRef<HTMLDivElement>(null);
  const [apiKey, setApiKey] = useState("");
  const [selectedApiKeyID, setSelectedApiKeyID] = useState("");
  const [keySource, setKeySource] = useState<PlaygroundKeySource>(
    apiKeys.length > 0 ? "session" : "manual",
  );
  const [manualApiKey, setManualApiKey] = useState("");
  const [customProxyBaseUrl, setCustomProxyBaseUrl] = useState("");
  const [endpointType, setEndpointType] =
    useState<PlaygroundEndpoint>("chat-completions");
  const [apiKeyLoadError, setApiKeyLoadError] = useState<string>();
  const [model, setModel] = useState(defaultModel);
  const [prompt, setPrompt] = useState(() => t("forms.defaultPrompt"));
  const [temperature, setTemperature] = useState("0.2");
  const [listedModels, setListedModels] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<ChatTranscriptEntry[]>([]);
  const [lastSubmittedModel, setLastSubmittedModel] = useState("");
  const [lastRequestedAction, setLastRequestedAction] = useState<
    ModelDebugSummary["action"] | null
  >(null);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ChatSmokeResponse>();
  const [, setStreamedText] = useState("");
  const [copiedPanel, setCopiedPanel] = useState<
    "request" | "response" | "curl" | "javascript" | null
  >(null);
  const [isPending, setIsPending] = useState(false);
  const [isApiKeyPending, setIsApiKeyPending] = useState(false);
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [isListingModels, setIsListingModels] = useState(false);
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const summary = result?.summary;
  const activeApiKeys = apiKeys.filter((entry) => entry.status === "active");
  const effectiveSelectedApiKeyID = activeApiKeys.some(
    (entry) => entry.id === selectedApiKeyID,
  )
    ? selectedApiKeyID
    : (activeApiKeys[0]?.id ?? "");
  const apiKeySelectOptions = createApiKeySelectOptions(activeApiKeys);
  const availableModelSuggestions = [
    ...new Set(modelSuggestions.filter(Boolean)),
  ];
  const availableModelOptions = uniqueDebugValues([
    ...listedModels,
    ...availableModelSuggestions,
  ]);
  const availableModels = uniqueDebugValues([
    ...(result?.extracted_models ?? extractDebugModels(result?.response)),
    ...listedModels,
  ]);
  const effectiveKeySource =
    keySource === "session" && activeApiKeys.length > 0 ? keySource : "manual";
  const resolvedApiKey =
    effectiveKeySource === "manual" ? manualApiKey.trim() : apiKey.trim();
  const isBusy = isPending || isListingModels;
  const effectiveApiKeyPending =
    effectiveKeySource === "session" ? isApiKeyPending : false;
  const canUseSelectedApiKey =
    !effectiveApiKeyPending && resolvedApiKey.trim() !== "";
  const promptPresets = [
    {
      id: "connectivity",
      label: t("forms.debugPresetConnectivity"),
      prompt: t("forms.debugPresetConnectivityText"),
    },
    {
      id: "code",
      label: t("forms.debugPresetCode"),
      prompt: t("forms.debugPresetCodeText"),
    },
    {
      id: "bugfix",
      label: t("forms.debugPresetBugfix"),
      prompt: t("forms.debugPresetBugfixText"),
    },
  ];
  const requestJSON = formatDebugJSON(result?.request);
  const responseJSON = formatDebugJSON(result?.response);
  const responseHeaders = Object.entries(result?.response_headers ?? {});
  const activeAction = summary?.action ?? lastRequestedAction;
  const singleModelSelectOptions = createDebugSelectOptions([
    model,
    defaultModel,
    ...availableModelOptions,
    ...availableModels,
  ]);
  const currentEndpointPath =
    endpointType === "models" ? "/v1/models" : "/v1/chat/completions";
  const codeBaseUrl = normalizePlaygroundBaseUrl(customProxyBaseUrl);
  const curlSnippet = buildCurlSnippet({
    baseUrl: codeBaseUrl,
    endpointType,
    model,
    prompt,
    temperature,
  });
  const javascriptSnippet = buildJavaScriptSnippet({
    baseUrl: codeBaseUrl,
    endpointType,
    model,
    prompt,
    temperature,
  });
  const statusValue = summary
    ? `HTTP ${summary.backend_status}`
    : isBusy || isStreamingResponse
      ? t("actions.running")
      : t("dashboard.notSet");
  const requestedModelValue =
    summary?.requested_model ??
    (lastSubmittedModel.trim() || model.trim() || t("dashboard.notSet"));
  const responseModelValue = summary?.response_model ?? requestedModelValue;
  const latestActionValue = summary
    ? formatDebugAction(t, summary)
    : activeAction === "list-models"
      ? t("forms.listModels")
      : t("forms.runSmokeTest");
  const canSubmit =
    endpointType === "models"
      ? !isBusy && canUseSelectedApiKey
      : !isBusy &&
        canUseSelectedApiKey &&
        model.trim() !== "" &&
        prompt.trim() !== "";
  const transcriptHasContent = transcript.length > 0;
  const canClearSession =
    transcriptHasContent || Boolean(result) || Boolean(error);
  const diagnosticRows = [
    {
      label: t("forms.endpointType"),
      value: summary?.endpoint ?? currentEndpointPath,
    },
    {
      label: t("forms.model"),
      value: requestedModelValue,
    },
    {
      label: t("dashboard.responseModel"),
      value: summary?.response_model,
    },
    {
      label: t("dashboard.finishReason"),
      value: summary?.finish_reason,
    },
    {
      label: t("dashboard.executedAt"),
      value: formatTimestamp(summary?.occurred_at, t("dashboard.notSet")),
    },
    {
      label: t("dashboard.resultCount"),
      value: summary?.choice_count ?? summary?.model_count,
    },
  ];

  useEffect(() => {
    if (!copiedPanel) {
      return;
    }

    const timeout = window.setTimeout(() => setCopiedPanel(null), 1600);

    return () => window.clearTimeout(timeout);
  }, [copiedPanel]);

  useEffect(() => {
    if (!outputPanelRef.current) {
      return;
    }

    outputPanelRef.current.scrollTop = outputPanelRef.current.scrollHeight;
  }, [isStreamingResponse, transcript]);

  useEffect(() => {
    if (effectiveKeySource !== "session") {
      return;
    }

    let cancelled = false;

    async function loadSelectedApiKey() {
      if (!effectiveSelectedApiKeyID) {
        if (!cancelled) {
          setApiKey("");
          setApiKeyLoadError(undefined);
          setIsApiKeyPending(false);
        }

        return;
      }

      setIsApiKeyPending(true);
      setApiKeyLoadError(undefined);

      try {
        const response = await fetch(
          `/api/control/me/api-keys/${encodeURIComponent(effectiveSelectedApiKeyID)}`,
        );

        if (!response.ok) {
          throw new Error(
            await responseError(response, t("forms.loadApiKeyFailed")),
          );
        }

        const payload = (await response.json()) as APIKey;

        if (cancelled) {
          return;
        }

        if (payload.api_key?.trim()) {
          setApiKey(payload.api_key);
          setApiKeyLoadError(undefined);
          return;
        }

        setApiKey("");
        setApiKeyLoadError(t("forms.apiKeyUnavailable"));
      } catch (loadError) {
        if (!cancelled) {
          setApiKey("");
          setApiKeyLoadError(errorText(loadError, t("forms.loadApiKeyFailed")));
        }
      } finally {
        if (!cancelled) {
          setIsApiKeyPending(false);
        }
      }
    }

    void loadSelectedApiKey();

    return () => {
      cancelled = true;
    };
  }, [effectiveKeySource, effectiveSelectedApiKeyID, t]);

  function appendTranscriptEntries(...entries: ChatTranscriptEntry[]) {
    setTranscript((current) => [...current, ...entries]);
  }

  function patchTranscriptEntry(
    entryId: string,
    patch: Partial<ChatTranscriptEntry>,
  ) {
    setTranscript((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? ({ ...entry, ...patch } as ChatTranscriptEntry)
          : entry,
      ),
    );
  }

  function clearSession() {
    setError(undefined);
    setResult(undefined);
    setStreamedText("");
    setLastSubmittedModel("");
    setLastRequestedAction(null);
    setIsStreamingResponse(false);
    setTranscript([]);
  }

  async function runChatRequest() {
    const nextModel = model.trim();
    const nextPrompt = prompt.trim();

    if (!nextModel || !nextPrompt) {
      return;
    }

    const userEntryID = createPlaygroundEntryID();
    const assistantEntryID = createPlaygroundEntryID();

    appendTranscriptEntries(
      {
        id: userEntryID,
        type: "message",
        align: "end",
        label: t("forms.prompt"),
        content: nextPrompt,
        tone: "primary",
      },
      {
        id: assistantEntryID,
        type: "message",
        align: "start",
        label: nextModel,
        content: t("actions.running"),
        tone: "default",
      },
    );

    setError(undefined);
    setResult(undefined);
    setStreamedText("");
    setLastSubmittedModel(nextModel);
    setLastRequestedAction("chat-completion");
    setIsPending(true);
    setIsStreamingResponse(false);

    try {
      const response = await fetch("/api/gateway/chat-completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: resolvedApiKey,
          model: nextModel,
          prompt: nextPrompt,
          temperature,
          stream: true,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream") && response.body) {
        setIsStreamingResponse(true);
        let streamedOutput = "";

        const payload = await readChatSmokeStream(response, {
          onText: (chunk) => {
            streamedOutput = `${streamedOutput}${chunk}`;
            setStreamedText(streamedOutput);
            patchTranscriptEntry(assistantEntryID, {
              content: streamedOutput || t("actions.running"),
            });
          },
        });

        setResult(payload);
        const finalText =
          streamedOutput ||
          payload.extracted_text ||
          extractDebugText(payload.response) ||
          t("forms.debugNoTextResponse");

        setStreamedText(finalText);
        patchTranscriptEntry(assistantEntryID, {
          label: payload.summary?.response_model ?? nextModel,
          content: finalText,
          tone: payload.summary && !payload.summary.ok ? "danger" : "default",
          footer: formatTokenUsageNote(t, payload.usage),
        });
      } else {
        const payload = (await response
          .json()
          .catch(() => ({}))) as ChatSmokeResponse;

        setResult(payload);
        const responseText =
          payload.extracted_text ?? extractDebugText(payload.response);
        const errorMessage = chatSmokeError(
          payload,
          t("forms.chatSmokeFailed"),
        );
        const finalText = response.ok
          ? (responseText ?? t("forms.debugNoTextResponse"))
          : errorMessage;

        setStreamedText(responseText ?? "");
        patchTranscriptEntry(assistantEntryID, {
          label: payload.summary?.response_model ?? nextModel,
          content: finalText,
          tone: response.ok ? "default" : "danger",
          footer: response.ok
            ? formatTokenUsageNote(t, payload.usage)
            : undefined,
        });

        if (!response.ok) {
          throw new Error(errorMessage);
        }
      }
    } catch (submitError) {
      const message = errorText(submitError, t("forms.chatSmokeFailed"));
      setError(message);
      patchTranscriptEntry(assistantEntryID, {
        content: message,
        tone: "danger",
        footer: null,
      });
    } finally {
      setIsStreamingResponse(false);
      setIsPending(false);
    }
  }

  async function runModelListRequest() {
    const actionEntryID = createPlaygroundEntryID();
    const resultEntryID = createPlaygroundEntryID();

    appendTranscriptEntries(
      {
        id: actionEntryID,
        type: "message",
        align: "end",
        label: t("forms.endpointType"),
        content: "/v1/models",
        tone: "primary",
      },
      {
        id: resultEntryID,
        type: "model-list",
        label: t("forms.listModels"),
        models: [],
        helper: t("actions.loading"),
        tone: "default",
      },
    );

    setError(undefined);
    setResult(undefined);
    setStreamedText("");
    setIsStreamingResponse(false);
    setLastRequestedAction("list-models");
    setIsListingModels(true);

    try {
      const response = await fetch("/api/gateway/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: resolvedApiKey,
        }),
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as ChatSmokeResponse;

      const nextModels = uniqueDebugValues(
        payload.extracted_models ?? extractDebugModels(payload.response),
      );

      setListedModels(nextModels);
      setResult(payload);
      patchTranscriptEntry(resultEntryID, {
        models: nextModels,
        helper:
          nextModels.length > 0
            ? t("forms.selectModelHelp")
            : t("forms.debugNoModels"),
        tone: response.ok ? "default" : "danger",
      });

      if (!response.ok) {
        throw new Error(chatSmokeError(payload, t("forms.listModelsFailed")));
      }
    } catch (submitError) {
      const message = errorText(submitError, t("forms.listModelsFailed"));
      setError(message);
      patchTranscriptEntry(resultEntryID, {
        models: [],
        helper: message,
        tone: "danger",
      });
    } finally {
      setIsListingModels(false);
    }
  }

  async function copyPanelValue(
    panel: "request" | "response" | "curl" | "javascript",
    value: string | undefined,
  ) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedPanel(panel);
    } catch {
      setCopiedPanel(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (endpointType === "models") {
      await runModelListRequest();
      return;
    }

    await runChatRequest();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (endpointType === "models" || event.shiftKey || event.key !== "Enter") {
      return;
    }

    if (!canSubmit) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Card
          size="sm"
          className="min-h-0 border-border/60 bg-card/95 xl:h-full"
        >
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-base">
              <SettingsIcon className="size-4 text-muted-foreground" />
              {t("forms.playgroundConfigurations")}
            </CardTitle>
            <CardDescription>
              {summary?.endpoint ?? currentEndpointPath}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto py-1">
            <PlaygroundConfigSection
              icon={<KeyRoundIcon className="size-4" />}
              title={t("forms.playgroundAccessSection")}
              description={
                effectiveKeySource === "manual"
                  ? t("forms.manualApiKeyHelp")
                  : t("forms.gatewayApiKeyHelp")
              }
            >
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel id="playground-key-source-label">
                    {t("forms.keySource")}
                  </FieldLabel>
                  <Select
                    items={[
                      {
                        label: t("forms.keySourceSession"),
                        value: "session",
                      },
                      {
                        label: t("forms.keySourceManual"),
                        value: "manual",
                      },
                    ]}
                    value={effectiveKeySource}
                    onValueChange={(value) =>
                      setKeySource((value ?? "session") as PlaygroundKeySource)
                    }
                  >
                    <SelectTrigger
                      id="playground-key-source"
                      aria-labelledby="playground-key-source-label"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        <SelectItem value="session">
                          {t("forms.keySourceSession")}
                        </SelectItem>
                        <SelectItem value="manual">
                          {t("forms.keySourceManual")}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                {effectiveKeySource === "session" ? (
                  <Field>
                    <FieldLabel id="gateway-api-key-label">
                      {t("forms.gatewayApiKey")}
                    </FieldLabel>
                    <Select
                      items={apiKeySelectOptions}
                      value={effectiveSelectedApiKeyID || null}
                      disabled={apiKeySelectOptions.length === 0}
                      onValueChange={(value) =>
                        setSelectedApiKeyID(String(value ?? ""))
                      }
                    >
                      <SelectTrigger
                        id="gateway-api-key"
                        aria-labelledby="gateway-api-key-label"
                        className="w-full"
                      >
                        <SelectValue
                          placeholder={
                            apiKeySelectOptions.length > 0
                              ? t("forms.gatewayApiKey")
                              : t("dashboard.noApiKeys")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {apiKeySelectOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {t("forms.gatewayApiKeyHelp")}
                    </FieldDescription>
                    <FieldError>{apiKeyLoadError}</FieldError>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel htmlFor="manual-api-key">
                      {t("forms.manualApiKey")}
                    </FieldLabel>
                    <Input
                      id="manual-api-key"
                      type="password"
                      value={manualApiKey}
                      placeholder="vk-..."
                      onChange={(event) =>
                        setManualApiKey(event.currentTarget.value)
                      }
                    />
                    <FieldDescription>
                      {t("forms.manualApiKeyHelp")}
                    </FieldDescription>
                  </Field>
                )}
              </FieldGroup>
            </PlaygroundConfigSection>

            <PlaygroundConfigSection
              icon={<SettingsIcon className="size-4" />}
              title={t("forms.playgroundRoutingSection")}
              description={summary?.endpoint ?? currentEndpointPath}
            >
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="custom-proxy-base-url">
                    {t("forms.customProxyBaseUrl")}
                  </FieldLabel>
                  <Input
                    id="custom-proxy-base-url"
                    type="url"
                    value={customProxyBaseUrl}
                    placeholder="https://your-proxy.example.com"
                    onChange={(event) =>
                      setCustomProxyBaseUrl(event.currentTarget.value)
                    }
                  />
                  <FieldDescription>
                    {t("forms.customProxyBaseUrlHelp")}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel id="playground-endpoint-type-label">
                    {t("forms.endpointType")}
                  </FieldLabel>
                  <Select
                    items={[
                      {
                        label: "/v1/chat/completions",
                        value: "chat-completions",
                      },
                      { label: "/v1/models", value: "models" },
                    ]}
                    value={endpointType}
                    onValueChange={(value) =>
                      setEndpointType(
                        (value ?? "chat-completions") as PlaygroundEndpoint,
                      )
                    }
                  >
                    <SelectTrigger
                      id="playground-endpoint-type"
                      aria-labelledby="playground-endpoint-type-label"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        <SelectItem value="chat-completions">
                          /v1/chat/completions
                        </SelectItem>
                        <SelectItem value="models">/v1/models</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </PlaygroundConfigSection>

            <PlaygroundConfigSection
              icon={<BotIcon className="size-4" />}
              title={t("forms.playgroundInferenceSection")}
              description={
                endpointType === "models"
                  ? t("forms.selectModelDisabledHelp")
                  : t("forms.selectModelHelp")
              }
            >
              <FieldGroup className="gap-4">
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel id="chat-model-label">
                      {t("forms.selectModel")}
                    </FieldLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={isBusy || !canUseSelectedApiKey}
                      onClick={() => {
                        setEndpointType("models");
                        void runModelListRequest();
                      }}
                    >
                      {isListingModels ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <ClipboardListIcon />
                      )}
                      {t("forms.listModels")}
                    </Button>
                  </div>
                  <Select
                    items={singleModelSelectOptions}
                    value={model.trim() || null}
                    disabled={endpointType === "models"}
                    onValueChange={(value) => setModel(String(value ?? ""))}
                  >
                    <SelectTrigger
                      id="chat-model"
                      aria-labelledby="chat-model-label"
                      className="w-full"
                    >
                      <SelectValue placeholder={defaultModel} />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {singleModelSelectOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {endpointType === "models"
                      ? t("forms.selectModelDisabledHelp")
                      : t("forms.selectModelHelp")}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="temperature">
                    {t("forms.temperature")}
                  </FieldLabel>
                  <Input
                    id="temperature"
                    name="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={temperature}
                    disabled={endpointType === "models"}
                    onChange={(event) =>
                      setTemperature(event.currentTarget.value)
                    }
                  />
                </Field>
              </FieldGroup>
            </PlaygroundConfigSection>

            <div className="rounded-lg border border-dashed bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BotIcon className="size-4 text-muted-foreground" />
                {t("forms.debugSuggestedModels")}
              </div>
              <div className="mt-3 text-2xl font-semibold">
                {availableModelOptions.length.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {t("forms.selectModelHelp")}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0 flex-1 border-border/60 bg-card/95 xl:h-full">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle>{t("forms.playgroundTitle")}</CardTitle>
            <CardDescription>
              {t("forms.playgroundEmptyDescription")}
            </CardDescription>
            <CardAction className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!canClearSession}
                onClick={clearSession}
              >
                <Trash2Icon data-icon="inline-start" />
                {t("forms.clearChat")}
              </Button>

              <Dialog
                open={isCodeDialogOpen}
                onOpenChange={setIsCodeDialogOpen}
              >
                <DialogTrigger
                  render={<Button type="button" variant="outline" />}
                >
                  <ClipboardListIcon data-icon="inline-start" />
                  {t("forms.getCode")}
                </DialogTrigger>
                <DialogContent className="sm:max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>{t("forms.generatedCode")}</DialogTitle>
                    <DialogDescription>
                      {t("forms.generatedCodeDescription")}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      <ModelDebugMetric
                        label={t("forms.endpointType")}
                        value={summary?.endpoint ?? currentEndpointPath}
                      />
                      <ModelDebugMetric
                        label={t("nav.status")}
                        value={statusValue}
                        tone={
                          summary
                            ? summary.ok
                              ? "success"
                              : "danger"
                            : "default"
                        }
                      />
                      <ModelDebugMetric
                        label={t("dashboard.latency")}
                        value={formatLatency(
                          summary?.latency_ms,
                          t("dashboard.notSet"),
                        )}
                      />
                      <ModelDebugMetric
                        label={t("dashboard.responseModel")}
                        value={responseModelValue}
                        valueClassName="break-all"
                      />
                      <ModelDebugMetric
                        label={t("forms.debugLatestAction")}
                        value={latestActionValue}
                        valueClassName="break-all"
                      />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <GeneratedSnippetCard
                        title={t("forms.generatedCurl")}
                        value={curlSnippet}
                        copied={copiedPanel === "curl"}
                        onCopy={() => copyPanelValue("curl", curlSnippet)}
                        copyLabel={t("actions.copy")}
                        copiedLabel={t("actions.copied")}
                      />
                      <GeneratedSnippetCard
                        title={t("forms.generatedJavascript")}
                        value={javascriptSnippet}
                        copied={copiedPanel === "javascript"}
                        onCopy={() =>
                          copyPanelValue("javascript", javascriptSnippet)
                        }
                        copyLabel={t("actions.copy")}
                        copiedLabel={t("actions.copied")}
                      />
                    </div>

                    <ModelDebugKeyValueTable
                      rows={diagnosticRows}
                      fallback={t("dashboard.notSet")}
                    />

                    {responseHeaders.length > 0 ? (
                      <div className="grid gap-2">
                        <div className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {t("dashboard.responseHeaders")}
                        </div>
                        <ModelDebugHeadersTable headers={responseHeaders} />
                      </div>
                    ) : null}

                    <ModelDebugJsonColumns
                      requestTitle={t("forms.debugRequestPayload")}
                      requestValue={requestJSON}
                      requestCopied={copiedPanel === "request"}
                      onRequestCopy={() =>
                        copyPanelValue("request", requestJSON)
                      }
                      responseTitle={t("forms.debugResponsePayload")}
                      responseValue={responseJSON}
                      responseCopied={copiedPanel === "response"}
                      onResponseCopy={() =>
                        copyPanelValue("response", responseJSON)
                      }
                      emptyMessage={t("forms.debugEmptyState")}
                      copyLabel={t("actions.copy")}
                      copiedLabel={t("actions.copied")}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </CardAction>
            <div className="col-span-full flex flex-wrap gap-2 pt-2">
              <PlaygroundHeaderBadge>
                {summary?.endpoint ?? currentEndpointPath}
              </PlaygroundHeaderBadge>
              <PlaygroundHeaderBadge>
                {effectiveKeySource === "manual"
                  ? t("forms.keySourceManual")
                  : t("forms.keySourceSession")}
              </PlaygroundHeaderBadge>
              {summary ? (
                <PlaygroundHeaderBadge tone={summary.ok ? "success" : "danger"}>
                  {statusValue}
                </PlaygroundHeaderBadge>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-0 px-0">
            <div
              ref={outputPanelRef}
              className="min-h-[22rem] flex-1 overflow-auto bg-muted/15 px-4 py-5 sm:px-6"
            >
              {transcriptHasContent ? (
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                  {transcript.map((entry) =>
                    entry.type === "model-list" ? (
                      <ModelDebugChatBubble
                        key={entry.id}
                        align="start"
                        label={entry.label}
                        tone={entry.tone}
                      >
                        {entry.models.length > 0 ? (
                          <div className="grid gap-3">
                            <div className="text-xs font-medium text-muted-foreground">
                              {entry.models.length} {t("forms.listModels")}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {entry.models.map((availableModel) => (
                                <button
                                  key={availableModel}
                                  type="button"
                                  className={cn(
                                    "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                                    availableModel === model
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background hover:bg-muted",
                                  )}
                                  onClick={() => {
                                    setModel(availableModel);
                                    setEndpointType("chat-completions");
                                  }}
                                >
                                  <span className="break-all">
                                    {availableModel}
                                  </span>
                                </button>
                              ))}
                            </div>
                            {entry.helper ? (
                              <div className="text-xs text-muted-foreground">
                                {entry.helper}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          (entry.helper ?? t("forms.debugNoModels"))
                        )}
                      </ModelDebugChatBubble>
                    ) : (
                      <ModelDebugChatBubble
                        key={entry.id}
                        align={entry.align}
                        label={entry.label}
                        tone={entry.tone}
                        footer={entry.footer}
                      >
                        {entry.content}
                      </ModelDebugChatBubble>
                    ),
                  )}
                </div>
              ) : (
                <Empty className="min-h-[20rem] border-none bg-transparent">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BotIcon />
                    </EmptyMedia>
                    <EmptyTitle>{t("forms.playgroundEmptyTitle")}</EmptyTitle>
                    <EmptyDescription className="max-w-md">
                      {t("forms.playgroundEmptyDescription")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>

            <div className="border-t bg-background/95 px-4 py-4 sm:px-6">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
                {summary ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <ModelDebugMetric
                      label={t("nav.status")}
                      value={statusValue}
                      tone={summary.ok ? "success" : "danger"}
                    />
                    <ModelDebugMetric
                      label={t("dashboard.latency")}
                      value={formatLatency(
                        summary.latency_ms,
                        t("dashboard.notSet"),
                      )}
                    />
                    <ModelDebugMetric
                      label={t("dashboard.responseModel")}
                      value={responseModelValue}
                      valueClassName="break-all"
                    />
                    <ModelDebugMetric
                      label={t("forms.debugLatestAction")}
                      value={latestActionValue}
                      valueClassName="break-all"
                    />
                  </div>
                ) : null}

                {endpointType === "chat-completions" ? (
                  <div className="flex flex-wrap gap-2">
                    {promptPresets.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full bg-background"
                        onClick={() => {
                          setEndpointType("chat-completions");
                          setPrompt(preset.prompt);
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-xl border bg-background p-3 shadow-xs">
                  <div className="flex items-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      disabled
                    >
                      <PlusIcon />
                      <span className="sr-only">{t("actions.create")}</span>
                    </Button>
                    <Textarea
                      id="chat-prompt"
                      name="chat-prompt"
                      className="min-h-[3.75rem] resize-none border-0 bg-transparent p-0 text-sm leading-6 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                      value={prompt}
                      disabled={endpointType === "models"}
                      placeholder={
                        endpointType === "models"
                          ? t("forms.modelsPlaceholder")
                          : t("forms.messagePlaceholder")
                      }
                      onChange={(event) => setPrompt(event.currentTarget.value)}
                      onKeyDown={handleComposerKeyDown}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="size-9 shrink-0"
                      disabled={!canSubmit}
                    >
                      {isBusy ? (
                        <Loader2Icon className="animate-spin" />
                      ) : endpointType === "models" ? (
                        <ClipboardListIcon />
                      ) : (
                        <ChevronUpIcon />
                      )}
                      <span className="sr-only">
                        {endpointType === "models"
                          ? t("forms.listModels")
                          : t("forms.runSmokeTest")}
                      </span>
                    </Button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                    <span>{summary?.endpoint ?? currentEndpointPath}</span>
                    <span>{statusValue}</span>
                  </div>
                </div>

                {error ? (
                  <div className="text-sm text-destructive">{error}</div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

function PlaygroundConfigSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-muted/30 p-4">
      <div className="mb-4 space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground">
            {icon}
          </span>
          <span>{title}</span>
        </div>
        {description ? (
          <div className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PlaygroundHeaderBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-foreground/80",
        tone === "success" &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
        tone === "danger" &&
          "border-destructive/20 bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

function GeneratedSnippetCard({
  title,
  value,
  copied,
  onCopy,
  copyLabel,
  copiedLabel,
}: {
  title: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="text-sm font-medium">{title}</div>
        <Button type="button" size="xs" variant="outline" onClick={onCopy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
      <pre className="max-h-[18rem] overflow-auto px-4 py-3 font-mono text-[0.76rem] leading-6">
        {value}
      </pre>
    </div>
  );
}

function createPlaygroundEntryID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePlaygroundBaseUrl(value: string) {
  const trimmed = value.trim();

  if (trimmed === "") {
    return "https://your-proxy.example.com";
  }

  return trimmed.replace(/\/+$/, "");
}

function buildCurlSnippet({
  baseUrl,
  endpointType,
  model,
  prompt,
  temperature,
}: {
  baseUrl: string;
  endpointType: PlaygroundEndpoint;
  model: string;
  prompt: string;
  temperature: string;
}) {
  if (endpointType === "models") {
    return [
      `curl "${baseUrl}/v1/models" \\`,
      '  -H "Authorization: Bearer YOUR_VIRTUAL_KEY"',
    ].join("\n");
  }

  const payload = {
    model: model.trim() || "your-model",
    temperature: Number.isFinite(Number(temperature))
      ? Number(temperature)
      : 0.2,
    stream: true,
    messages: [
      {
        role: "user",
        content: prompt.trim() || "Hello from GatewayLLM",
      },
    ],
  };

  return [
    `curl "${baseUrl}/v1/chat/completions" \\`,
    '  -H "Authorization: Bearer YOUR_VIRTUAL_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    `  -d '${JSON.stringify(payload, null, 2).replace(/'/g, `'\"'\"'`)}'`,
  ].join("\n");
}

function buildJavaScriptSnippet({
  baseUrl,
  endpointType,
  model,
  prompt,
  temperature,
}: {
  baseUrl: string;
  endpointType: PlaygroundEndpoint;
  model: string;
  prompt: string;
  temperature: string;
}) {
  if (endpointType === "models") {
    return [
      `const response = await fetch("${baseUrl}/v1/models", {`,
      "  headers: {",
      '    Authorization: "Bearer YOUR_VIRTUAL_KEY",',
      "  },",
      "})",
      "",
      "const data = await response.json()",
      "console.log(data)",
    ].join("\n");
  }

  const payload = {
    model: model.trim() || "your-model",
    temperature: Number.isFinite(Number(temperature))
      ? Number(temperature)
      : 0.2,
    stream: true,
    messages: [
      {
        role: "user",
        content: prompt.trim() || "Hello from GatewayLLM",
      },
    ],
  };

  return [
    `const payload = ${JSON.stringify(payload, null, 2)}`,
    "",
    `const response = await fetch("${baseUrl}/v1/chat/completions", {`,
    '  method: "POST",',
    "  headers: {",
    '    Authorization: "Bearer YOUR_VIRTUAL_KEY",',
    '    "Content-Type": "application/json",',
    "  },",
    "  body: JSON.stringify(payload),",
    "})",
    "",
    "const data = await response.json()",
    "console.log(data)",
  ].join("\n");
}

function ModelDebugMetric({
  label,
  value,
  tone = "default",
  valueClassName,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-background px-3 py-2.5",
        tone === "success" && "border-emerald-500/20 bg-emerald-500/5",
        tone === "danger" && "border-destructive/20 bg-destructive/5",
      )}
    >
      <div className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-sm leading-tight font-semibold sm:text-[0.95rem]",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ModelDebugPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-background px-4 py-5 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ModelDebugChatBubble({
  align = "start",
  label,
  tone = "default",
  footer,
  children,
}: {
  align?: "start" | "end";
  label?: string;
  tone?: "default" | "primary" | "danger";
  footer?: ReactNode;
  children: ReactNode;
}) {
  const isPrimary = tone === "primary";
  const isDanger = tone === "danger";

  return (
    <div
      className={cn(
        "flex w-full",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "w-full max-w-3xl rounded-xl border px-4 py-3 shadow-xs",
          isPrimary && "border-primary bg-primary text-primary-foreground",
          !isPrimary && !isDanger && "border-border bg-background",
          isDanger && "border-destructive/20 bg-destructive/5",
        )}
      >
        {label ? (
          <div
            className={cn(
              "mb-2 text-[0.72rem] font-medium text-muted-foreground",
              isPrimary && "text-primary-foreground/70",
              !isPrimary && !isDanger && "text-muted-foreground",
              isDanger && "text-destructive/80",
            )}
          >
            {label}
          </div>
        ) : null}
        <div
          className={cn(
            "whitespace-pre-wrap break-words text-sm leading-6",
            isPrimary && "text-primary-foreground",
            !isPrimary && !isDanger && "text-foreground",
            isDanger && "text-destructive",
          )}
        >
          {children}
        </div>
        {footer ? (
          <div
            className={cn(
              "mt-2 text-[0.72rem]",
              isPrimary
                ? "text-primary-foreground/75"
                : "text-muted-foreground",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ModelDebugKeyValueTable({
  rows,
  fallback,
  className,
}: {
  rows: Array<{
    label: string;
    value?: string | number | null;
  }>;
  fallback: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-background",
        className,
      )}
    >
      <Table>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label} className="hover:bg-transparent">
              <th
                scope="row"
                className="w-32 px-3 py-2 text-left text-[0.72rem] font-medium whitespace-normal uppercase tracking-[0.14em] text-muted-foreground"
              >
                {row.label}
              </th>
              <TableCell className="px-3 py-2 font-medium whitespace-normal break-all">
                {stringOrFallback(row.value, fallback)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ModelDebugHeadersTable({
  headers,
}: {
  headers: Array<[string, string]>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <Table>
        <TableBody>
          {headers.map(([key, value]) => (
            <TableRow key={key} className="hover:bg-transparent">
              <th
                scope="row"
                className="w-36 px-3 py-2 text-left font-mono text-[0.72rem] font-medium whitespace-normal text-muted-foreground"
              >
                {key}
              </th>
              <TableCell className="px-3 py-2 font-mono text-[0.78rem] whitespace-normal break-all">
                {value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ModelDebugJsonColumns({
  requestTitle,
  requestValue,
  requestCopied,
  onRequestCopy,
  responseTitle,
  responseValue,
  responseCopied,
  onResponseCopy,
  emptyMessage,
  copyLabel,
  copiedLabel,
}: {
  requestTitle: string;
  requestValue?: string;
  requestCopied: boolean;
  onRequestCopy: () => void;
  responseTitle: string;
  responseValue?: string;
  responseCopied: boolean;
  onResponseCopy: () => void;
  emptyMessage: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="grid divide-y xl:grid-cols-2 xl:divide-x xl:divide-y-0">
        <ModelDebugJsonColumn
          title={requestTitle}
          value={requestValue}
          copied={requestCopied}
          onCopy={onRequestCopy}
          emptyMessage={emptyMessage}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
        />
        <ModelDebugJsonColumn
          title={responseTitle}
          value={responseValue}
          copied={responseCopied}
          onCopy={onResponseCopy}
          emptyMessage={emptyMessage}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
        />
      </div>
    </div>
  );
}

function ModelDebugJsonColumn({
  title,
  value,
  copied,
  onCopy,
  emptyMessage,
  copyLabel,
  copiedLabel,
}: {
  title: string;
  value?: string;
  copied: boolean;
  onCopy: () => void;
  emptyMessage: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="text-sm font-medium">{title}</div>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={!value}
          onClick={onCopy}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
      {value ? (
        <pre className="max-h-[24rem] overflow-auto px-4 py-3 font-mono text-[0.76rem] leading-6">
          {value}
        </pre>
      ) : (
        <div className="px-4 py-6">
          <ModelDebugPlaceholder>{emptyMessage}</ModelDebugPlaceholder>
        </div>
      )}
    </div>
  );
}

async function readChatSmokeStream(
  response: Response,
  {
    onText,
  }: {
    onText: (chunk: string) => void;
  },
) {
  const reader = response.body?.getReader();

  if (!reader) {
    return {} as ChatSmokeResponse;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let summary: ChatSmokeResponse | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = consumeClientSSEBuffer(buffer, ({ event, data }) => {
        if (!data || data === "[DONE]") {
          return;
        }

        if (event === "gateway-summary") {
          summary = (parseMaybeJSON(data) ?? {}) as ChatSmokeResponse;
          return;
        }

        const text = extractStreamChunkText(parseMaybeJSON(data));

        if (text) {
          onText(text);
        }
      });
    }

    buffer += decoder.decode();
    buffer = consumeClientSSEBuffer(buffer, ({ event, data }) => {
      if (!data || data === "[DONE]") {
        return;
      }

      if (event === "gateway-summary") {
        summary = (parseMaybeJSON(data) ?? {}) as ChatSmokeResponse;
        return;
      }

      const text = extractStreamChunkText(parseMaybeJSON(data));

      if (text) {
        onText(text);
      }
    });

    if (buffer.trim() !== "") {
      const finalEvent = parseClientSSEEvent(buffer);

      if (finalEvent?.data && finalEvent.data !== "[DONE]") {
        if (finalEvent.event === "gateway-summary") {
          summary = (parseMaybeJSON(finalEvent.data) ??
            {}) as ChatSmokeResponse;
        } else {
          const text = extractStreamChunkText(parseMaybeJSON(finalEvent.data));

          if (text) {
            onText(text);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return summary ?? ({} as ChatSmokeResponse);
}

function consumeClientSSEBuffer(
  buffer: string,
  onEvent: (event: { event: string; data: string }) => void,
) {
  let remaining = buffer;

  while (true) {
    const match = remaining.match(/\r?\n\r?\n/);

    if (!match || match.index === undefined) {
      break;
    }

    const block = remaining.slice(0, match.index);
    remaining = remaining.slice(match.index + match[0].length);
    const event = parseClientSSEEvent(block);

    if (event) {
      onEvent(event);
    }
  }

  return remaining;
}

function parseClientSSEEvent(block: string) {
  if (block.trim() === "") {
    return null;
  }

  let eventName = "message";
  const data = block
    .split(/\r?\n/)
    .map((line) => {
      if (line.startsWith("event:")) {
        eventName = line.replace(/^event:\s?/, "");
      }

      if (!line.startsWith("data:")) {
        return null;
      }

      return line.replace(/^data:\s?/, "");
    })
    .filter((line): line is string => line !== null)
    .join("\n");

  return {
    event: eventName,
    data,
  };
}

function extractStreamChunkText(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const response = value as Record<string, unknown>;
  const choices = Array.isArray(response.choices) ? response.choices : [];

  return choices
    .map((choice) => {
      if (!choice || typeof choice !== "object") {
        return null;
      }

      const record = choice as Record<string, unknown>;

      return (
        extractDebugText({
          choices: [record],
        }) ??
        extractDebugText({
          choices: [
            {
              message: {
                content:
                  typeof record.text === "string"
                    ? record.text
                    : extractNestedText(record.delta),
              },
            },
          ],
        })
      );
    })
    .filter((chunk): chunk is string => Boolean(chunk))
    .join("");
}

function extractNestedText(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractNestedText(item))
      .filter((item): item is string => Boolean(item));

    return parts.length > 0 ? parts.join("") : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.content === "string") {
    return record.content;
  }

  if (typeof record.text === "string") {
    return record.text;
  }

  if (typeof record.value === "string") {
    return record.value;
  }

  return extractNestedText(record.content ?? record.text);
}

function formatDebugAction(
  t: ReturnType<typeof useI18n>["t"],
  summary: ModelDebugSummary,
) {
  return summary.action === "list-models"
    ? t("forms.listModels")
    : t("forms.runSmokeTest");
}

function formatLatency(value: number | undefined, fallback: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return `${value.toLocaleString()} ms`;
}

function formatTimestamp(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleString();
}

function formatDebugJSON(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.stringify(value, null, 2);
}

function formatTokenUsageNote(
  t: ReturnType<typeof useI18n>["t"],
  usage?: ChatSmokeResponse["usage"],
) {
  if (!usage) {
    return null;
  }

  const segments = [
    [t("dashboard.promptTokens"), usage.prompt_tokens],
    [t("dashboard.completionTokens"), usage.completion_tokens],
    [t("dashboard.totalTokens"), usage.total_tokens],
  ]
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .map(([label, value]) => `${label}: ${Number(value).toLocaleString()}`);

  return segments.length > 0 ? segments.join(" · ") : null;
}

function stringOrFallback(
  value?: string | number | null,
  fallback = "-",
): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString();
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  return fallback;
}

function extractDebugText(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object") {
    return null;
  }

  const response = value as Record<string, unknown>;
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const firstChoice = choices[0];

  if (firstChoice && typeof firstChoice === "object") {
    const choice = firstChoice as Record<string, unknown>;
    const message =
      choice.message && typeof choice.message === "object"
        ? (choice.message as Record<string, unknown>)
        : null;

    if (typeof message?.content === "string") {
      return message.content;
    }
  }

  return null;
}

function extractDebugModels(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const response = value as Record<string, unknown>;
  const items = Array.isArray(response.data) ? response.data : [];

  return [
    ...new Set(
      items
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const record = item as Record<string, unknown>;

          if (typeof record.id === "string" && record.id.trim() !== "") {
            return record.id;
          }

          if (typeof record.model === "string" && record.model.trim() !== "") {
            return record.model;
          }

          return null;
        })
        .filter((item): item is string => Boolean(item)),
    ),
  ];
}

function uniqueDebugValues(values: Array<string | null | undefined>) {
  return [
    ...new Set(values.map((value) => value?.trim()).filter(Boolean)),
  ] as string[];
}

function createDebugSelectOptions(values: Array<string | null | undefined>) {
  return uniqueDebugValues(values).map((value) => ({
    label: value,
    value,
  }));
}

function createApiKeySelectOptions(apiKeys: APIKey[]) {
  return apiKeys.map((apiKey) => {
    const displayName = apiKey.display_name?.trim();
    const preview = formatDebugApiKeyID(apiKey.id);

    return {
      label: displayName ? `${displayName} · ${preview}` : preview,
      value: apiKey.id,
    };
  });
}

function formatDebugApiKeyID(value: string) {
  const normalized = value.trim();

  if (normalized.length <= 18) {
    return normalized;
  }

  return `${normalized.slice(0, 8)}...${normalized.slice(-8)}`;
}

function chatSmokeError(payload: ChatSmokeResponse, fallback: string) {
  if (payload.error?.message) {
    return translateKnownError(
      activeClientLocale(),
      payload.error.message,
      fallback,
    );
  }

  const response = payload.response;

  if (
    response &&
    typeof response === "object" &&
    "error" in response &&
    response.error &&
    typeof response.error === "object" &&
    "message" in response.error &&
    typeof response.error.message === "string"
  ) {
    return translateKnownError(
      activeClientLocale(),
      response.error.message,
      fallback,
    );
  }

  return fallback;
}
