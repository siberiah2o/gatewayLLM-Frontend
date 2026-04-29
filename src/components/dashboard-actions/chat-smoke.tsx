"use client";

import {
  type ComponentProps,
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
  ChevronRightIcon,
  ClipboardListIcon,
  CopyIcon,
  KeyRoundIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  PlusIcon,
  SendHorizontalIcon,
  SettingsIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
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
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
type PlaygroundThinkingMode = "enabled" | "disabled";
type PlaygroundReasoningEffort = "low" | "medium" | "high" | "xhigh";

type ChatTranscriptEntry =
  | {
      id: string;
      type: "message";
      align: "start" | "end";
      label?: string;
      content: string;
      reasoning?: string | null;
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
  gatewayBaseUrl,
  apiKeys = [],
  modelSuggestions = [],
}: {
  defaultModel: string;
  gatewayBaseUrl: string;
  apiKeys?: APIKey[];
  modelSuggestions?: string[];
}) {
  const { t } = useI18n();
  const initialModel = preferPlaygroundModel(defaultModel, modelSuggestions);
  const outputPanelRef = useRef<HTMLDivElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [apiKey, setApiKey] = useState("");
  const [selectedApiKeyID, setSelectedApiKeyID] = useState("");
  const [keySource, setKeySource] = useState<PlaygroundKeySource>(
    apiKeys.length > 0 ? "session" : "manual",
  );
  const [manualApiKey, setManualApiKey] = useState("");
  const [endpointType, setEndpointType] =
    useState<PlaygroundEndpoint>("chat-completions");
  const [apiKeyLoadError, setApiKeyLoadError] = useState<string>();
  const [model, setModel] = useState(initialModel);
  const [prompt, setPrompt] = useState(() => t("forms.defaultPrompt"));
  const [temperature, setTemperature] = useState("0.2");
  const [thinkingMode, setThinkingMode] =
    useState<PlaygroundThinkingMode>("enabled");
  const [reasoningEffort, setReasoningEffort] =
    useState<PlaygroundReasoningEffort>("medium");
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
  const availableModelSuggestions = sanitizePlaygroundModels(modelSuggestions);
  const availableModelOptions = sanitizePlaygroundModels([
    ...listedModels,
    ...availableModelSuggestions,
  ]);
  const availableModels = sanitizePlaygroundModels([
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
  const thinkingModeOptions = [
    {
      label: t("forms.thinkingEnabled"),
      value: "enabled",
    },
    {
      label: t("forms.thinkingDisabled"),
      value: "disabled",
    },
  ] satisfies Array<{ label: string; value: PlaygroundThinkingMode }>;
  const reasoningEffortOptions = [
    {
      label: t("forms.reasoningLow"),
      value: "low",
    },
    {
      label: t("forms.reasoningMedium"),
      value: "medium",
    },
    {
      label: t("forms.reasoningHigh"),
      value: "high",
    },
    {
      label: t("forms.reasoningXHigh"),
      value: "xhigh",
    },
  ] satisfies Array<{ label: string; value: PlaygroundReasoningEffort }>;
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
  const effectiveModel = preferPlaygroundModel(model, [
    defaultModel,
    ...availableModelOptions,
    ...availableModels,
  ]);
  const currentEndpointPath =
    endpointType === "models" ? "/v1/models" : "/v1/chat/completions";
  const codeBaseUrl = normalizePlaygroundBaseUrl(gatewayBaseUrl);
  const curlSnippet = buildCurlSnippet({
    baseUrl: codeBaseUrl,
    endpointType,
    model: effectiveModel,
    prompt,
    temperature,
    thinkingMode,
    reasoningEffort,
  });
  const javascriptSnippet = buildJavaScriptSnippet({
    baseUrl: codeBaseUrl,
    endpointType,
    model: effectiveModel,
    prompt,
    temperature,
    thinkingMode,
    reasoningEffort,
  });
  const statusValue = summary
    ? `HTTP ${summary.backend_status}`
    : isBusy || isStreamingResponse
      ? t("actions.running")
      : t("dashboard.notSet");
  const selectedModelValue =
    effectiveModel || defaultModel || t("dashboard.notSet");
  const requestedModelValue =
    summary?.requested_model ??
    (lastSubmittedModel.trim() || selectedModelValue);
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
  const isPromptComposerExpanded =
    endpointType === "models" || prompt.length > 100 || prompt.includes("\n");
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
    const textarea = promptTextareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [endpointType, prompt]);

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
    const nextModel = effectiveModel.trim();
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
          thinking_mode: thinkingMode,
          reasoning_effort: reasoningEffort,
          stream: true,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream") && response.body) {
        setIsStreamingResponse(true);
        let streamedOutput = "";
        let streamedReasoning = "";

        const payload = await readChatSmokeStream(response, {
          onText: (chunk) => {
            streamedOutput = `${streamedOutput}${chunk}`;
            const preview = splitEmbeddedReasoning(streamedOutput);
            const displayText = preview.content || streamedOutput;
            const reasoning = mergeReasoningText(
              streamedReasoning,
              preview.reasoning,
            );

            setStreamedText(displayText);
            patchTranscriptEntry(assistantEntryID, {
              content: displayText || t("actions.running"),
              reasoning,
            });
          },
          onReasoning: (chunk) => {
            streamedReasoning = `${streamedReasoning}${chunk}`;
            patchTranscriptEntry(assistantEntryID, {
              reasoning: streamedReasoning,
            });
          },
        });

        setResult(payload);
        const rawFinalText =
          streamedOutput ||
          payload.extracted_text ||
          extractDebugText(payload.response) ||
          t("forms.debugNoTextResponse");
        const finalParts = splitEmbeddedReasoning(rawFinalText);
        const finalText = finalParts.content || t("forms.debugNoTextResponse");
        const finalReasoning = mergeReasoningText(
          streamedReasoning,
          extractDebugReasoning(payload.response),
          finalParts.reasoning,
        );

        setStreamedText(finalText);
        patchTranscriptEntry(assistantEntryID, {
          label: payload.summary?.response_model ?? nextModel,
          content: finalText,
          reasoning: finalReasoning,
          tone: payload.summary && !payload.summary.ok ? "danger" : "default",
          footer: formatTokenUsageNote(t, payload.usage),
        });
      } else {
        const payload = (await response
          .json()
          .catch(() => ({}))) as ChatSmokeResponse;

        setResult(payload);
        const rawResponseText =
          payload.extracted_text ?? extractDebugText(payload.response);
        const responseParts = splitEmbeddedReasoning(rawResponseText ?? "");
        const responseText = responseParts.content || rawResponseText;
        const reasoning = mergeReasoningText(
          extractDebugReasoning(payload.response),
          responseParts.reasoning,
        );
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
          reasoning: response.ok ? reasoning : null,
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

      const nextModels = sanitizePlaygroundModels(
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

  function renderComposerActionMenu() {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-accent"
              aria-label={t("forms.playgroundConfigurations")}
            />
          }
        >
          <PlusIcon className="size-5 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64 rounded-md p-1.5">
          <DropdownMenuGroup className="space-y-1">
            {promptPresets.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                className="rounded-md"
                onClick={() => {
                  setEndpointType("chat-completions");
                  setPrompt(preset.prompt);
                }}
              >
                <MessageSquareTextIcon className="opacity-60" />
                {preset.label}
              </DropdownMenuItem>
            ))}

            <DropdownMenuItem
              className="rounded-md"
              disabled={isBusy || !canUseSelectedApiKey}
              onClick={() => {
                setEndpointType("models");
                void runModelListRequest();
              }}
            >
              {isListingModels ? (
                <Loader2Icon className="animate-spin opacity-60" />
              ) : (
                <ClipboardListIcon className="opacity-60" />
              )}
              {t("forms.listModels")}
            </DropdownMenuItem>

            <DropdownMenuItem
              className="rounded-md"
              onClick={() => setIsCodeDialogOpen(true)}
            >
              <ClipboardListIcon className="opacity-60" />
              {t("forms.getCode")}
            </DropdownMenuItem>

            <DropdownMenuItem
              className="rounded-md"
              variant="destructive"
              disabled={!canClearSession}
              onClick={clearSession}
            >
              <Trash2Icon className="opacity-60" />
              {t("forms.clearChat")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <TooltipProvider delay={300}>
      <form
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden text-sm"
        onSubmit={handleSubmit}
      >
      <div className="grid h-full min-h-0 flex-1 gap-3 overflow-y-auto xl:grid-cols-[17.5rem_minmax(0,1fr)] xl:overflow-hidden">
        <Card
          size="sm"
          className="min-h-0 rounded-md border-border/70 bg-card/95 py-0 shadow-sm xl:h-full xl:overflow-hidden"
        >
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto p-2.5">
            <PlaygroundConfigSection
              icon={<KeyRoundIcon className="size-4" />}
              title={t("forms.playgroundAccessSection")}
            >
              <FieldGroup className="gap-3">
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
                  </Field>
                )}
              </FieldGroup>
            </PlaygroundConfigSection>

            <PlaygroundConfigSection
              icon={<SettingsIcon className="size-4" />}
              title={`${t("forms.playgroundRoutingSection")} / ${t("forms.playgroundInferenceSection")}`}
            >
              <FieldGroup className="gap-3">
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
                      <span
                        data-slot="select-value"
                        className="flex flex-1 items-center text-left"
                      >
                        {currentEndpointPath}
                      </span>
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
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel id="chat-model-label">
                      {t("forms.selectModel")}
                    </FieldLabel>
                    <PlaygroundIconButton
                      label={t("forms.listModels")}
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="rounded-md"
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
                    </PlaygroundIconButton>
                  </div>
                  <Select
                    items={singleModelSelectOptions}
                    value={effectiveModel || null}
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
                <Field>
                  <FieldLabel id="thinking-mode-label">
                    {t("forms.thinkingMode")}
                  </FieldLabel>
                  <Select
                    items={thinkingModeOptions}
                    value={thinkingMode}
                    disabled={endpointType === "models"}
                    onValueChange={(value) =>
                      setThinkingMode(
                        (value ?? "enabled") as PlaygroundThinkingMode,
                      )
                    }
                  >
                    <SelectTrigger
                      id="thinking-mode"
                      aria-labelledby="thinking-mode-label"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {thinkingModeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel id="reasoning-effort-label">
                    {t("forms.reasoningEffort")}
                  </FieldLabel>
                  <Select
                    items={reasoningEffortOptions}
                    value={reasoningEffort}
                    disabled={
                      endpointType === "models" || thinkingMode === "disabled"
                    }
                    onValueChange={(value) =>
                      setReasoningEffort(
                        (value ?? "medium") as PlaygroundReasoningEffort,
                      )
                    }
                  >
                    <SelectTrigger
                      id="reasoning-effort"
                      aria-labelledby="reasoning-effort-label"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {reasoningEffortOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </PlaygroundConfigSection>

          </CardContent>
        </Card>

        <Card className="min-h-0 flex-1 rounded-md border-border/70 bg-card/95 py-0 shadow-sm xl:h-full xl:overflow-hidden">
          <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
            <DialogContent className="sm:max-w-5xl">
                    <DialogHeader>
                      <DialogTitle>{t("forms.generatedCode")}</DialogTitle>
                      <DialogDescription>
                        {t("forms.generatedCodeDescription")}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3">
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                        <ModelDebugMetric
                          label={t("forms.generatedBaseUrl")}
                          value={codeBaseUrl}
                          valueClassName="break-all"
                        />
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

                      <div className="grid gap-3 xl:grid-cols-2">
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
                          <div className="text-xs font-medium uppercase text-muted-foreground">
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

          <CardContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden bg-background px-0">
            <div
              ref={outputPanelRef}
              className="min-h-0 flex-1 overflow-y-auto bg-muted/10 px-4 py-5 sm:px-6 lg:px-8"
            >
              {transcriptHasContent ? (
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-6">
                  {transcript.map((entry) =>
                    entry.type === "model-list" ? (
                      <ModelDebugChatBubble
                        key={entry.id}
                        align="start"
                        label={entry.label}
                        tone={entry.tone}
                      >
                        {entry.models.length > 0 ? (
                          <div className="grid gap-2.5">
                            <div className="text-xs leading-5 font-medium text-muted-foreground">
                              {entry.models.length} {t("forms.listModels")}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {entry.models.map((availableModel) => (
                                <button
                                  key={availableModel}
                                  type="button"
                                  className={cn(
                                    "rounded-md border px-3 py-2.5 text-left text-xs leading-5 font-medium transition-all",
                                    availableModel === effectiveModel
                                      ? "border-primary/20 bg-primary text-primary-foreground"
                                      : "border-border/70 bg-background/95 hover:border-foreground/15 hover:bg-muted/70",
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
                              <div className="text-xs leading-5 text-muted-foreground">
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
                        reasoning={entry.reasoning}
                        reasoningLabel={t("forms.reasoningTrace")}
                        tone={entry.tone}
                        footer={entry.footer}
                      >
                        {entry.content}
                      </ModelDebugChatBubble>
                    ),
                  )}
                </div>
              ) : (
                <PlaygroundEmptyStage
                  title={t("forms.playgroundEmptyTitle")}
                  endpointType={endpointType}
                  presets={promptPresets}
                  onPresetSelect={(value) => {
                    setEndpointType("chat-completions");
                    setPrompt(value);
                  }}
                />
              )}
            </div>

            <div className="shrink-0 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
                {error ? (
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm leading-6 text-destructive">
                    {error}
                  </div>
                ) : null}

                <div
                  className={cn(
                    "w-full cursor-text overflow-clip border border-border/80 bg-card bg-clip-padding p-2 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.55)] transition-[border-color,box-shadow,border-radius] duration-200 ease-out focus-within:border-ring/60 focus-within:ring-4 focus-within:ring-ring/10 dark:bg-muted/35",
                    isPromptComposerExpanded
                      ? "grid rounded-[1.75rem] [grid-template-areas:'primary'_'footer'] [grid-template-columns:1fr] [grid-template-rows:auto_auto]"
                      : "grid rounded-[1.75rem] [grid-template-areas:'leading_primary_trailing'] [grid-template-columns:auto_1fr_auto] [grid-template-rows:auto]",
                  )}
                >
                  <div
                    className={cn(
                      "flex min-h-14 items-center overflow-x-hidden px-1.5",
                      isPromptComposerExpanded ? "px-2 py-1" : "-my-2.5",
                    )}
                    style={{ gridArea: "primary" }}
                  >
                    <div className="max-h-52 flex-1 overflow-auto">
                      <Textarea
                        ref={promptTextareaRef}
                        id="chat-prompt"
                        name="chat-prompt"
                        rows={1}
                        className="min-h-0 max-h-40 resize-none overflow-auto rounded-none border-0 bg-transparent p-0 text-base leading-7 shadow-none placeholder:text-muted-foreground/70 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 disabled:bg-transparent"
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
                    </div>
                  </div>

                  <div
                    className={cn("flex items-center", {
                      hidden: isPromptComposerExpanded,
                    })}
                    style={{ gridArea: "leading" }}
                  >
                    {renderComposerActionMenu()}
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-2",
                      isPromptComposerExpanded && "mt-1 px-1.5 pt-1",
                    )}
                    style={{
                      gridArea: isPromptComposerExpanded
                        ? "footer"
                        : "trailing",
                    }}
                  >
                    {isPromptComposerExpanded ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
                        {renderComposerActionMenu()}
                        {endpointType === "chat-completions"
                          ? promptPresets.map((preset) => (
                              <Button
                                key={preset.id}
                                type="button"
                                size="xs"
                                variant="ghost"
                                className="shrink-0 rounded-full border border-border/70 bg-background/80"
                                onClick={() => {
                                  setEndpointType("chat-completions");
                                  setPrompt(preset.prompt);
                                }}
                              >
                                {preset.label}
                              </Button>
                            ))
                          : null}
                      </div>
                    ) : null}

                    <div className="ms-auto flex items-center gap-1.5">
                      <PlaygroundIconButton
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="hover:bg-accent"
                        label={t("forms.listModels")}
                        disabled={isBusy || !canUseSelectedApiKey}
                        onClick={() => {
                          setEndpointType("models");
                          void runModelListRequest();
                        }}
                      >
                        {isListingModels ? (
                          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                        ) : (
                          <ClipboardListIcon className="size-5 text-muted-foreground" />
                        )}
                      </PlaygroundIconButton>

                      <PlaygroundIconButton
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="hover:bg-accent"
                        label={t("forms.getCode")}
                        onClick={() => setIsCodeDialogOpen(true)}
                      >
                        <CopyIcon className="size-5 text-muted-foreground" />
                      </PlaygroundIconButton>

                      {canClearSession ? (
                        <PlaygroundIconButton
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="hover:bg-accent"
                          label={t("forms.clearChat")}
                          onClick={clearSession}
                        >
                          <Trash2Icon className="size-5 text-muted-foreground" />
                        </PlaygroundIconButton>
                      ) : null}

                      <Button
                        type="submit"
                        size="icon-lg"
                        className="rounded-full shadow-[0_14px_32px_-18px_rgba(15,23,42,0.55)]"
                        disabled={!canSubmit}
                        aria-label={
                          endpointType === "models"
                            ? t("forms.listModels")
                            : t("forms.runSmokeTest")
                        }
                      >
                        {isBusy ? (
                          <Loader2Icon className="size-5 animate-spin" />
                        ) : endpointType === "models" ? (
                          <ClipboardListIcon className="size-5" />
                        ) : (
                          <SendHorizontalIcon className="size-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </form>
    </TooltipProvider>
  );
}

function PlaygroundIconButton({
  label,
  children,
  className,
  ...props
}: ComponentProps<typeof Button> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className={cn("rounded-full", className)}
            aria-label={label}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
    <section className="rounded-md border border-border/70 bg-background/80 p-3">
      <div className="mb-2.5 flex gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/50 text-muted-foreground">
          {icon}
        </span>
        <div className="min-w-0 space-y-0.5">
          <div className="text-sm leading-5 font-medium text-foreground">
            {title}
          </div>
          {description ? (
            <div className="text-xs leading-5 text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function PlaygroundEmptyStage({
  title,
  endpointType,
  presets,
  onPresetSelect,
}: {
  title: string;
  endpointType: PlaygroundEndpoint;
  presets: Array<{ id: string; label: string; prompt: string }>;
  onPresetSelect: (value: string) => void;
}) {
  return (
    <Empty className="mx-auto min-h-full w-full max-w-3xl border-0 bg-transparent px-2 py-8">
      <EmptyHeader className="max-w-2xl">
        <EmptyMedia
          variant="icon"
          className="size-11 rounded-md border border-border/70 bg-background text-muted-foreground"
        >
          <MessageSquareTextIcon className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="text-balance text-xl leading-8 font-semibold text-foreground whitespace-pre-wrap">
          {title}
        </EmptyTitle>
      </EmptyHeader>

      <EmptyContent className="max-w-2xl">
        {endpointType === "chat-completions" ? (
          <div className="flex flex-wrap justify-center gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full bg-background/95"
                onClick={() => onPresetSelect(preset.prompt)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        ) : null}
      </EmptyContent>
    </Empty>
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
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="text-sm font-medium">{title}</div>
        <Button type="button" size="xs" variant="outline" onClick={onCopy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
      <pre className="max-h-[18rem] overflow-auto px-4 py-3 font-mono text-xs leading-6">
        {value}
      </pre>
    </div>
  );
}

function createPlaygroundEntryID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type MessageBlock =
  | { type: "paragraph"; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; language?: string; content: string }
  | { type: "divider" };

function parseMessageBlocks(value: string): MessageBlock[] {
  const normalized = value.replace(/\r\n?/g, "\n").trim();

  if (normalized === "") {
    return [];
  }

  const blocks: MessageBlock[] = [];
  const codeBlockPattern = /```([\w-]+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockPattern.exec(normalized)) !== null) {
    blocks.push(...parseTextBlocks(normalized.slice(lastIndex, match.index)));
    blocks.push({
      type: "code",
      language: match[1]?.trim() || undefined,
      content: match[2].trimEnd(),
    });
    lastIndex = match.index + match[0].length;
  }

  blocks.push(...parseTextBlocks(normalized.slice(lastIndex)));

  return blocks;
}

function parseTextBlocks(value: string): MessageBlock[] {
  return value
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const lines = segment
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (
        segment.replace(/[\s-]/g, "") === "" &&
        segment.includes("-") &&
        segment.length >= 3
      ) {
        return { type: "divider" } as MessageBlock;
      }

      if (lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))) {
        return {
          type: "list",
          ordered: false,
          items: lines.map((line) => line.replace(/^[-*]\s+/, "")),
        } as MessageBlock;
      }

      if (lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line))) {
        return {
          type: "list",
          ordered: true,
          items: lines.map((line) => line.replace(/^\d+\.\s+/, "")),
        } as MessageBlock;
      }

      return { type: "paragraph", content: segment } as MessageBlock;
    });
}

function normalizePlaygroundBaseUrl(value: string) {
  const trimmed = value.trim();

  if (trimmed === "") {
    return "http://127.0.0.1:8080";
  }

  return trimmed.replace(/\/+$/, "");
}

function buildCurlSnippet({
  baseUrl,
  endpointType,
  model,
  prompt,
  temperature,
  thinkingMode,
  reasoningEffort,
}: {
  baseUrl: string;
  endpointType: PlaygroundEndpoint;
  model: string;
  prompt: string;
  temperature: string;
  thinkingMode: PlaygroundThinkingMode;
  reasoningEffort: PlaygroundReasoningEffort;
}) {
  if (endpointType === "models") {
    return [
      `curl "${baseUrl}/v1/models" \\`,
      '  -H "Authorization: Bearer YOUR_VIRTUAL_KEY"',
    ].join("\n");
  }

  const payload = buildChatDebugPayload({
    model,
    prompt,
    temperature,
    thinkingMode,
    reasoningEffort,
  });

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
  thinkingMode,
  reasoningEffort,
}: {
  baseUrl: string;
  endpointType: PlaygroundEndpoint;
  model: string;
  prompt: string;
  temperature: string;
  thinkingMode: PlaygroundThinkingMode;
  reasoningEffort: PlaygroundReasoningEffort;
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

  const payload = buildChatDebugPayload({
    model,
    prompt,
    temperature,
    thinkingMode,
    reasoningEffort,
  });

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

function buildChatDebugPayload({
  model,
  prompt,
  temperature,
  thinkingMode,
  reasoningEffort,
}: {
  model: string;
  prompt: string;
  temperature: string;
  thinkingMode: PlaygroundThinkingMode;
  reasoningEffort: PlaygroundReasoningEffort;
}) {
  const normalizedModel = model.trim() || "your-model";
  const payload: Record<string, unknown> = {
    model: normalizedModel,
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

  if (usesDeepSeekThinkingExtension(normalizedModel)) {
    payload.thinking = {
      type: thinkingMode,
    };
  }

  if (thinkingMode === "enabled") {
    payload.reasoning_effort = reasoningEffort;
  }

  return payload;
}

function usesDeepSeekThinkingExtension(model: string) {
  const normalized = model.trim().toLowerCase();

  return normalized.startsWith("deepseek-") || normalized.includes("/deepseek-");
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
        "rounded-xl border border-border/70 bg-background/90 px-3.5 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.42)]",
        tone === "success" && "border-emerald-500/20 bg-emerald-500/5",
        tone === "danger" && "border-destructive/20 bg-destructive/5",
      )}
    >
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 text-sm leading-6 font-semibold",
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
    <div className="rounded-md border border-dashed bg-background px-4 py-5 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ModelDebugChatBubble({
  align = "start",
  label,
  reasoning,
  reasoningLabel = "Reasoning",
  tone = "default",
  footer,
  children,
}: {
  align?: "start" | "end";
  label?: string;
  reasoning?: string | null;
  reasoningLabel?: string;
  tone?: "default" | "primary" | "danger";
  footer?: ReactNode;
  children: ReactNode;
}) {
  const isPrimary = tone === "primary";
  const isDanger = tone === "danger";
  const isUser = align === "end";

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser ? <ModelDebugSpeakerAvatar align={align} tone={tone} /> : null}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2",
          isUser
            ? "max-w-[88%] items-end sm:max-w-[76%]"
            : "max-w-[95%] items-start sm:max-w-[82%]",
        )}
      >
        {label && !isUser ? (
          <div
            className={cn(
              "px-1 text-xs leading-4 font-medium text-muted-foreground",
              !isPrimary && !isDanger && "text-muted-foreground",
              isDanger && "text-destructive/80",
            )}
          >
            {label}
          </div>
        ) : null}
        {!isUser && reasoning?.trim() ? (
          <ModelDebugReasoningTrace
            label={reasoningLabel}
            value={reasoning}
          />
        ) : null}
        <div
          className={cn(
            "w-full overflow-hidden px-4 py-3 text-sm leading-7",
            isPrimary &&
              "rounded-2xl border border-transparent bg-muted text-foreground",
            !isPrimary &&
              !isDanger &&
              "rounded-none border-0 bg-transparent text-foreground",
            isDanger &&
              "rounded-md border border-destructive/20 bg-destructive/5 text-destructive",
          )}
        >
          {typeof children === "string" ? (
            <MessageRichContent value={children} tone={tone} />
          ) : (
            children
          )}
        </div>
        {footer ? (
          <div
            className={cn(
              "px-1 text-xs leading-4",
              isPrimary
                ? "text-primary-foreground/75"
                : "text-muted-foreground",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
      {isUser ? <ModelDebugSpeakerAvatar align={align} tone={tone} /> : null}
    </div>
  );
}

function ModelDebugReasoningTrace({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const reasoning = value.trim();

  if (!reasoning) {
    return null;
  }

  return (
    <Collapsible defaultOpen className="group/reasoning w-full">
      <div className="overflow-hidden rounded-md border border-border/70 bg-muted/35 text-muted-foreground">
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs leading-4 font-medium"
            />
          }
        >
          <ChevronRightIcon className="size-3.5 shrink-0 transition-transform duration-200 group-data-open/reasoning:rotate-90" />
          <span>{label}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="max-h-60 overflow-auto border-t border-border/70 px-3 py-2.5 text-xs leading-6">
            <MessageRichContent value={reasoning} tone="default" />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ModelDebugSpeakerAvatar({
  align,
  tone,
}: {
  align: "start" | "end";
  tone: "default" | "primary" | "danger";
}) {
  const isUser = align === "end";
  const isDanger = tone === "danger";

  return (
    <Avatar
      size="sm"
      className={cn(
        "mt-1 border",
        isUser && "border-border/70 bg-muted text-muted-foreground",
        !isUser &&
          !isDanger &&
          "border-border/70 bg-background text-muted-foreground",
        !isUser &&
          isDanger &&
          "border-destructive/20 bg-destructive/10 text-destructive",
      )}
    >
      <AvatarFallback className="bg-transparent text-current">
        {isUser ? (
          <UserRoundIcon className="size-3.5" />
        ) : (
          <BotIcon className="size-3.5" />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

function MessageRichContent({
  value,
  tone,
}: {
  value: string;
  tone: "default" | "primary" | "danger";
}) {
  const blocks = parseMessageBlocks(value);

  if (blocks.length === 0) {
    return (
      <div className="whitespace-pre-wrap break-words text-sm leading-7">
        {value}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm leading-6">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={index} className="whitespace-pre-wrap break-words">
                {block.content}
              </p>
            );
          case "list":
            return block.ordered ? (
              <ol key={index} className="space-y-1.5 list-decimal pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ol>
            ) : (
              <ul key={index} className="space-y-1.5 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="list-disc">
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "divider":
            return (
              <Separator
                key={index}
                className={cn(
                  "my-1",
                  tone === "primary" ? "bg-primary-foreground/20" : "bg-border/70",
                )}
              />
            );
          case "code":
            return (
              <div
                key={index}
                className={cn(
                  "overflow-hidden rounded-xl border",
                  tone === "primary"
                    ? "border-primary-foreground/15 bg-primary-foreground/10"
                    : "border-border/70 bg-muted/30",
                )}
              >
                {block.language ? (
                  <div
                    className={cn(
                      "border-b px-3 py-2 font-mono text-xs uppercase",
                      tone === "primary"
                        ? "border-primary-foreground/15 text-primary-foreground/70"
                        : "border-border/70 text-muted-foreground",
                    )}
                  >
                    {block.language}
                  </div>
                ) : null}
                <pre className="overflow-x-auto px-3 py-3 font-mono text-xs leading-6 whitespace-pre-wrap">
                  {block.content}
                </pre>
              </div>
            );
        }
      })}
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
        "overflow-hidden rounded-md border bg-background",
        className,
      )}
    >
      <Table>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label} className="hover:bg-transparent">
              <th
                scope="row"
                className="w-32 px-3 py-2 text-left text-xs font-medium whitespace-normal uppercase text-muted-foreground"
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
    <div className="overflow-hidden rounded-md border bg-background">
      <Table>
        <TableBody>
          {headers.map(([key, value]) => (
            <TableRow key={key} className="hover:bg-transparent">
              <th
                scope="row"
                className="w-36 px-3 py-2 text-left font-mono text-xs font-medium whitespace-normal text-muted-foreground"
              >
                {key}
              </th>
              <TableCell className="px-3 py-2 font-mono text-xs whitespace-normal break-all">
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
        <pre className="max-h-[24rem] overflow-auto px-4 py-3 font-mono text-xs leading-6">
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
    onReasoning,
  }: {
    onText: (chunk: string) => void;
    onReasoning: (chunk: string) => void;
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
        summary = handleChatSmokeStreamEvent({
          event,
          data,
          summary,
          onText,
          onReasoning,
        });
      });
    }

    buffer += decoder.decode();
    buffer = consumeClientSSEBuffer(buffer, ({ event, data }) => {
      summary = handleChatSmokeStreamEvent({
        event,
        data,
        summary,
        onText,
        onReasoning,
      });
    });

    if (buffer.trim() !== "") {
      const finalEvent = parseClientSSEEvent(buffer);

      if (finalEvent?.data && finalEvent.data !== "[DONE]") {
        summary = handleChatSmokeStreamEvent({
          event: finalEvent.event,
          data: finalEvent.data,
          summary,
          onText,
          onReasoning,
        });
      }
    }
  } finally {
    reader.releaseLock();
  }

  return summary ?? ({} as ChatSmokeResponse);
}

function handleChatSmokeStreamEvent({
  event,
  data,
  summary,
  onText,
  onReasoning,
}: {
  event: string;
  data: string;
  summary: ChatSmokeResponse | undefined;
  onText: (chunk: string) => void;
  onReasoning: (chunk: string) => void;
}) {
  if (!data || data === "[DONE]") {
    return summary;
  }

  if (event === "gateway-summary") {
    return (parseMaybeJSON(data) ?? {}) as ChatSmokeResponse;
  }

  const chunk = extractStreamChunk(parseMaybeJSON(data));

  if (chunk.reasoning) {
    onReasoning(chunk.reasoning);
  }

  if (chunk.content) {
    onText(chunk.content);
  }

  return summary;
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

function extractStreamChunk(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      content: "",
      reasoning: "",
    };
  }

  const response = value as Record<string, unknown>;
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const contentParts: string[] = [];
  const reasoningParts: string[] = [];

  choices.forEach((choice) => {
    if (!choice || typeof choice !== "object") {
      return;
    }

    const record = choice as Record<string, unknown>;
    const content = extractChoiceVisibleText(record);
    const reasoning = extractChoiceReasoning(record);

    if (content) {
      contentParts.push(content);
    }

    if (reasoning) {
      reasoningParts.push(reasoning);
    }
  });

  return {
    content: contentParts.join(""),
    reasoning: reasoningParts.join(""),
  };
}

function extractChoiceVisibleText(choice: Record<string, unknown>) {
  const message =
    choice.message && typeof choice.message === "object"
      ? (choice.message as Record<string, unknown>)
      : null;
  const delta =
    choice.delta && typeof choice.delta === "object"
      ? (choice.delta as Record<string, unknown>)
      : null;

  return (
    extractNestedText(message?.content) ??
    extractNestedText(delta?.content) ??
    extractNestedText(choice.content) ??
    extractNestedText(choice.text) ??
    extractNestedText(message?.text) ??
    null
  );
}

function extractChoiceReasoning(choice: Record<string, unknown>) {
  const message =
    choice.message && typeof choice.message === "object"
      ? (choice.message as Record<string, unknown>)
      : null;
  const delta =
    choice.delta && typeof choice.delta === "object"
      ? (choice.delta as Record<string, unknown>)
      : null;

  return mergeReasoningText(
    extractReasoningText(delta),
    extractReasoningText(message),
    extractReasoningText(choice),
  );
}

function extractReasoningText(record?: Record<string, unknown> | null) {
  if (!record) {
    return null;
  }

  return mergeReasoningText(
    extractNestedText(record.reasoning_content),
    extractNestedText(record.reasoningContent),
    extractNestedText(record.reasoning),
    extractNestedText(record.thinking),
    extractNestedText(record.thought),
    extractNestedText(record.thoughts),
    extractThinkingBlocks(record.thinking_blocks),
    extractThinkingBlocks(record.thinkingBlocks),
    extractReasoningItems(record.reasoning_items),
    extractReasoningItems(record.reasoningItems),
    extractReasoningItems(record.reasoning_details),
    extractReasoningItems(record.reasoningDetails),
  );
}

function extractThinkingBlocks(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const parts = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;

      if (record.type === "redacted_thinking") {
        return null;
      }

      return (
        extractNestedText(record.thinking) ??
        extractNestedText(record.text) ??
        extractNestedText(record.content) ??
        null
      );
    })
    .filter((item): item is string => Boolean(item));

  return parts.length > 0 ? parts.join("") : null;
}

function extractReasoningItems(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const parts = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return extractNestedText(item);
      }

      const record = item as Record<string, unknown>;

      if (record.type === "redacted_thinking") {
        return null;
      }

      return mergeReasoningText(
        extractNestedText(record.summary),
        extractNestedText(record.text),
        extractNestedText(record.content),
        extractNestedText(record.reasoning),
        extractNestedText(record.reasoning_content),
        extractNestedText(record.thinking),
      );
    })
    .filter((item): item is string => Boolean(item));

  return parts.length > 0 ? parts.join("\n\n") : null;
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

function extractDebugReasoning(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const response = value as Record<string, unknown>;
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const choiceReasoning = choices
    .map((choice) =>
      choice && typeof choice === "object"
        ? extractChoiceReasoning(choice as Record<string, unknown>)
        : null,
    )
    .filter((item): item is string => Boolean(item));
  const outputReasoning = extractReasoningItems(response.output);

  return mergeReasoningText(...choiceReasoning, outputReasoning);
}

function splitEmbeddedReasoning(value: string) {
  const reasoningParts: string[] = [];
  const content = value
    .replace(
      /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi,
      (_match, reasoning: string) => {
        if (reasoning.trim()) {
          reasoningParts.push(reasoning.trim());
        }

        return "";
      },
    )
    .trim();

  return {
    content,
    reasoning: reasoningParts.length > 0 ? reasoningParts.join("\n\n") : null,
  };
}

function mergeReasoningText(...values: Array<string | null | undefined>) {
  const parts: string[] = [];

  values.forEach((value) => {
    const normalized = value?.trim();

    if (!normalized) {
      return;
    }

    const isDuplicate = parts.some(
      (part) => part === normalized || part.includes(normalized),
    );

    if (isDuplicate) {
      return;
    }

    for (let index = parts.length - 1; index >= 0; index -= 1) {
      if (normalized.includes(parts[index])) {
        parts.splice(index, 1);
      }
    }

    parts.push(normalized);
  });

  return parts.length > 0 ? parts.join("\n\n") : null;
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

function sanitizePlaygroundModels(values: Array<string | null | undefined>) {
  const unique = uniqueDebugValues(values);
  const normalized = new Set(unique.map((value) => value.toLowerCase()));

  return unique.filter(
    (value) => !resolveLegacyPlaygroundAlias(value, normalized),
  );
}

function preferPlaygroundModel(
  value: string | null | undefined,
  candidates: Array<string | null | undefined>,
) {
  const normalizedValue = value?.trim() ?? "";

  if (normalizedValue === "") {
    return "";
  }

  const normalizedCandidates = new Set(
    uniqueDebugValues([normalizedValue, ...candidates]).map((item) =>
      item.toLowerCase(),
    ),
  );

  return (
    resolveLegacyPlaygroundAlias(normalizedValue, normalizedCandidates) ??
    normalizedValue
  );
}

function resolveLegacyPlaygroundAlias(
  value: string,
  candidates: Set<string>,
): string | null {
  const normalizedValue = value.trim();
  const slashIndex = normalizedValue.indexOf("/");

  if (slashIndex <= 0 || slashIndex >= normalizedValue.length - 1) {
    return null;
  }

  const provider = normalizedValue.slice(0, slashIndex).trim().toLowerCase();
  const actualModel = normalizedValue.slice(slashIndex + 1).trim();

  if (actualModel === "" || !candidates.has(actualModel.toLowerCase())) {
    return null;
  }

  switch (provider) {
    case "deepseek":
      return actualModel;
    default:
      return null;
  }
}

function createDebugSelectOptions(values: Array<string | null | undefined>) {
  return sanitizePlaygroundModels(values).map((value) => ({
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
