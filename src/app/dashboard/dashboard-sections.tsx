import { CreateAPIKeyForm } from "@/components/dashboard-actions/api-keys";
import { ChatSmokeTestForm } from "@/components/dashboard-actions/chat-smoke";
import { CreateModelDeploymentForm } from "@/components/dashboard-actions/deployments";
import {
  CreateModelCatalogForm,
  CreateProviderCredentialForm,
  CreateProviderSetupForm,
} from "@/components/dashboard-actions/model-registry";
import {
  CreateWorkspaceForm,
  CreateWorkspaceUserDialog,
} from "@/components/dashboard-actions/workspace";
import {
  Card,
  CardAction,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import type { DailyUsage, RequestLog, RuntimeResourceSnapshot } from "@/lib/gatewayllm";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  BadgeDollarSignIcon,
  BotIcon,
  ClipboardListIcon,
  Clock3Icon,
  GaugeIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersRoundIcon,
  WorkflowIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  DashboardDetailText,
  DashboardMonoDetailText,
  DashboardPanelContent,
  DashboardPanelHeader,
  DashboardRow,
  DashboardStackContent,
  DashboardSummaryGrid,
  DashboardSummaryTile,
  DashboardSidebarCard,
  DashboardTableList,
  DashboardWorkspaceScopeTile,
  EmptyState,
  StatusBadge,
  WorkspaceRow,
  getWorkspaceScope,
  localizeValue,
} from "./dashboard-ui";
import {
  APIKeyRow,
  ModelCatalogRow,
  ModelDeploymentRow,
  ProviderCredentialRow,
  ProviderSetupRow,
  RegistrationRequestRow,
  WorkspaceMemberRow,
} from "./dashboard-rows";
import { AccountSection } from "./dashboard-account-section";
import type { Settled } from "./dashboard-data";
import { ModelAccessTabs } from "./model-access-tabs";
import { RequestLogsTable } from "./request-logs-table";
import type { DashboardSectionContentProps } from "./dashboard-section-types";
import { StatusTrafficChart } from "./status-traffic-chart";
import { UsageRequestDetails } from "./usage-request-details";
import { WorkspaceUsersTable } from "./workspace-user-row";

export function DashboardSectionContent(props: DashboardSectionContentProps) {
  switch (props.section) {
    case "status":
      return <StatusSection {...props} />;
    case "usage":
      return <UsageSection {...props} />;
    case "usage-details":
      return <UsageDetailsSection {...props} />;
    case "logs":
      return <RequestLogsSection {...props} />;
    case "workspaces":
      return <WorkspacesSection {...props} />;
    case "account":
      return <AccountSection {...props} />;
    case "users":
      return <UsersSection {...props} />;
    case "members":
      return <MembersSection {...props} />;
    case "registration":
      return <RegistrationSection {...props} />;
    case "api-keys":
      return <ApiKeysSection {...props} />;
    case "provider-setups":
      return <ProviderSetupsSection {...props} />;
    case "models":
      return <ModelsSection {...props} />;
    case "credentials":
      return <CredentialsSection {...props} />;
    case "deployments":
      return <DeploymentsSection {...props} />;
    case "chat-smoke":
      return <ChatSmokeSection {...props} />;
  }
}

function getSettledMessage<T>(result: Settled<T>, successMessage: string) {
  return result.ok ? successMessage : result.error;
}

function getCountLabel(
  count: number,
  pagination: DashboardSectionContentProps["tablePagination"][string],
) {
  if (!pagination) {
    return String(count);
  }

  const loadedCount = pagination.offset + count;

  return pagination.hasNext ? `${loadedCount}+` : String(loadedCount);
}

function DashboardSettledEmptyState<T>({
  result,
  emptyMessage,
  icon,
}: {
  result: Settled<T>;
  emptyMessage: string;
  icon?: ReactNode;
}) {
  return (
    <EmptyState message={getSettledMessage(result, emptyMessage)} icon={icon} />
  );
}

function StatusSection({
  activeWorkspace,
  t,
  health,
  ready,
  frontendRuntime,
  backendRuntime,
  workspaces,
  workspaceList,
  registrationRequests,
  apiKeys,
  dailyUsage,
  requestLogs,
  workspaceUsers,
  workspaceUserList,
  workspaceMembers,
  modelCatalogList,
  providerCredentialList,
  providerSetupList,
  modelDeploymentList,
  showRegistration,
  showModelDeploymentManagement,
}: DashboardSectionContentProps) {
  const apiKeyList = apiKeys.ok ? apiKeys.data.data : [];
  const dailyUsageList = dailyUsage.ok
    ? [...dailyUsage.data.data].sort((left, right) =>
        left.usage_date.localeCompare(right.usage_date),
      )
    : [];
  const recentRequestLogList = requestLogs.ok
    ? [...requestLogs.data.data]
        .sort(
          (left, right) =>
            getTimestamp(right.completed_at ?? right.request_started_at) -
            getTimestamp(left.completed_at ?? left.request_started_at),
        )
        .slice(0, 6)
    : [];
  const statusRequestLogList = requestLogs.ok ? requestLogs.data.data : [];
  const thirtyDayRequests = sumValues(
    dailyUsageList.map((usage) => usage.request_count),
  );
  const thirtyDaySuccesses = sumValues(
    dailyUsageList.map((usage) => usage.success_count),
  );
  const thirtyDayFailures = sumValues(
    dailyUsageList.map((usage) => usage.failure_count),
  );
  const thirtyDayTokens = sumValues(
    dailyUsageList.map(
      (usage) => usage.prompt_tokens + usage.completion_tokens,
    ),
  );
  const thirtyDaySpend = sumValues(
    dailyUsageList.map((usage) => parseNumericValue(usage.spend_usd)),
  );
  const successRate =
    thirtyDayRequests > 0
      ? (thirtyDaySuccesses / thirtyDayRequests) * 100
      : 0;
  const averageLatencyMS = averageValues(
    recentRequestLogList.map((log) => log.duration_ms),
  );
  const averageFirstTokenLatencyMS = averageValues(
    recentRequestLogList.map((log) => log.first_token_latency_ms),
  );
  const activeProviderSetups = providerSetupList.filter(
    (setup) => setup.status === "active",
  );
  const activeModelCount = modelCatalogList.filter(
    (modelCatalog) => modelCatalog.status === "active",
  ).length;
  const inactiveDeploymentCount = modelDeploymentList.filter(
    (deployment) => deployment.status !== "active",
  ).length;
  const readyCredentialCount = providerCredentialList.filter(
    (credential) =>
      credential.status === "active" && credential.secret_configured,
  ).length;
  const missingSecretCount = providerCredentialList.filter(
    (credential) => !credential.secret_configured,
  ).length;
  const activeApiKeyCount = apiKeyList.filter(
    (apiKey) => apiKey.status === "active",
  ).length;
  const pendingRegistrationCount = registrationRequests.ok
    ? registrationRequests.data.data.length
    : 0;
  const recentFailureCount = recentRequestLogList.filter(
    (log) => log.status !== "succeeded",
  ).length;
  const trafficChartData = dailyUsageList.slice(-30).map((usage) => ({
    date: usage.usage_date,
    label: usage.usage_date.slice(5),
    succeeded: usage.success_count,
    failed: usage.failure_count,
  }));
  const providerStats = Array.from(
    statusRequestLogList.reduce((map, log) => {
      const provider =
        log.model_provider?.trim() ||
        log.latest_attempt?.provider?.trim() ||
        t("dashboard.notSet");
      const current =
        map.get(provider) ??
        ({
          provider,
          requests: 0,
          succeeded: 0,
          failed: 0,
          spend: 0,
          totalTokens: 0,
          latencies: [] as number[],
          firstTokenLatencies: [] as number[],
          lastSeen: "",
        } satisfies StatusProviderStatModel);

      current.requests += 1;
      current.succeeded += log.status === "succeeded" ? 1 : 0;
      current.failed += log.status === "failed" ? 1 : 0;
      current.spend += parseNumericValue(log.spend_usd);
      current.totalTokens += log.total_tokens;
      if (typeof log.duration_ms === "number") {
        current.latencies.push(log.duration_ms);
      }
      if (typeof log.first_token_latency_ms === "number") {
        current.firstTokenLatencies.push(log.first_token_latency_ms);
      }
      const seenAt = log.completed_at ?? log.request_started_at ?? "";
      if (seenAt && getTimestamp(seenAt) > getTimestamp(current.lastSeen)) {
        current.lastSeen = seenAt;
      }

      map.set(provider, current);
      return map;
    }, new Map<string, StatusProviderStatModel>()),
  )
    .map((entry) => ({
      ...entry[1],
      successRate:
        entry[1].requests > 0
          ? (entry[1].succeeded / entry[1].requests) * 100
          : 0,
      averageLatencyMS: averageValues(entry[1].latencies),
      averageFirstTokenLatencyMS: averageValues(entry[1].firstTokenLatencies),
    }))
    .sort((left, right) => {
      if (right.requests !== left.requests) {
        return right.requests - left.requests;
      }
      return right.spend - left.spend;
    })
    .slice(0, 5);
  const attentionItems: StatusAttentionItemModel[] = [
    ...(missingSecretCount > 0
      ? [
          {
            key: "missing-secrets",
            label: t("dashboard.missingSecrets"),
            value: formatWholeNumber(missingSecretCount),
            tone: "critical" as const,
          },
        ]
      : []),
    ...(showModelDeploymentManagement && inactiveDeploymentCount > 0
      ? [
          {
            key: "inactive-deployments",
            label: t("dashboard.inactiveDeployments"),
            value: formatWholeNumber(inactiveDeploymentCount),
            tone: "warning" as const,
          },
        ]
      : []),
    ...(recentFailureCount > 0
      ? [
          {
            key: "recent-failures",
            label: t("dashboard.recentFailures"),
            value: formatWholeNumber(recentFailureCount),
            tone: "critical" as const,
          },
        ]
      : []),
    ...(showRegistration && pendingRegistrationCount > 0
      ? [
          {
            key: "pending-signups",
            label: t("dashboard.pendingSignups"),
            value: formatWholeNumber(pendingRegistrationCount),
            tone: "warning" as const,
          },
        ]
      : []),
  ];
  const healthStatus = health.ok
    ? localizeValue(t, health.data.status)
    : t("dashboard.offline");
  const readinessStatus = ready.ok
    ? localizeValue(t, ready.data.status)
    : t("dashboard.unknown");
  const routeCoverageRate =
    providerSetupList.length > 0
      ? (activeProviderSetups.length / providerSetupList.length) * 100
      : undefined;
  const attentionCriticalCount = attentionItems.filter(
    (item) => item.tone === "critical",
  ).length;
  const attentionWarningCount = attentionItems.filter(
    (item) => item.tone === "warning",
  ).length;
  const frontendRuntimeTone = getRuntimeResourceTone(frontendRuntime);
  const backendRuntimeTone = getRuntimeResourceTone(backendRuntime, {
    healthStatus: health.ok ? health.data.status : undefined,
    readyStatus: ready.ok ? ready.data.status : undefined,
  });

  return (
    <section id="status" className="grid gap-3">
      <Card>
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.statusOverviewTitle")}</CardTitle>
          <CardAction className="flex flex-wrap items-center gap-2">
            <StatusBadge>
              {healthStatus}
            </StatusBadge>
            <StatusBadge>
              {readinessStatus}
            </StatusBadge>
          </CardAction>
        </DashboardPanelHeader>
        <DashboardPanelContent className="grid gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/25 p-2.5">
            <StatusBadge>
              {activeWorkspace?.name ?? t("dashboard.noWorkspaceAvailable")}
            </StatusBadge>
            <DashboardMonoDetailText className="max-w-full">
              {activeWorkspace?.id ?? t("dashboard.notSet")}
            </DashboardMonoDetailText>
            <DashboardDetailText className="max-w-full">
              {getSettledMessage(workspaces, t("dashboard.visibleToSession"))}
            </DashboardDetailText>
          </div>

          <div className="grid gap-3 lg:grid-cols-3 2xl:grid-cols-6">
            <DashboardSummaryTile
              icon={<ShieldCheckIcon className="size-4" />}
              label={t("dashboard.systemHealth")}
              value={`${healthStatus} / ${readinessStatus}`}
              detail={t("dashboard.healthReadinessDetail", {
                health: healthStatus,
                readiness: readinessStatus,
              })}
            />
            <DashboardSummaryTile
              icon={<ActivityIcon className="size-4" />}
              label={t("dashboard.thirtyDayRequests")}
              value={formatWholeNumber(thirtyDayRequests)}
              detail={t("dashboard.statusSuccessFailure", {
                success: formatWholeNumber(thirtyDaySuccesses),
                failure: formatWholeNumber(thirtyDayFailures),
              })}
            />
            <DashboardSummaryTile
              icon={<GaugeIcon className="size-4" />}
              label={t("dashboard.successRate")}
              value={formatPercent(successRate)}
              detail={t("dashboard.last30Days")}
            />
            <DashboardSummaryTile
              icon={<WorkflowIcon className="size-4" />}
              label={t("dashboard.routeCoverage")}
              value={
                routeCoverageRate === undefined
                  ? t("dashboard.notSet")
                  : formatPercent(routeCoverageRate)
              }
              detail={
                routeCoverageRate === undefined
                  ? t("dashboard.noProviderSetups")
                  : t("dashboard.routeCoverageDetail", {
                      active: formatWholeNumber(activeProviderSetups.length),
                      total: formatWholeNumber(providerSetupList.length),
                    })
              }
            />
            <DashboardSummaryTile
              icon={<TriangleAlertIcon className="size-4" />}
              label={t("dashboard.pendingRisks")}
              value={formatWholeNumber(attentionItems.length)}
              detail={
                attentionItems.length > 0
                  ? t("dashboard.pendingRisksDetail", {
                      critical: formatWholeNumber(attentionCriticalCount),
                      warning: formatWholeNumber(attentionWarningCount),
                    })
                  : t("dashboard.noPendingRisks")
              }
            />
            <DashboardSummaryTile
              icon={<Clock3Icon className="size-4" />}
              label={t("dashboard.avgLatencyRecent")}
              value={formatLatency(averageLatencyMS, t("dashboard.notSet"))}
              detail={t("dashboard.statusRecentAverage")}
            />
          </div>
        </DashboardPanelContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.95fr)]">
        <Card className="min-w-0">
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.statusTrafficTitle")}</CardTitle>
            <CardDescription>
              {t("dashboard.statusTrafficDescription")}
            </CardDescription>
            <CardAction>
              <StatusBadge>{t("dashboard.last30Days")}</StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent className="grid gap-4">
            {trafficChartData.length > 0 ? (
              <StatusTrafficChart
                data={trafficChartData}
                successLabel={t("values.succeeded")}
                failedLabel={t("values.failed")}
              />
            ) : (
              <DashboardSettledEmptyState
                result={dailyUsage}
                emptyMessage={t("dashboard.noDailyUsage")}
                icon={<ActivityIcon />}
              />
            )}

            <div className="grid gap-2 sm:grid-cols-3">
              <DashboardSummaryTile
                icon={<UsersRoundIcon className="size-4" />}
                label={t("dashboard.totalTokens")}
                value={formatWholeNumber(thirtyDayTokens)}
                detail={t("dashboard.statusTokens30d")}
              />
              <DashboardSummaryTile
                icon={<BadgeDollarSignIcon className="size-4" />}
                label={t("dashboard.spend")}
                value={formatCurrency(thirtyDaySpend)}
                detail={t("dashboard.last30Days")}
              />
              <DashboardSummaryTile
                icon={<Clock3Icon className="size-4" />}
                label={t("dashboard.firstTokenLatency")}
                value={formatLatency(
                  averageFirstTokenLatencyMS,
                  t("dashboard.notSet"),
                )}
                detail={t("dashboard.statusRecentAverage")}
              />
            </div>
          </DashboardPanelContent>
        </Card>

        <Card>
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.resourceReadinessTitle")}</CardTitle>
            <CardDescription>
              {t("dashboard.resourceReadinessDescription")}
            </CardDescription>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            <div className="grid gap-2 sm:grid-cols-2">
              <DashboardSummaryTile
                icon={<WorkflowIcon className="size-4" />}
                label={t("dashboard.workspaces")}
                value={formatWholeNumber(workspaceList.length)}
                detail={t("dashboard.visibleToSession")}
              />
              <DashboardSummaryTile
                icon={<UsersRoundIcon className="size-4" />}
                label={t("dashboard.users")}
                value={formatWholeNumber(workspaceUserList.length)}
                detail={getSettledMessage(
                  workspaceUsers,
                  t("dashboard.workspaceUsers"),
                )}
              />
              <DashboardSummaryTile
                icon={<UserCheckIcon className="size-4" />}
                label={t("dashboard.members")}
                value={formatWholeNumber(
                  workspaceMembers.ok ? workspaceMembers.data.data.length : 0,
                )}
                detail={getSettledMessage(
                  workspaceMembers,
                  t("dashboard.workspaceMembers"),
                )}
              />
              <DashboardSummaryTile
                icon={<BotIcon className="size-4" />}
                label={t("dashboard.modelsTitle")}
                value={formatWholeNumber(activeModelCount)}
                detail={t("dashboard.activeModels")}
              />
              <DashboardSummaryTile
                icon={<ShieldCheckIcon className="size-4" />}
                label={t("dashboard.credentialsReady")}
                value={formatWholeNumber(readyCredentialCount)}
                detail={t("dashboard.credentialsDescription")}
              />
              <DashboardSummaryTile
                icon={<KeyRoundIcon className="size-4" />}
                label={t("dashboard.activeApiKeys")}
                value={formatWholeNumber(activeApiKeyCount)}
                detail={getSettledMessage(apiKeys, t("dashboard.apiKeysListTitle"))}
              />
            </div>
          </DashboardPanelContent>
        </Card>
      </div>

      <Card>
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.runtimeResourcesTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.runtimeResourcesDescription")}
          </CardDescription>
        </DashboardPanelHeader>
        <DashboardPanelContent>
          <div className="grid gap-3 xl:grid-cols-2">
            <StatusRuntimeResourceCard
              kind="frontend"
              title={t("dashboard.frontendRuntimeTitle")}
              icon={<ActivityIcon className="size-4" />}
              result={frontendRuntime}
              tone={frontendRuntimeTone}
              t={t}
            />
            <StatusRuntimeResourceCard
              kind="backend"
              title={t("dashboard.backendRuntimeTitle")}
              icon={<WorkflowIcon className="size-4" />}
              result={backendRuntime}
              tone={backendRuntimeTone}
              t={t}
            />
          </div>
        </DashboardPanelContent>
      </Card>

      <Card>
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.providerPerformanceTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.providerPerformanceDescription")}
          </CardDescription>
          <CardAction>
            <StatusBadge>{t("dashboard.last60Requests")}</StatusBadge>
          </CardAction>
        </DashboardPanelHeader>
        <DashboardStackContent>
          {providerStats.length > 0 ? (
            providerStats.map((provider) => (
              <StatusProviderPerformanceRow
                key={provider.provider}
                provider={provider}
                t={t}
              />
            ))
          ) : (
            <DashboardSettledEmptyState
              result={requestLogs}
              emptyMessage={t("dashboard.noProviderTraffic")}
              icon={<BotIcon />}
            />
          )}
        </DashboardStackContent>
      </Card>

      <Card>
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.recentRequestsTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.recentRequestsDescription")}
          </CardDescription>
        </DashboardPanelHeader>
        <DashboardStackContent>
          {recentRequestLogList.length > 0 ? (
            recentRequestLogList.map((log) => (
              <StatusRecentRequestRow key={log.id} log={log} t={t} />
            ))
          ) : (
            <DashboardSettledEmptyState
              result={requestLogs}
              emptyMessage={t("dashboard.noRequestLogs")}
              icon={<ClipboardListIcon />}
            />
          )}
        </DashboardStackContent>
      </Card>
    </section>
  );
}

type StatusAttentionItemModel = {
  key: string;
  label: string;
  value: string;
  tone: "default" | "warning" | "critical";
};

type StatusSeverityTone = "healthy" | "warning" | "critical";

type StatusProviderStatModel = {
  provider: string;
  requests: number;
  succeeded: number;
  failed: number;
  spend: number;
  totalTokens: number;
  latencies: number[];
  firstTokenLatencies: number[];
  lastSeen: string;
  successRate?: number;
  averageLatencyMS?: number;
  averageFirstTokenLatencyMS?: number;
};

type StatusTone =
  | StatusAttentionItemModel["tone"]
  | StatusSeverityTone;

function getStatusToneIconClass(tone: StatusTone) {
  return cn(
    "border-border/70 bg-muted/35 text-muted-foreground",
    tone === "critical" && "border-border bg-muted/70 text-foreground",
    tone === "warning" && "border-border/80 bg-muted/55 text-foreground",
    tone === "healthy" && "border-primary/15 bg-primary/5 text-primary",
  );
}

function getStatusToneBadgeClass(tone: StatusTone) {
  return cn(
    "border-border/70 bg-background text-muted-foreground",
    tone === "critical" && "border-border bg-muted/70 text-foreground",
    tone === "warning" && "border-border/80 bg-muted/55 text-foreground",
    tone === "healthy" && "border-primary/15 bg-primary/5 text-primary",
  );
}

function getStatusToneDotClass(tone: StatusTone) {
  return cn(
    "bg-border",
    tone === "critical" && "bg-foreground",
    tone === "warning" && "bg-muted-foreground",
    tone === "healthy" && "bg-primary",
  );
}

function getRuntimeResourceTone(
  result: Settled<RuntimeResourceSnapshot>,
  options?: {
    healthStatus?: string;
    readyStatus?: string;
  },
): StatusSeverityTone {
  if (!result.ok) {
    return result.status === 404 ? "warning" : "critical";
  }

  if (
    options?.healthStatus &&
    options.healthStatus.toLowerCase() !== "ok"
  ) {
    return "critical";
  }

  if (
    options?.readyStatus &&
    options.readyStatus.toLowerCase() !== "ready"
  ) {
    return "critical";
  }

  const totalMemoryBytes = result.data.host.total_memory_bytes;
  const freeMemoryBytes = result.data.host.free_memory_bytes;
  if (
    typeof totalMemoryBytes === "number" &&
    totalMemoryBytes > 0 &&
    typeof freeMemoryBytes === "number"
  ) {
    const usedRatio = (totalMemoryBytes - freeMemoryBytes) / totalMemoryBytes;
    if (usedRatio >= 0.9) {
      return "critical";
    }
    if (usedRatio >= 0.75) {
      return "warning";
    }
  }

  const totalDiskBytes = result.data.host.disk_total_bytes;
  const freeDiskBytes = result.data.host.disk_free_bytes;
  if (
    typeof totalDiskBytes === "number" &&
    totalDiskBytes > 0 &&
    typeof freeDiskBytes === "number"
  ) {
    const usedRatio = (totalDiskBytes - freeDiskBytes) / totalDiskBytes;
    if (usedRatio >= 0.92) {
      return "critical";
    }
    if (usedRatio >= 0.82) {
      return "warning";
    }
  }

  if (
    typeof result.data.host.load_avg_1m === "number" &&
    result.data.host.cpu_count > 0
  ) {
    const loadPerCore = result.data.host.load_avg_1m / result.data.host.cpu_count;
    if (loadPerCore >= 1.5) {
      return "critical";
    }
    if (loadPerCore >= 0.9) {
      return "warning";
    }
  }

  return "healthy";
}

function getRuntimeUnavailableMessage(
  result: Settled<RuntimeResourceSnapshot>,
  t: DashboardSectionContentProps["t"],
  kind: "frontend" | "backend",
) {
  if (result.ok) {
    return t("dashboard.runtimeUnavailable");
  }

  if (kind === "backend" && result.status === 404) {
    return t("dashboard.runtimeEndpointMissing");
  }

  return getSettledMessage(result, t("dashboard.runtimeUnavailable"));
}

function StatusRuntimeResourceCard({
  kind,
  title,
  icon,
  result,
  tone,
  t,
}: {
  kind: "frontend" | "backend";
  title: string;
  icon: ReactNode;
  result: Settled<RuntimeResourceSnapshot>;
  tone: StatusSeverityTone;
  t: DashboardSectionContentProps["t"];
}) {
  return (
    <div
      className="grid gap-3 rounded-lg border border-border/70 bg-background p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md border",
              getStatusToneIconClass(tone),
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{title}</div>
            {result.ok ? (
              <DashboardMonoDetailText>
                {result.data.service} · {result.data.runtime} · PID {result.data.process.pid}
              </DashboardMonoDetailText>
            ) : null}
          </div>
        </div>
        <div
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[0.72rem] font-medium",
            getStatusToneBadgeClass(tone),
          )}
        >
          <span
            className={cn("size-1.5 rounded-full", getStatusToneDotClass(tone))}
          />
          {localizeValue(t, tone)}
        </div>
      </div>

      {result.ok ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <RuntimeMetric
              label={t("dashboard.uptime")}
              value={formatUptime(result.data.uptime_seconds, t("dashboard.notSet"))}
            />
            <RuntimeMetric
              label={t("dashboard.processRss")}
              value={formatBytes(
                result.data.process.rss_bytes,
                t("dashboard.notSet"),
              )}
            />
            <RuntimeMetric
              label={t("dashboard.heapUsage")}
              value={formatBytePair(
                result.data.process.heap_used_bytes,
                result.data.process.heap_total_bytes,
                t("dashboard.notSet"),
              )}
            />
            <RuntimeMetric
              label={t("dashboard.hostMemory")}
              value={formatHostMemoryUsage(
                result.data.host.total_memory_bytes,
                result.data.host.free_memory_bytes,
                t("dashboard.notSet"),
              )}
            />
            <RuntimeMetric
              label={t("dashboard.diskUsage")}
              value={formatDiskUsage(
                result.data.host.disk_total_bytes,
                result.data.host.disk_free_bytes,
                t("dashboard.notSet"),
              )}
            />
            <RuntimeMetric
              label={t("dashboard.tcpSockets")}
              value={formatTCPConnections(
                result.data.process.tcp_connection_count,
                result.data.process.tcp_established_count,
                t("dashboard.notSet"),
              )}
            />
            <RuntimeMetric
              label={t("dashboard.throughput1m")}
              value={formatRequestRate(
                result.data.traffic?.http_requests_last_minute,
                result.data.traffic?.http_requests_per_second,
                t("dashboard.notSet"),
              )}
            />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusBadge>
              {formatWholeNumber(result.data.host.cpu_count)} {t("dashboard.cpuCores")}
            </StatusBadge>
            <StatusBadge>
              {t("dashboard.loadAverage")}{" "}
              {formatLoadAverage(
                result.data.host.load_avg_1m,
                result.data.host.cpu_count,
                t("dashboard.notSet"),
              )}
            </StatusBadge>
            <DashboardDetailText className="min-w-0">
              {t("dashboard.capturedAt")}{" "}
              {formatStableTimestamp(result.data.captured_at, t("dashboard.notSet"))}
            </DashboardDetailText>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-border/70 bg-muted/35 px-3 py-2.5 text-sm text-foreground">
          {getRuntimeUnavailableMessage(result, t, kind)}
        </div>
      )}
    </div>
  );
}

function RuntimeMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
      <div className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 whitespace-normal break-words font-mono text-sm font-semibold leading-6 tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function StatusProviderPerformanceRow({
  provider,
  t,
}: {
  provider: StatusProviderStatModel;
  t: DashboardSectionContentProps["t"];
}) {
  return (
    <DashboardRow className="gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="truncate font-medium">{provider.provider}</div>
          <StatusBadge>
            {formatWholeNumber(provider.requests)} {t("dashboard.requestsShort")}
          </StatusBadge>
          <StatusBadge>{formatPercent(provider.successRate ?? 0)}</StatusBadge>
        </div>
        <DashboardDetailText className="mt-1">
          {t("dashboard.statusSuccessFailure", {
            success: formatWholeNumber(provider.succeeded),
            failure: formatWholeNumber(provider.failed),
          })}
        </DashboardDetailText>
        <DashboardDetailText>
          {t("dashboard.firstTokenLatency")}:{" "}
          {formatLatency(
            provider.averageFirstTokenLatencyMS,
            t("dashboard.notSet"),
          )}
        </DashboardDetailText>
      </div>
      <div className="grid gap-1 text-left md:text-right">
        <DashboardMonoDetailText className="font-medium text-foreground/80">
          {formatLatency(provider.averageLatencyMS, t("dashboard.notSet"))}
        </DashboardMonoDetailText>
        <DashboardDetailText>
          {formatCurrency(provider.spend)} ·{" "}
          {formatWholeNumber(provider.totalTokens)} tokens
        </DashboardDetailText>
        <DashboardDetailText>
          {formatStableTimestamp(provider.lastSeen, t("dashboard.notSet"))}
        </DashboardDetailText>
      </div>
    </DashboardRow>
  );
}

function StatusRecentRequestRow({
  log,
  t,
}: {
  log: RequestLog;
  t: DashboardSectionContentProps["t"];
}) {
  return (
    <DashboardRow className="gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="truncate font-medium">
            {log.model_canonical_name ?? t("dashboard.notSet")}
          </div>
          <StatusBadge>{localizeValue(t, log.status)}</StatusBadge>
        </div>
        <DashboardDetailText className="mt-1">
          {(log.model_provider ?? t("dashboard.notSet"))} · {log.endpoint}
        </DashboardDetailText>
        <DashboardMonoDetailText>{log.request_uid}</DashboardMonoDetailText>
      </div>
      <div className="grid gap-1 text-left md:text-right">
        <DashboardMonoDetailText className="font-medium text-foreground/80">
          {formatLatency(log.duration_ms, t("dashboard.notSet"))}
        </DashboardMonoDetailText>
        <DashboardDetailText>
          {formatCurrency(parseNumericValue(log.spend_usd))} ·{" "}
          {formatWholeNumber(log.total_tokens)} tokens
        </DashboardDetailText>
        <DashboardDetailText>
          {formatStableTimestamp(
            log.completed_at ?? log.request_started_at,
            t("dashboard.notSet"),
          )}
        </DashboardDetailText>
      </div>
    </DashboardRow>
  );
}

function getTimestamp(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sumValues(values: Array<number | string | undefined>): number {
  let total = 0;

  for (const value of values) {
    total += parseNumericValue(value);
  }

  return total;
}

function averageValues(values: Array<number | undefined>): number | undefined {
  const numericValues = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  if (numericValues.length === 0) {
    return undefined;
  }

  let total = 0;

  for (const value of numericValues) {
    total += value;
  }

  return total / numericValues.length;
}

function parseNumericValue(value: number | string | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatWholeNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatLatency(value: number | undefined, fallback: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return `${Math.round(value).toLocaleString("en-US")} ms`;
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "$0";
  }

  if (value >= 1000) {
    return `$${Math.round(value).toLocaleString("en-US")}`;
  }

  if (value >= 1) {
    return `$${value.toFixed(2)}`;
  }

  return `$${value.toFixed(4)}`;
}

function formatBytes(value: number | undefined, fallback: string): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let nextValue = value;
  let unitIndex = 0;

  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  const digits = nextValue >= 100 || unitIndex === 0 ? 0 : nextValue >= 10 ? 1 : 2;
  return `${nextValue.toFixed(digits)} ${units[unitIndex]}`;
}

function formatBytePair(
  used: number | undefined,
  total: number | undefined,
  fallback: string,
): string {
  const usedLabel = formatBytes(used, fallback);
  const totalLabel = formatBytes(total, fallback);

  if (usedLabel === fallback || totalLabel === fallback) {
    return fallback;
  }

  return `${usedLabel} / ${totalLabel}`;
}

function formatHostMemoryUsage(
  total: number | undefined,
  free: number | undefined,
  fallback: string,
): string {
  return formatUsedTotalPercentage(total, free, fallback);
}

function formatDiskUsage(
  total: number | undefined,
  free: number | undefined,
  fallback: string,
): string {
  return formatUsedTotalPercentage(total, free, fallback);
}

function formatUsedTotalPercentage(
  total: number | undefined,
  free: number | undefined,
  fallback: string,
): string {
  if (
    typeof total !== "number" ||
    !Number.isFinite(total) ||
    total <= 0 ||
    typeof free !== "number" ||
    !Number.isFinite(free)
  ) {
    return fallback;
  }

  const used = Math.max(total - free, 0);
  const usedPercent = (used / total) * 100;
  return `${formatBytes(used, fallback)} / ${formatBytes(total, fallback)} (${formatPercent(
    usedPercent,
  )})`;
}

function formatTCPConnections(
  total: number | undefined,
  established: number | undefined,
  fallback: string,
): string {
  if (
    typeof total !== "number" ||
    !Number.isFinite(total) ||
    typeof established !== "number" ||
    !Number.isFinite(established)
  ) {
    return fallback;
  }

  return `${formatWholeNumber(established)} / ${formatWholeNumber(total)}`;
}

function formatRequestRate(
  requestsLastMinute: number | undefined,
  requestsPerSecond: number | undefined,
  fallback: string,
): string {
  if (
    typeof requestsLastMinute !== "number" ||
    !Number.isFinite(requestsLastMinute) ||
    typeof requestsPerSecond !== "number" ||
    !Number.isFinite(requestsPerSecond)
  ) {
    return fallback;
  }

  return `${formatWholeNumber(requestsLastMinute)}/min · ${requestsPerSecond.toFixed(2)}/s`;
}

function formatLoadAverage(
  value: number | undefined,
  cpuCount: number | undefined,
  fallback: string,
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  if (typeof cpuCount === "number" && Number.isFinite(cpuCount) && cpuCount > 0) {
    return `${value.toFixed(2)} / ${formatWholeNumber(cpuCount)}`;
  }

  return value.toFixed(2);
}

function formatUptime(value: number | undefined, fallback: string): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }

  const totalSeconds = Math.floor(value);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${totalSeconds}s`;
}

function formatStableTimestamp(
  value: string | undefined,
  fallback: string,
): string {
  if (!value) {
    return fallback;
  }

  const dateTime = value.slice(0, 19).replace("T", " ");
  return value.endsWith("Z") ? `${dateTime} UTC` : dateTime;
}

function WorkspacesSection({ t, workspaceList }: DashboardSectionContentProps) {
  return (
    <section className="grid gap-3">
      <Card id="workspaces">
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.workspaces")}</CardTitle>
          <CardDescription>
            {t("dashboard.workspacesDescription")}
          </CardDescription>
        </DashboardPanelHeader>
        <DashboardStackContent>
          <CreateWorkspaceForm />
          {workspaceList.length > 0 ? (
            workspaceList.map((workspace) => (
              <WorkspaceRow key={workspace.id} workspace={workspace} t={t} />
            ))
          ) : (
            <EmptyState message={t("dashboard.noWorkspaces")} />
          )}
        </DashboardStackContent>
      </Card>
    </section>
  );
}

function UsersSection({
  t,
  activeWorkspace,
  workspaceUsers,
  workspaceUserList,
  tablePagination,
}: DashboardSectionContentProps) {
  const workspaceScope = getWorkspaceScope(activeWorkspace, t);

  return (
    <section className="grid gap-3">
      <Card id="users">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<UsersRoundIcon className="size-4" />}
            label={t("dashboard.users")}
            value={String(workspaceUserList.length)}
            detail={getSettledMessage(
              workspaceUsers,
              t("dashboard.workspaceUsers"),
            )}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.usersTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>
                {getCountLabel(
                  workspaceUserList.length,
                  tablePagination.workspace_users,
                )}
              </StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {workspaceUsers.ok &&
            (workspaceUserList.length > 0 ||
              tablePagination.workspace_users) ? (
              <WorkspaceUsersTable
                users={workspaceUserList}
                workspaceId={activeWorkspace?.id}
                pagination={tablePagination.workspace_users}
                t={t}
              />
            ) : (
              <DashboardSettledEmptyState
                result={workspaceUsers}
                emptyMessage={t("dashboard.noUsers")}
              />
            )}
          </DashboardPanelContent>
        </Card>

        <DashboardSidebarCard
          title={t("forms.createUser")}
          description={workspaceScope.label}
          icon={<UserPlusIcon className="size-4 text-muted-foreground" />}
        >
          <CreateWorkspaceUserDialog workspaceId={activeWorkspace?.id} />
          <div className="text-sm text-muted-foreground">
            {t("dashboard.usersDescription")}
          </div>
        </DashboardSidebarCard>
      </div>
    </section>
  );
}

function MembersSection({
  t,
  activeWorkspace,
  workspaceMembers,
  workspaceMemberList,
  modelCatalogList,
  tablePagination,
}: DashboardSectionContentProps) {
  const assignableModelCatalogList = modelCatalogList.filter(
    (modelCatalog) => modelCatalog.status === "active",
  );
  const activeMemberCount = workspaceMemberList.filter(
    (member) => member.status === "active",
  ).length;

  return (
    <section className="grid gap-3">
      <Card id="members">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<UserCheckIcon className="size-4" />}
            label={t("dashboard.members")}
            value={String(activeMemberCount)}
            detail={getSettledMessage(
              workspaceMembers,
              t("dashboard.workspaceMembers"),
            )}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>
      <Card>
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.membersTitle")}</CardTitle>
          <CardAction>
            <StatusBadge>
              {getCountLabel(
                workspaceMemberList.length,
                tablePagination.members,
              )}
            </StatusBadge>
          </CardAction>
        </DashboardPanelHeader>
        <DashboardPanelContent>
          {workspaceMembers.ok &&
          (workspaceMemberList.length > 0 || tablePagination.members) ? (
            <DashboardTableList
              className="xl:grid-cols-[minmax(12rem,1fr)_5rem_minmax(12rem,0.7fr)_minmax(26rem,1fr)]"
              paginationId="members"
              pagination={tablePagination.members}
              columns={[
                { label: t("dashboard.name") },
                { label: t("forms.role") },
                { label: t("nav.status") },
                { label: t("dashboard.actions"), className: "text-right" },
              ]}
            >
              {workspaceMemberList.map((member) => (
                <WorkspaceMemberRow
                  key={member.user_id}
                  member={member}
                  workspaceId={activeWorkspace?.id}
                  modelCatalogs={assignableModelCatalogList}
                  t={t}
                />
              ))}
            </DashboardTableList>
          ) : (
            <DashboardSettledEmptyState
              result={workspaceMembers}
              emptyMessage={t("dashboard.noMembers")}
            />
          )}
        </DashboardPanelContent>
      </Card>
    </section>
  );
}

function RegistrationSection({
  t,
  activeWorkspace,
  registrationRequests,
}: DashboardSectionContentProps) {
  const registrationRequestList = registrationRequests.ok
    ? registrationRequests.data.data
    : [];

  return (
    <section className="grid gap-3">
      <Card id="registration">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<ClipboardListIcon className="size-4" />}
            label={t("dashboard.registrationTitle")}
            value={String(registrationRequestList.length)}
            detail={getSettledMessage(
              registrationRequests,
              t("dashboard.registrationRequests"),
            )}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>

      <Card>
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.registrationTitle")}</CardTitle>
          <CardAction>
            <StatusBadge>{String(registrationRequestList.length)}</StatusBadge>
          </CardAction>
        </DashboardPanelHeader>
        <DashboardPanelContent>
          {registrationRequests.ok && registrationRequestList.length > 0 ? (
            <DashboardTableList
              className="xl:grid-cols-[minmax(12rem,1fr)_minmax(0,1fr)_minmax(12rem,0.8fr)_auto]"
              paginationId="registration"
              columns={[
                { label: t("dashboard.name") },
                { label: t("dashboard.email") },
                { label: t("dashboard.createdAt") },
                { label: t("dashboard.actions"), className: "text-right" },
              ]}
            >
              {registrationRequestList.map((request) => (
                <RegistrationRequestRow
                  key={request.id}
                  request={request}
                  t={t}
                />
              ))}
            </DashboardTableList>
          ) : (
            <DashboardSettledEmptyState
              result={registrationRequests}
              emptyMessage={t("dashboard.noRegistration")}
            />
          )}
        </DashboardPanelContent>
      </Card>
    </section>
  );
}

function ApiKeysSection({
  t,
  activeWorkspace,
  apiKeys,
  tablePagination,
}: DashboardSectionContentProps) {
  const apiKeyList = apiKeys.ok ? apiKeys.data.data : [];
  const activeKeyCount = apiKeyList.filter(
    (apiKey) => apiKey.status === "active",
  ).length;
  const workspaceScope = getWorkspaceScope(activeWorkspace, t);

  return (
    <section className="grid gap-3">
      <Card id="api-keys">
        <DashboardSummaryGrid>
          <DashboardSummaryTile
            icon={<ShieldCheckIcon className="size-4" />}
            label={t("dashboard.activeApiKeys")}
            value={String(activeKeyCount)}
            detail={getSettledMessage(apiKeys, t("dashboard.apiKeysListTitle"))}
          />
          <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
        </DashboardSummaryGrid>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.apiKeysListTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>
                {getCountLabel(apiKeyList.length, tablePagination.api_keys)}
              </StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {apiKeyList.length > 0 || tablePagination.api_keys ? (
              <DashboardTableList
                className="xl:grid-cols-[minmax(10rem,0.95fr)_minmax(0,1.2fr)_minmax(12rem,0.95fr)_minmax(10rem,0.85fr)_auto]"
                paginationId="api_keys"
                pagination={tablePagination.api_keys}
                columns={[
                  { label: t("dashboard.name") },
                  { label: t("dashboard.apiKeyId") },
                  { label: t("dashboard.createdAt") },
                  { label: t("dashboard.lastUsedAt") },
                  {
                    label: t("dashboard.actions"),
                    className: "text-right",
                  },
                ]}
              >
                {apiKeyList.map((apiKey) => (
                  <APIKeyRow key={apiKey.id} apiKey={apiKey} t={t} />
                ))}
              </DashboardTableList>
            ) : (
              <DashboardSettledEmptyState
                result={apiKeys}
                emptyMessage={t("dashboard.noApiKeys")}
              />
            )}
          </DashboardPanelContent>
        </Card>

        <DashboardSidebarCard
          title={t("dashboard.createApiKeyTitle")}
          description={workspaceScope.label}
          icon={<KeyRoundIcon className="size-4 text-muted-foreground" />}
        >
          <CreateAPIKeyForm workspaceId={activeWorkspace?.id} />
        </DashboardSidebarCard>
      </div>
    </section>
  );
}

function ProviderSetupsSection({
  t,
  activeWorkspace,
  providerSetups,
  providerSetupList,
  tablePagination,
}: DashboardSectionContentProps) {
  const workspaceScope = getWorkspaceScope(activeWorkspace, t);
  const providerSetupCount = getCountLabel(
    providerSetupList.length,
    tablePagination.provider_setups,
  );

  return (
    <section className="grid gap-3">
      <ModelAccessTabs
        ariaLabel={t("dashboard.providerSetupsTitle")}
        labels={{
          "all-models": t("dashboard.allModelsTab"),
          "add-model": t("dashboard.addModelTab"),
        }}
        allModelsCount={providerSetupCount}
        allModels={
          <Card className="min-w-0">
            <DashboardPanelHeader>
              <CardTitle>{t("dashboard.allModelsTab")}</CardTitle>
              <CardDescription>
                {t("dashboard.providerSetupsDescription")}
              </CardDescription>
            </DashboardPanelHeader>
            <DashboardPanelContent>
              {providerSetups.ok &&
              (providerSetupList.length > 0 ||
                tablePagination.provider_setups) ? (
                <DashboardTableList
                  className="xl:grid-cols-[minmax(6.5rem,0.8fr)_minmax(7rem,0.9fr)_minmax(0,1.1fr)_minmax(7.25rem,0.75fr)_auto]"
                  paginationId="provider_setups"
                  pagination={tablePagination.provider_setups}
                  columns={[
                    { label: t("forms.provider") },
                    { label: t("forms.modelRoute") },
                    { label: t("forms.endpointUrl") },
                    { label: t("dashboard.updatedAt") },
                    {
                      label: t("dashboard.actions"),
                      className: "text-right",
                    },
                  ]}
                >
                  {providerSetupList.map((setup) => (
                    <ProviderSetupRow key={setup.id} setup={setup} t={t} />
                  ))}
                </DashboardTableList>
              ) : (
                <DashboardSettledEmptyState
                  result={providerSetups}
                  emptyMessage={t("dashboard.noProviderSetups")}
                  icon={<BotIcon />}
                />
              )}
            </DashboardPanelContent>
          </Card>
        }
        addModel={
          <DashboardSidebarCard
            title={t("forms.createProviderSetup")}
            description={workspaceScope.label}
            icon={<BotIcon className="size-4 text-muted-foreground" />}
          >
            <CreateProviderSetupForm workspaceId={activeWorkspace?.id} />
          </DashboardSidebarCard>
        }
      />
    </section>
  );
}

type AdvancedResourceSectionOptions = {
  showSummary?: boolean;
  showCreateForm?: boolean;
  showActions?: boolean;
};

function ModelsSection({
  t,
  activeWorkspace,
  modelCatalogs,
  modelCatalogList,
  tablePagination,
  showSummary = true,
  showCreateForm = true,
  showActions = true,
}: DashboardSectionContentProps & AdvancedResourceSectionOptions) {
  const workspaceScope = showCreateForm
    ? getWorkspaceScope(activeWorkspace, t)
    : undefined;
  const activeModelCount = showSummary
    ? modelCatalogList.filter(
        (modelCatalog) => modelCatalog.status === "active",
      ).length
    : 0;

  return (
    <section className="grid gap-3">
      {showSummary ? (
        <Card id="models">
          <DashboardSummaryGrid>
            <DashboardSummaryTile
              icon={<BotIcon className="size-4" />}
              label={t("dashboard.modelsTitle")}
              value={String(activeModelCount)}
              detail={getSettledMessage(
                modelCatalogs,
                t("dashboard.activeModels"),
              )}
            />
            <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
          </DashboardSummaryGrid>
        </Card>
      ) : null}

      <div
        className={
          showCreateForm
            ? "grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]"
            : "grid gap-3"
        }
      >
        <Card className="min-w-0">
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.modelsTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>
                {getCountLabel(
                  modelCatalogList.length,
                  tablePagination.model_catalogs,
                )}
              </StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {modelCatalogs.ok &&
            (modelCatalogList.length > 0 || tablePagination.model_catalogs) ? (
              <DashboardTableList
                className={
                  showActions
                    ? "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto]"
                    : "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)]"
                }
                paginationId="model_catalogs"
                pagination={tablePagination.model_catalogs}
                columns={[
                  { label: t("dashboard.name") },
                  { label: t("forms.provider") },
                  { label: t("dashboard.createdAt") },
                  ...(showActions
                    ? [
                        {
                          label: t("dashboard.actions"),
                          className: "text-right",
                        },
                      ]
                    : []),
                ]}
              >
                {modelCatalogList.map((modelCatalog) => (
                  <ModelCatalogRow
                    key={modelCatalog.id}
                    modelCatalog={modelCatalog}
                    showActions={showActions}
                    t={t}
                  />
                ))}
              </DashboardTableList>
            ) : (
              <DashboardSettledEmptyState
                result={modelCatalogs}
                emptyMessage={t("dashboard.noModels")}
                icon={<BotIcon />}
              />
            )}
          </DashboardPanelContent>
        </Card>

        {showCreateForm ? (
          <DashboardSidebarCard
            title={t("forms.createModel")}
            description={workspaceScope?.label}
            icon={<BotIcon className="size-4 text-muted-foreground" />}
          >
            <CreateModelCatalogForm workspaceId={activeWorkspace?.id} />
          </DashboardSidebarCard>
        ) : null}
      </div>
    </section>
  );
}

function CredentialsSection({
  t,
  activeWorkspace,
  providerCredentials,
  providerCredentialList,
  tablePagination,
  showSummary = true,
  showCreateForm = true,
  showActions = true,
}: DashboardSectionContentProps & AdvancedResourceSectionOptions) {
  const workspaceScope = showCreateForm
    ? getWorkspaceScope(activeWorkspace, t)
    : undefined;
  const activeCredentialCount = showSummary
    ? providerCredentialList.filter(
        (credential) => credential.status === "active",
      ).length
    : 0;

  return (
    <section className="grid gap-3">
      {showSummary ? (
        <Card id="credentials">
          <DashboardSummaryGrid>
            <DashboardSummaryTile
              icon={<KeyRoundIcon className="size-4" />}
              label={t("dashboard.credentialsTitle")}
              value={String(activeCredentialCount)}
              detail={getSettledMessage(
                providerCredentials,
                t("dashboard.credentialsDescription"),
              )}
            />
            <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
          </DashboardSummaryGrid>
        </Card>
      ) : null}

      <div
        className={
          showCreateForm
            ? "grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]"
            : "grid gap-3"
        }
      >
        <Card className="min-w-0">
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.credentialsTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>
                {getCountLabel(
                  providerCredentialList.length,
                  tablePagination.provider_credentials,
                )}
              </StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {providerCredentials.ok &&
            (providerCredentialList.length > 0 ||
              tablePagination.provider_credentials) ? (
              <DashboardTableList
                className={
                  showActions
                    ? "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto]"
                    : "xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)]"
                }
                paginationId="provider_credentials"
                pagination={tablePagination.provider_credentials}
                columns={[
                  { label: t("dashboard.name") },
                  { label: t("forms.provider") },
                  { label: t("dashboard.createdAt") },
                  ...(showActions
                    ? [
                        {
                          label: t("dashboard.actions"),
                          className: "text-right",
                        },
                      ]
                    : []),
                ]}
              >
                {providerCredentialList.map((credential) => (
                  <ProviderCredentialRow
                    key={credential.id}
                    credential={credential}
                    showActions={showActions}
                    t={t}
                  />
                ))}
              </DashboardTableList>
            ) : (
              <DashboardSettledEmptyState
                result={providerCredentials}
                emptyMessage={t("dashboard.noCredentials")}
                icon={<KeyRoundIcon />}
              />
            )}
          </DashboardPanelContent>
        </Card>

        {showCreateForm ? (
          <DashboardSidebarCard
            title={t("forms.createCredential")}
            description={workspaceScope?.label}
            icon={<KeyRoundIcon className="size-4 text-muted-foreground" />}
          >
            <CreateProviderCredentialForm workspaceId={activeWorkspace?.id} />
          </DashboardSidebarCard>
        ) : null}
      </div>
    </section>
  );
}

function DeploymentsSection({
  t,
  activeWorkspace,
  modelDeployments,
  modelDeploymentList,
  modelCatalogList,
  providerCredentialList,
  tablePagination,
  showSummary = true,
  showCreateForm = true,
  showActions = true,
}: DashboardSectionContentProps & AdvancedResourceSectionOptions) {
  const activeModelCatalogList = showCreateForm
    ? modelCatalogList.filter(
        (modelCatalog) => modelCatalog.status === "active",
      )
    : [];
  const activeProviderCredentialList = showCreateForm
    ? providerCredentialList.filter(
        (credential) => credential.status === "active",
      )
    : [];
  const workspaceScope = showCreateForm
    ? getWorkspaceScope(activeWorkspace, t)
    : undefined;
  const activeDeploymentCount = showSummary
    ? modelDeploymentList.filter((deployment) => deployment.status === "active")
        .length
    : 0;

  return (
    <section className="grid gap-3">
      {showSummary ? (
        <Card id="deployments">
          <DashboardSummaryGrid>
            <DashboardSummaryTile
              icon={<ShieldCheckIcon className="size-4" />}
              label={t("dashboard.deploymentsTitle")}
              value={String(activeDeploymentCount)}
              detail={getSettledMessage(
                modelDeployments,
                t("dashboard.deploymentsDescription"),
              )}
            />
            <DashboardWorkspaceScopeTile workspace={activeWorkspace} t={t} />
          </DashboardSummaryGrid>
        </Card>
      ) : null}

      <div
        className={
          showCreateForm
            ? "grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]"
            : "grid gap-3"
        }
      >
        <Card className="min-w-0">
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.deploymentsTitle")}</CardTitle>
            <CardAction>
              <StatusBadge>
                {getCountLabel(
                  modelDeploymentList.length,
                  tablePagination.model_deployments,
                )}
              </StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardPanelContent>
            {modelDeployments.ok &&
            (modelDeploymentList.length > 0 ||
              tablePagination.model_deployments) ? (
              <DashboardTableList
                className={
                  showActions
                    ? "xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.9fr)_minmax(14rem,1fr)_auto]"
                    : "xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.9fr)_minmax(14rem,1fr)]"
                }
                paginationId="model_deployments"
                pagination={tablePagination.model_deployments}
                columns={[
                  { label: t("dashboard.name") },
                  { label: t("forms.model") },
                  { label: t("dashboard.region") },
                  ...(showActions
                    ? [
                        {
                          label: t("dashboard.actions"),
                          className: "text-right",
                        },
                      ]
                    : []),
                ]}
              >
                {modelDeploymentList.map((deployment) => (
                  <ModelDeploymentRow
                    key={deployment.id}
                    deployment={deployment}
                    modelCatalogs={modelCatalogList}
                    providerCredentials={providerCredentialList}
                    showActions={showActions}
                    t={t}
                  />
                ))}
              </DashboardTableList>
            ) : (
              <DashboardSettledEmptyState
                result={modelDeployments}
                emptyMessage={t("dashboard.noDeployments")}
                icon={<ShieldCheckIcon />}
              />
            )}
          </DashboardPanelContent>
        </Card>

        {showCreateForm ? (
          <DashboardSidebarCard
            title={t("forms.createDeployment")}
            description={workspaceScope?.label}
            icon={<ShieldCheckIcon className="size-4 text-muted-foreground" />}
          >
            <CreateModelDeploymentForm
              workspaceId={activeWorkspace?.id}
              modelCatalogs={activeModelCatalogList}
              providerCredentials={activeProviderCredentialList}
            />
          </DashboardSidebarCard>
        ) : null}
      </div>
    </section>
  );
}

function ChatSmokeSection({
  chatSmokeModel,
  chatSmokeBaseUrl,
  apiKeys,
  modelCatalogList,
  modelDeploymentList,
}: DashboardSectionContentProps) {
  const modelSuggestions = [
    ...new Set(
      [
        ...modelDeploymentList
          .filter((deployment) => deployment.status === "active")
          .map((deployment) => deployment.model_canonical_name),
        ...modelCatalogList
          .filter((modelCatalog) => modelCatalog.status === "active")
          .map((modelCatalog) => modelCatalog.canonical_name),
      ].filter(Boolean),
    ),
  ];
  const apiKeyOptions = apiKeys.ok
    ? apiKeys.data.data.filter((apiKey) => apiKey.status === "active")
    : [];

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ChatSmokeTestForm
        defaultModel={chatSmokeModel}
        gatewayBaseUrl={chatSmokeBaseUrl}
        apiKeys={apiKeyOptions}
        modelSuggestions={modelSuggestions}
      />
    </section>
  );
}

type UsageBreakdownItem = {
  key: string;
  label: string;
  requests: number;
  succeeded: number;
  failed: number;
  spend: number;
  tokens: number;
  averageLatencyMS?: number;
  spendShare: number;
};

function buildUsageBreakdown(
  requestLogs: RequestLog[],
  getLabel: (log: RequestLog) => string,
): UsageBreakdownItem[] {
  const totalSpend = sumValues(requestLogs.map((log) => log.spend_usd));
  const buckets = new Map<
    string,
    {
      label: string;
      requests: number;
      succeeded: number;
      failed: number;
      spend: number;
      tokens: number;
      latencyTotal: number;
      latencyCount: number;
    }
  >();

  for (const log of requestLogs) {
    const label = getLabel(log).trim();
    if (!label) {
      continue;
    }

    const current = buckets.get(label) ?? {
      label,
      requests: 0,
      succeeded: 0,
      failed: 0,
      spend: 0,
      tokens: 0,
      latencyTotal: 0,
      latencyCount: 0,
    };

    current.requests += 1;
    current.succeeded += log.status === "succeeded" ? 1 : 0;
    current.failed += log.status === "failed" ? 1 : 0;
    current.spend += parseNumericValue(log.spend_usd);
    current.tokens += log.total_tokens;

    if (typeof log.duration_ms === "number" && Number.isFinite(log.duration_ms)) {
      current.latencyTotal += log.duration_ms;
      current.latencyCount += 1;
    }

    buckets.set(label, current);
  }

  return Array.from(buckets.entries())
    .map(([key, bucket]) => ({
      key,
      label: bucket.label,
      requests: bucket.requests,
      succeeded: bucket.succeeded,
      failed: bucket.failed,
      spend: bucket.spend,
      tokens: bucket.tokens,
      averageLatencyMS:
        bucket.latencyCount > 0 ? bucket.latencyTotal / bucket.latencyCount : undefined,
      spendShare: totalSpend > 0 ? (bucket.spend / totalSpend) * 100 : 0,
    }))
    .sort((left, right) => {
      if (right.spend !== left.spend) {
        return right.spend - left.spend;
      }

      if (right.requests !== left.requests) {
        return right.requests - left.requests;
      }

      return left.label.localeCompare(right.label);
    });
}

function formatOptionalCurrency(
  value: number | undefined,
  fallback: string,
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return formatCurrency(value);
}

function UsageSection({
  t,
  balance,
  dailyUsage,
  requestLogs,
}: DashboardSectionContentProps) {
  const dailyUsageList = dailyUsage.ok
    ? [...dailyUsage.data.data].sort((left, right) =>
        left.usage_date.localeCompare(right.usage_date),
      )
    : [];
  const recentRequestSample = requestLogs.ok
    ? [...requestLogs.data.data].sort(
        (left, right) =>
          getTimestamp(right.completed_at ?? right.request_started_at) -
          getTimestamp(left.completed_at ?? left.request_started_at),
      )
    : [];
  const notSet = t("dashboard.notSet");
  const totalSpend30d = sumValues(dailyUsageList.map((usage) => usage.spend_usd));
  const totalRequests30d = sumValues(
    dailyUsageList.map((usage) => usage.request_count),
  );
  const totalSuccess30d = sumValues(
    dailyUsageList.map((usage) => usage.success_count),
  );
  const totalFailures30d = sumValues(
    dailyUsageList.map((usage) => usage.failure_count),
  );
  const promptTokens30d = sumValues(
    dailyUsageList.map((usage) => usage.prompt_tokens),
  );
  const completionTokens30d = sumValues(
    dailyUsageList.map((usage) => usage.completion_tokens),
  );
  const totalTokens30d = promptTokens30d + completionTokens30d;
  const successRate30d =
    totalRequests30d > 0 ? (totalSuccess30d / totalRequests30d) * 100 : 0;
  const averageCostPerRequest =
    totalRequests30d > 0 ? totalSpend30d / totalRequests30d : undefined;
  const costPerMillionTokens =
    totalTokens30d > 0 ? (totalSpend30d / totalTokens30d) * 1_000_000 : undefined;
  const last7dSpend = sumValues(
    dailyUsageList.slice(-7).map((usage) => usage.spend_usd),
  );
  const previous7dSpend = sumValues(
    dailyUsageList.slice(-14, -7).map((usage) => usage.spend_usd),
  );
  const averageDailySpend =
    dailyUsageList.length > 0 ? totalSpend30d / dailyUsageList.length : undefined;
  const latestDailyRows = [...dailyUsageList].slice(-10).reverse();
  const maxDailySpend = dailyUsageList.reduce((currentMax, usage) => {
    const spend = parseNumericValue(usage.spend_usd);
    return spend > currentMax ? spend : currentMax;
  }, 0);
  let peakUsageDay = dailyUsageList[0];
  for (const usage of dailyUsageList.slice(1)) {
    if (parseNumericValue(usage.spend_usd) > parseNumericValue(peakUsageDay?.spend_usd)) {
      peakUsageDay = usage;
    }
  }

  const sampleCount = recentRequestSample.length;
  const failedSampleLogs = recentRequestSample.filter(
    (log) => log.status !== "succeeded",
  );
  const failedSpendSample = requestLogs.ok
    ? sumValues(failedSampleLogs.map((log) => log.spend_usd))
    : undefined;
  const retriedRequestCount = recentRequestSample.filter(
    (log) => log.attempt_count > 1,
  ).length;
  const retriedRequestShare =
    sampleCount > 0 ? (retriedRequestCount / sampleCount) * 100 : undefined;

  const providerBreakdown = buildUsageBreakdown(
    recentRequestSample,
    (log) =>
      log.model_provider?.trim() || log.latest_attempt?.provider?.trim() || notSet,
  ).slice(0, 5);
  const modelBreakdown = buildUsageBreakdown(
    recentRequestSample,
    (log) => log.model_canonical_name?.trim() || notSet,
  ).slice(0, 5);
  const apiKeyBreakdown = buildUsageBreakdown(
    recentRequestSample,
    (log) => log.api_key_display_name?.trim() || log.api_key_id?.trim() || notSet,
  ).slice(0, 5);
  const endpointBreakdown = buildUsageBreakdown(
    recentRequestSample,
    (log) => log.endpoint?.trim() || notSet,
  ).slice(0, 5);

  return (
    <section className="grid gap-3">
      <Card id="usage">
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.usageOverviewTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.usageOverviewDescription")}
          </CardDescription>
          {sampleCount > 0 ? (
            <CardAction>
              <StatusBadge>
                {t("dashboard.usageSampleCount", {
                  count: formatWholeNumber(sampleCount),
                })}
              </StatusBadge>
            </CardAction>
          ) : null}
        </DashboardPanelHeader>
        <DashboardPanelContent className="grid gap-4">
          <DashboardSummaryGrid className="xl:grid-cols-3">
            <DashboardSummaryTile
              icon={<BadgeDollarSignIcon className="size-4" />}
              label={t("dashboard.usageMonthToDateSpend")}
              value={
                balance.ok
                  ? formatCurrency(parseNumericValue(balance.data.month_to_date_spend_usd))
                  : notSet
              }
              detail={
                balance.ok && balance.data.last_projected_at
                  ? t("dashboard.lastProjectedAt", {
                      time: formatStableTimestamp(balance.data.last_projected_at, notSet),
                    })
                  : getSettledMessage(balance, t("dashboard.monthToDate"))
              }
              size="default"
            />
            <DashboardSummaryTile
              icon={<BadgeDollarSignIcon className="size-4" />}
              label={t("dashboard.usageTrailing30dSpend")}
              value={
                dailyUsage.ok ? formatCurrency(totalSpend30d) : t("dashboard.notSet")
              }
              detail={getSettledMessage(dailyUsage, t("dashboard.last30Days"))}
              size="default"
            />
            <DashboardSummaryTile
              icon={<ActivityIcon className="size-4" />}
              label={t("dashboard.usageThirtyDayRequests")}
              value={
                dailyUsage.ok ? formatWholeNumber(totalRequests30d) : t("dashboard.notSet")
              }
              detail={
                dailyUsage.ok
                  ? t("dashboard.statusSuccessFailure", {
                      success: formatWholeNumber(totalSuccess30d),
                      failure: formatWholeNumber(totalFailures30d),
                    })
                  : dailyUsage.error
              }
              size="default"
            />
            <DashboardSummaryTile
              icon={<UsersRoundIcon className="size-4" />}
              label={t("dashboard.usageThirtyDayTokens")}
              value={
                dailyUsage.ok ? formatWholeNumber(totalTokens30d) : t("dashboard.notSet")
              }
              detail={
                dailyUsage.ok
                  ? t("dashboard.usagePromptCompletionSplit", {
                      prompt: formatWholeNumber(promptTokens30d),
                      completion: formatWholeNumber(completionTokens30d),
                    })
                  : dailyUsage.error
              }
              size="default"
            />
            <DashboardSummaryTile
              icon={<ShieldCheckIcon className="size-4" />}
              label={t("dashboard.usageThirtyDaySuccessRate")}
              value={dailyUsage.ok ? formatPercent(successRate30d) : t("dashboard.notSet")}
              detail={
                dailyUsage.ok
                  ? t("dashboard.usageFailedRequests30d", {
                      count: formatWholeNumber(totalFailures30d),
                    })
                  : dailyUsage.error
              }
              size="default"
            />
            <DashboardSummaryTile
              icon={<GaugeIcon className="size-4" />}
              label={t("dashboard.usageAverageCostPerRequest")}
              value={formatOptionalCurrency(averageCostPerRequest, notSet)}
              detail={t("dashboard.usageCostPerMillionTokens", {
                value: formatOptionalCurrency(costPerMillionTokens, notSet),
              })}
              size="default"
            />
          </DashboardSummaryGrid>

        </DashboardPanelContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.95fr)]">
        <Card>
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.usageDailyTrendTitle")}</CardTitle>
            <CardDescription>
              {t("dashboard.usageDailyTrendDescription")}
            </CardDescription>
            <CardAction>
              <StatusBadge>{t("dashboard.last30Days")}</StatusBadge>
            </CardAction>
          </DashboardPanelHeader>
          <DashboardStackContent>
            {dailyUsage.ok && latestDailyRows.length > 0 ? (
              latestDailyRows.map((usage) => (
                <UsageDailySpendRow
                  key={usage.usage_date}
                  usage={usage}
                  maxSpend={maxDailySpend}
                  t={t}
                />
              ))
            ) : (
              <DashboardSettledEmptyState
                result={dailyUsage}
                emptyMessage={t("dashboard.noDailyUsage")}
              />
            )}
          </DashboardStackContent>
        </Card>

        <Card>
          <DashboardPanelHeader>
            <CardTitle>{t("dashboard.usageSignalsTitle")}</CardTitle>
            <CardDescription>
              {t("dashboard.usageSignalsDescription")}
            </CardDescription>
          </DashboardPanelHeader>
          <DashboardPanelContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <UsageSignalMetric
              label={t("dashboard.usageLast7dSpend")}
              value={dailyUsage.ok ? formatCurrency(last7dSpend) : notSet}
              detail={
                dailyUsage.ok
                  ? t("dashboard.usagePrevious7dSpend", {
                      value: formatCurrency(previous7dSpend),
                    })
                  : dailyUsage.error
              }
            />
            <UsageSignalMetric
              label={t("dashboard.usageAverageDailySpend")}
              value={formatOptionalCurrency(averageDailySpend, notSet)}
              detail={
                dailyUsage.ok && peakUsageDay
                  ? t("dashboard.usagePeakDay", {
                      date: peakUsageDay.usage_date,
                      value: formatCurrency(parseNumericValue(peakUsageDay.spend_usd)),
                    })
                  : getSettledMessage(dailyUsage, notSet)
              }
            />
            <UsageSignalMetric
              label={t("dashboard.usageFailedSpendSample")}
              value={requestLogs.ok ? formatCurrency(failedSpendSample ?? 0) : notSet}
              detail={
                requestLogs.ok
                  ? t("dashboard.usageFailedRequestsSample", {
                      count: formatWholeNumber(failedSampleLogs.length),
                    })
                  : requestLogs.error
              }
            />
            <UsageSignalMetric
              label={t("dashboard.usageRetriedRequestsSample")}
              value={requestLogs.ok ? formatWholeNumber(retriedRequestCount) : notSet}
              detail={
                requestLogs.ok
                  ? t("dashboard.usageRetriedShareSample", {
                      count: formatWholeNumber(retriedRequestCount),
                      share: formatPercent(retriedRequestShare ?? 0),
                    })
                  : requestLogs.error
              }
            />
          </DashboardPanelContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <UsageBreakdownCard
          title={t("dashboard.usageProviderMixTitle")}
          description={t("dashboard.usageProviderMixDescription")}
          result={requestLogs}
          sampleCount={sampleCount}
          items={providerBreakdown}
          t={t}
        />
        <UsageBreakdownCard
          title={t("dashboard.usageModelMixTitle")}
          description={t("dashboard.usageModelMixDescription")}
          result={requestLogs}
          sampleCount={sampleCount}
          items={modelBreakdown}
          t={t}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <UsageBreakdownCard
          title={t("dashboard.usageApiKeyMixTitle")}
          description={t("dashboard.usageApiKeyMixDescription")}
          result={requestLogs}
          sampleCount={sampleCount}
          items={apiKeyBreakdown}
          t={t}
        />
        <UsageBreakdownCard
          title={t("dashboard.usageEndpointMixTitle")}
          description={t("dashboard.usageEndpointMixDescription")}
          result={requestLogs}
          sampleCount={sampleCount}
          items={endpointBreakdown}
          t={t}
        />
      </div>

    </section>
  );
}

function UsageDetailsSection({
  t,
  requestLogs,
  apiKeys,
  tablePagination,
}: DashboardSectionContentProps) {
  const apiKeyList = apiKeys.ok ? apiKeys.data.data : [];

  return (
    <section className="grid gap-3">
      <Card id="usage-details">
        <DashboardPanelHeader>
          <CardTitle>{t("dashboard.usageRequestDetailsTitle")}</CardTitle>
        </DashboardPanelHeader>
        <DashboardPanelContent>
          {requestLogs.ok ? (
            <UsageRequestDetails
              logs={requestLogs.data.data}
              apiKeys={apiKeyList}
              pagination={tablePagination.usage_details}
              paginationId="usage_details"
            />
          ) : (
            <DashboardSettledEmptyState
              result={requestLogs}
              emptyMessage={t("dashboard.noRequestLogs")}
              icon={<ClipboardListIcon />}
            />
          )}
        </DashboardPanelContent>
      </Card>
    </section>
  );
}

function UsageDailySpendRow({
  usage,
  maxSpend,
  t,
}: {
  usage: DailyUsage;
  maxSpend: number;
  t: DashboardSectionContentProps["t"];
}) {
  const spend = parseNumericValue(usage.spend_usd);
  const totalTokens = usage.prompt_tokens + usage.completion_tokens;
  const successRate =
    usage.request_count > 0 ? (usage.success_count / usage.request_count) * 100 : 0;
  const spendBarWidth =
    maxSpend > 0 ? Math.max((spend / maxSpend) * 100, spend > 0 ? 6 : 0) : 0;

  return (
    <div className="rounded-lg border border-border/70 bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <DashboardMonoDetailText className="font-medium text-foreground">
            {usage.usage_date}
          </DashboardMonoDetailText>
          <DashboardDetailText>
            {t("dashboard.usageRequestVolumeDetail", {
              requests: formatWholeNumber(usage.request_count),
              tokens: formatWholeNumber(totalTokens),
            })}
          </DashboardDetailText>
          <DashboardMonoDetailText>
            {t("dashboard.usageDailySuccessSummary", {
              success: formatWholeNumber(usage.success_count),
              failure: formatWholeNumber(usage.failure_count),
              rate: formatPercent(successRate),
            })}
          </DashboardMonoDetailText>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(spend)}
          </div>
        </div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/65"
          style={{ width: `${spendBarWidth}%` }}
        />
      </div>
    </div>
  );
}

function UsageSignalMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
      <div className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
        {value}
      </div>
      <DashboardDetailText className="mt-1">{detail}</DashboardDetailText>
    </div>
  );
}

function UsageBreakdownCard({
  title,
  description,
  result,
  sampleCount,
  items,
  t,
}: {
  title: string;
  description: string;
  result: DashboardSectionContentProps["requestLogs"];
  sampleCount: number;
  items: UsageBreakdownItem[];
  t: DashboardSectionContentProps["t"];
}) {
  return (
    <Card>
      <DashboardPanelHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {sampleCount > 0 ? (
          <CardAction>
            <StatusBadge>
              {t("dashboard.usageSampleCount", {
                count: formatWholeNumber(sampleCount),
              })}
            </StatusBadge>
          </CardAction>
        ) : null}
      </DashboardPanelHeader>
      <DashboardPanelContent>
        {result.ok && items.length > 0 ? (
          <div className="grid gap-2">
            {items.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-border/70 bg-muted/15 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">
                      {item.label}
                    </div>
                    <DashboardDetailText>
                      {t("dashboard.usageRequestVolumeDetail", {
                        requests: formatWholeNumber(item.requests),
                        tokens: formatWholeNumber(item.tokens),
                      })}
                    </DashboardDetailText>
                    <DashboardMonoDetailText>
                      {t("dashboard.usageSuccessRateLatency", {
                        successRate: formatPercent(
                          item.requests > 0
                            ? (item.succeeded / item.requests) * 100
                            : 0,
                        ),
                        latency: formatLatency(item.averageLatencyMS, t("dashboard.notSet")),
                      })}
                    </DashboardMonoDetailText>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(item.spend)}
                    </div>
                    <DashboardMonoDetailText>
                      {formatPercent(item.spendShare)} {t("dashboard.usageSpendShare")}
                    </DashboardMonoDetailText>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/65"
                    style={{
                      width: `${Math.max(
                        item.spendShare,
                        item.spend > 0 ? 6 : 0,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DashboardSettledEmptyState
            result={result}
            emptyMessage={t("dashboard.usageBreakdownEmpty")}
            icon={<ActivityIcon />}
          />
        )}
      </DashboardPanelContent>
    </Card>
  );
}

function RequestLogsSection({
  t,
  activeWorkspace,
  requestLogs,
  providerSetupList,
  tablePagination,
}: DashboardSectionContentProps) {
  return (
    <section className="grid gap-3">
      <Card id="request-logs">
        <DashboardPanelContent>
          {requestLogs.ok ? (
            <RequestLogsTable
              logs={requestLogs.data.data}
              pagination={tablePagination.request_logs}
              providerSetupList={providerSetupList}
              workspaceID={activeWorkspace?.id ?? ""}
              emptyMessage={t("dashboard.noRequestLogs")}
            />
          ) : (
            <DashboardSettledEmptyState
              result={requestLogs}
              emptyMessage={t("dashboard.noRequestLogs")}
            />
          )}
        </DashboardPanelContent>
      </Card>
    </section>
  );
}
