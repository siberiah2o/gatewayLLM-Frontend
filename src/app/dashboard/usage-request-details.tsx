"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { APIKey, RequestLog } from "@/lib/gatewayllm";
import { cn } from "@/lib/utils";
import type { DashboardPaginationState } from "./dashboard-pagination";
import { DashboardTablePagination } from "./dashboard-table-pagination";
import {
  DashboardDetailText,
  DashboardMonoDetailText,
  StatusBadge,
  localizeValue,
} from "./dashboard-ui";

const USAGE_REQUEST_DETAILS_GRID_CLASS =
  "xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_minmax(0,0.65fr)_minmax(0,0.85fr)]";
const REQUEST_LOG_API_KEY_PARAM = "api_key_id";
const REQUEST_LOG_USER_PARAM = "user";

export function UsageRequestDetails({
  logs,
  apiKeys,
  pagination,
  paginationId,
}: {
  logs: RequestLog[];
  apiKeys: APIKey[];
  pagination?: DashboardPaginationState;
  paginationId: string;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [apiKeyInput, setAPIKeyInput] = useState("__all__");
  const [userInput, setUserInput] = useState("");
  const appliedApiKeyID = searchParams.get(REQUEST_LOG_API_KEY_PARAM) ?? "";
  const appliedUser = searchParams.get(REQUEST_LOG_USER_PARAM) ?? "";
  const hasActiveFilters = Boolean(appliedApiKeyID || appliedUser);
  const currentPageSpend = logs.reduce(
    (sum, log) => sum + parseSpendUSD(log.spend_usd),
    0,
  );
  const apiKeyOptions = useMemo(
    () => buildAPIKeyOptions(apiKeys, logs, appliedApiKeyID, t),
    [apiKeys, appliedApiKeyID, logs, t],
  );

  useEffect(() => {
    setAPIKeyInput(appliedApiKeyID || "__all__");
    setUserInput(appliedUser);
  }, [appliedApiKeyID, appliedUser]);

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams(searchParams);
    syncUsageDetailParam(
      params,
      REQUEST_LOG_API_KEY_PARAM,
      apiKeyInput === "__all__" ? "" : apiKeyInput,
    );
    syncUsageDetailParam(params, REQUEST_LOG_USER_PARAM, userInput);
    params.delete(`${paginationId}_page`);

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  function clearFilters() {
    setAPIKeyInput("__all__");
    setUserInput("");

    const params = new URLSearchParams(searchParams);
    params.delete(REQUEST_LOG_API_KEY_PARAM);
    params.delete(REQUEST_LOG_USER_PARAM);
    params.delete(`${paginationId}_page`);

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="grid gap-3">
      <form
        className="flex min-w-0 flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 p-2.5 md:flex-row md:items-center"
        onSubmit={submitFilters}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
          <Select
            value={apiKeyInput}
            onValueChange={(value) => setAPIKeyInput(value ?? "__all__")}
          >
            <SelectTrigger size="sm" className="h-8 w-full text-xs sm:w-72 sm:text-sm">
              <SelectValue placeholder={t("dashboard.apiKey")} />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="__all__">{t("dashboard.allApiKeys")}</SelectItem>
              {apiKeyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
            className="h-8 w-full min-w-0 flex-1 text-xs sm:text-sm"
            placeholder={t("dashboard.usageRequestDetailsUserFilterPlaceholder")}
            aria-label={t("dashboard.usageRequestDetailsUserFilterPlaceholder")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 md:ml-auto md:justify-end">
          <StatusBadge>
            {t("dashboard.resultCount")} {formatWholeNumber(logs.length)}
          </StatusBadge>
          <StatusBadge>
            {t("dashboard.spend")} {formatSpendUSD(currentPageSpend)}
          </StatusBadge>
          <Button type="submit" size="sm" className="h-8 px-3">
            {t("actions.apply")}
          </Button>
          {hasActiveFilters || apiKeyInput !== "__all__" || userInput ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={clearFilters}
            >
              {t("actions.clear")}
            </Button>
          ) : null}
        </div>
      </form>

      <div
        className={cn(
          "hidden min-w-0 overflow-hidden gap-2.5 px-[13px] text-[0.72rem] font-medium text-muted-foreground xl:grid",
          USAGE_REQUEST_DETAILS_GRID_CLASS,
        )}
      >
        <div className="min-w-0 truncate">{t("dashboard.requestUID")}</div>
        <div className="min-w-0 truncate">{t("dashboard.user")}</div>
        <div className="min-w-0 truncate">{t("dashboard.apiKey")}</div>
        <div className="min-w-0 truncate">{t("nav.status")}</div>
        <div className="min-w-0 truncate">{t("dashboard.totalTokens")}</div>
        <div className="min-w-0 truncate">{t("dashboard.spend")}</div>
        <div className="min-w-0 truncate">{t("dashboard.requestStartedAt")}</div>
      </div>

      {logs.length > 0 ? (
        <DashboardTablePagination
          paginationId={paginationId}
          pagination={pagination}
        >
          {logs.map((log) => (
            <div
              key={log.id}
              className={cn(
                "grid min-w-0 overflow-hidden gap-2.5 rounded-lg border border-border/70 bg-background p-3 xl:items-center",
                USAGE_REQUEST_DETAILS_GRID_CLASS,
              )}
            >
              <div className="min-w-0">
                <MobileLabel>{t("dashboard.requestUID")}</MobileLabel>
                <div className="truncate font-mono text-xs font-medium text-foreground/90">
                  {log.request_uid}
                </div>
                <DashboardDetailText className="mt-1 truncate">
                  {log.model_canonical_name?.trim() || t("dashboard.notSet")}
                </DashboardDetailText>
                <DashboardMonoDetailText className="mt-1">
                  {log.endpoint}
                </DashboardMonoDetailText>
              </div>

              <div className="min-w-0">
                <MobileLabel>{t("dashboard.user")}</MobileLabel>
                <div className="truncate text-sm font-medium text-foreground">
                  {getRequestOwnerLabel(log, t)}
                </div>
                {log.api_key_owner_user_id ? (
                  <DashboardMonoDetailText className="mt-1 truncate">
                    {log.api_key_owner_user_id}
                  </DashboardMonoDetailText>
                ) : null}
              </div>

              <div className="min-w-0">
                <MobileLabel>{t("dashboard.apiKey")}</MobileLabel>
                <div className="truncate text-sm font-medium text-foreground">
                  {getAPIKeyLabel(log, t)}
                </div>
                {log.api_key_id ? (
                  <DashboardMonoDetailText className="mt-1 truncate">
                    {log.api_key_id}
                  </DashboardMonoDetailText>
                ) : null}
              </div>

              <div className="min-w-0">
                <MobileLabel>{t("nav.status")}</MobileLabel>
                <StatusBadge>{localizeValue(t, log.status)}</StatusBadge>
              </div>

              <div className="min-w-0">
                <MobileLabel>{t("dashboard.totalTokens")}</MobileLabel>
                <div className="truncate font-mono text-xs tabular-nums text-foreground">
                  {formatWholeNumber(log.total_tokens)}
                </div>
              </div>

              <div className="min-w-0">
                <MobileLabel>{t("dashboard.spend")}</MobileLabel>
                <div className="truncate font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatSpendUSD(log.spend_usd)}
                </div>
              </div>

              <div className="min-w-0">
                <MobileLabel>{t("dashboard.requestStartedAt")}</MobileLabel>
                <DashboardMonoDetailText>
                  {formatTimestamp(log.request_started_at, t("dashboard.notSet"))}
                </DashboardMonoDetailText>
              </div>
            </div>
          ))}
        </DashboardTablePagination>
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
          {hasActiveFilters
            ? t("dashboard.usageRequestDetailsNoMatches")
            : t("dashboard.noRequestLogs")}
        </div>
      )}
    </div>
  );
}

function MobileLabel({ children }: { children: string }) {
  return (
    <div className="mb-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-muted-foreground xl:hidden">
      {children}
    </div>
  );
}

function buildAPIKeyOptions(
  apiKeys: APIKey[],
  logs: RequestLog[],
  appliedApiKeyID: string,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  const options = new Map<string, string>();

  for (const apiKey of apiKeys) {
    const label =
      apiKey.display_name?.trim() && apiKey.id
        ? `${apiKey.display_name} · ${apiKey.id}`
        : apiKey.display_name?.trim() || apiKey.id;
    if (apiKey.id) {
      options.set(apiKey.id, label || apiKey.id);
    }
  }

  for (const log of logs) {
    const apiKeyID = log.api_key_id?.trim();
    if (!apiKeyID || options.has(apiKeyID)) {
      continue;
    }
    options.set(apiKeyID, getAPIKeyLabel(log, t));
  }

  if (appliedApiKeyID && !options.has(appliedApiKeyID)) {
    options.set(appliedApiKeyID, appliedApiKeyID);
  }

  return Array.from(options.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function getAPIKeyLabel(
  log: RequestLog,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  const apiKeyDisplayName = log.api_key_display_name?.trim();
  const apiKeyID = log.api_key_id?.trim();

  if (apiKeyDisplayName && apiKeyID && apiKeyDisplayName !== apiKeyID) {
    return `${apiKeyDisplayName} · ${apiKeyID}`;
  }

  return apiKeyDisplayName || apiKeyID || t("dashboard.notSet");
}

function getRequestOwnerLabel(
  log: RequestLog,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  return (
    log.api_key_owner_name?.trim() ||
    log.api_key_owner_user_id?.trim() ||
    t("dashboard.notSet")
  );
}

function formatWholeNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function parseSpendUSD(value: string | number | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatSpendUSD(value: string | number | undefined) {
  const parsed = parseSpendUSD(value);
  const fractionDigits =
    parsed > 0 && parsed < 0.01 ? 6 : parsed > 0 && parsed < 1 ? 4 : 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 6,
  }).format(parsed);
}

function formatTimestamp(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

function syncUsageDetailParam(
  params: URLSearchParams,
  key: string,
  value: string,
) {
  const trimmed = value.trim();
  if (trimmed) {
    params.set(key, trimmed);
    return;
  }

  params.delete(key);
}
