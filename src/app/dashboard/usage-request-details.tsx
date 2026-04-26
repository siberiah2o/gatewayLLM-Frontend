"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { APIKey, RequestLog, WorkspaceDepartment } from "@/lib/gatewayllm";
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
  "xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.95fr)_minmax(0,0.5fr)_minmax(0,0.5fr)_minmax(0,0.6fr)_minmax(0,0.75fr)]";
const REQUEST_LOG_API_KEY_PARAM = "api_key_id";
const REQUEST_LOG_USER_PARAM = "user";
const REQUEST_LOG_DEPARTMENT_PARAM = "department_id";

export function UsageRequestDetails({
  logs,
  apiKeys,
  departments,
  workspaceID,
  pagination,
  paginationId,
}: {
  logs: RequestLog[];
  apiKeys: APIKey[];
  departments: WorkspaceDepartment[];
  workspaceID: string;
  pagination?: DashboardPaginationState;
  paginationId: string;
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const appliedApiKeyID = searchParams.get(REQUEST_LOG_API_KEY_PARAM) ?? "";
  const appliedUser = searchParams.get(REQUEST_LOG_USER_PARAM) ?? "";
  const appliedDepartmentID =
    searchParams.get(REQUEST_LOG_DEPARTMENT_PARAM) ?? "";
  const hasActiveFilters = Boolean(
    appliedApiKeyID || appliedUser || appliedDepartmentID,
  );
  const currentPageSpend = logs.reduce(
    (sum, log) => sum + parseSpendUSD(log.spend_usd),
    0,
  );
  const apiKeyOptions = useMemo(
    () => buildAPIKeyOptions(apiKeys, logs, appliedApiKeyID, t),
    [apiKeys, appliedApiKeyID, logs, t],
  );
  const departmentOptions = useMemo(
    () => buildDepartmentOptions(departments, logs, appliedDepartmentID),
    [appliedDepartmentID, departments, logs],
  );

  return (
    <div className="grid gap-2">
      <UsageRequestDetailsFilters
        key={`${appliedApiKeyID}:${appliedUser}:${appliedDepartmentID}`}
        appliedApiKeyID={appliedApiKeyID}
        appliedUser={appliedUser}
        appliedDepartmentID={appliedDepartmentID}
        apiKeyOptions={apiKeyOptions}
        departmentOptions={departmentOptions}
        currentPageSpend={currentPageSpend}
        resultCount={logs.length}
        workspaceID={workspaceID}
        paginationId={paginationId}
      />

      <div
        className={cn(
          "hidden min-w-0 overflow-hidden gap-2 px-2.5 text-xs font-medium text-muted-foreground xl:grid",
          USAGE_REQUEST_DETAILS_GRID_CLASS,
        )}
      >
        <div className="min-w-0 truncate">{t("dashboard.requestUID")}</div>
        <div className="min-w-0 truncate">{t("dashboard.user")}</div>
        <div className="min-w-0 truncate">{t("dashboard.department")}</div>
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
                "grid min-w-0 overflow-hidden gap-2 rounded-md border border-border/70 bg-background p-2 xl:items-center",
                USAGE_REQUEST_DETAILS_GRID_CLASS,
              )}
            >
              <div className="min-w-0">
                <MobileLabel>{t("dashboard.requestUID")}</MobileLabel>
                <div className="truncate font-mono text-xs font-medium text-foreground/90">
                  {log.request_uid}
                </div>
                <DashboardDetailText className="mt-0.5 truncate">
                  {log.model_canonical_name?.trim() || t("dashboard.notSet")}
                </DashboardDetailText>
                <DashboardMonoDetailText className="mt-0.5">
                  {log.endpoint}
                </DashboardMonoDetailText>
              </div>

              <div className="min-w-0">
                <MobileLabel>{t("dashboard.user")}</MobileLabel>
                <div className="truncate text-sm font-medium text-foreground">
                  {getRequestOwnerLabel(log, t)}
                </div>
                {log.api_key_owner_user_id ? (
                  <DashboardMonoDetailText className="mt-0.5 truncate">
                    {log.api_key_owner_user_id}
                  </DashboardMonoDetailText>
                ) : null}
              </div>

              <div className="min-w-0">
                <MobileLabel>{t("dashboard.department")}</MobileLabel>
                <div className="truncate text-sm font-medium text-foreground">
                  {getRequestDepartmentLabel(log, t)}
                </div>
                {log.department_id ? (
                  <DashboardMonoDetailText className="mt-0.5 truncate">
                    {log.department_id}
                  </DashboardMonoDetailText>
                ) : null}
              </div>

              <div className="min-w-0">
                <MobileLabel>{t("dashboard.apiKey")}</MobileLabel>
                <div className="truncate text-sm font-medium text-foreground">
                  {getAPIKeyLabel(log, t)}
                </div>
                {log.api_key_id ? (
                  <DashboardMonoDetailText className="mt-0.5 truncate">
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
        <div className="rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground">
          {hasActiveFilters
            ? t("dashboard.usageRequestDetailsNoMatches")
            : t("dashboard.noRequestLogs")}
        </div>
      )}
    </div>
  );
}

function UsageRequestDetailsFilters({
  appliedApiKeyID,
  appliedUser,
  appliedDepartmentID,
  apiKeyOptions,
  departmentOptions,
  currentPageSpend,
  resultCount,
  workspaceID,
  paginationId,
}: {
  appliedApiKeyID: string;
  appliedUser: string;
  appliedDepartmentID: string;
  apiKeyOptions: Array<{ value: string; label: string }>;
  departmentOptions: Array<{ value: string; label: string }>;
  currentPageSpend: number;
  resultCount: number;
  workspaceID: string;
  paginationId: string;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [apiKeyInput, setAPIKeyInput] = useState(appliedApiKeyID || "__all__");
  const [userInput, setUserInput] = useState(appliedUser);
  const [departmentInput, setDepartmentInput] = useState(
    appliedDepartmentID || "__all__",
  );
  const hasFilters = Boolean(
    appliedApiKeyID ||
      appliedUser ||
      appliedDepartmentID ||
      apiKeyInput !== "__all__" ||
      userInput ||
      departmentInput !== "__all__",
  );
  const csvExportHref = buildUsageDetailsExportHref({
    workspaceID,
    format: "csv",
    apiKeyID: apiKeyInput,
    user: userInput,
    departmentID: departmentInput,
  });
  const xlsxExportHref = buildUsageDetailsExportHref({
    workspaceID,
    format: "xlsx",
    apiKeyID: apiKeyInput,
    user: userInput,
    departmentID: departmentInput,
  });

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams(searchParams);
    syncUsageDetailParam(
      params,
      REQUEST_LOG_API_KEY_PARAM,
      apiKeyInput === "__all__" ? "" : apiKeyInput,
    );
    syncUsageDetailParam(params, REQUEST_LOG_USER_PARAM, userInput);
    syncUsageDetailParam(
      params,
      REQUEST_LOG_DEPARTMENT_PARAM,
      departmentInput === "__all__" ? "" : departmentInput,
    );
    params.delete(`${paginationId}_page`);

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  function clearFilters() {
    setAPIKeyInput("__all__");
    setUserInput("");
    setDepartmentInput("__all__");

    const params = new URLSearchParams(searchParams);
    params.delete(REQUEST_LOG_API_KEY_PARAM);
    params.delete(REQUEST_LOG_USER_PARAM);
    params.delete(REQUEST_LOG_DEPARTMENT_PARAM);
    params.delete(`${paginationId}_page`);

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border/70 bg-muted/20 p-2 md:flex-row md:items-center"
      onSubmit={submitFilters}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:flex-row lg:items-center">
        <Select
          value={apiKeyInput}
          onValueChange={(value) => setAPIKeyInput(value ?? "__all__")}
        >
          <SelectTrigger size="sm" className="h-7 w-full text-xs sm:w-64">
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

        <Select
          value={departmentInput}
          onValueChange={(value) => setDepartmentInput(value ?? "__all__")}
        >
          <SelectTrigger size="sm" className="h-7 w-full text-xs sm:w-56">
            <SelectValue placeholder={t("dashboard.department")} />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="__all__">
              {t("dashboard.allDepartments")}
            </SelectItem>
            {departmentOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={userInput}
          onChange={(event) => setUserInput(event.target.value)}
          className="h-7 w-full min-w-0 flex-1 text-xs"
          placeholder={t("dashboard.usageRequestDetailsUserFilterPlaceholder")}
          aria-label={t("dashboard.usageRequestDetailsUserFilterPlaceholder")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 md:ml-auto md:justify-end">
        <StatusBadge>
          {t("dashboard.resultCount")} {formatWholeNumber(resultCount)}
        </StatusBadge>
        <StatusBadge>
          {t("dashboard.spend")} {formatSpendUSD(currentPageSpend)}
        </StatusBadge>
        {csvExportHref ? (
          <a
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-7 px-2.5"
            )}
            href={csvExportHref}
          >
            {t("dashboard.downloadCSV")}
          </a>
        ) : null}
        {xlsxExportHref ? (
          <a
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-7 px-2.5"
            )}
            href={xlsxExportHref}
          >
            {t("dashboard.downloadXLSX")}
          </a>
        ) : null}
        <Button type="submit" size="sm" className="h-7 px-2.5">
          {t("actions.apply")}
        </Button>
        {hasFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5"
            onClick={clearFilters}
          >
            {t("actions.clear")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function buildUsageDetailsExportHref({
  workspaceID,
  format,
  apiKeyID,
  user,
  departmentID,
}: {
  workspaceID: string;
  format: "csv" | "xlsx";
  apiKeyID: string;
  user: string;
  departmentID: string;
}) {
  const trimmedWorkspaceID = workspaceID.trim();
  if (!trimmedWorkspaceID) {
    return undefined;
  }

  const params = new URLSearchParams({
    workspace_id: trimmedWorkspaceID,
    format,
  });
  const normalizedAPIKeyID = apiKeyID === "__all__" ? "" : apiKeyID.trim();
  const normalizedUser = user.trim();
  const normalizedDepartmentID =
    departmentID === "__all__" ? "" : departmentID.trim();

  if (normalizedAPIKeyID) {
    params.set(REQUEST_LOG_API_KEY_PARAM, normalizedAPIKeyID);
  }
  if (normalizedUser) {
    params.set(REQUEST_LOG_USER_PARAM, normalizedUser);
  }
  if (normalizedDepartmentID) {
    params.set(REQUEST_LOG_DEPARTMENT_PARAM, normalizedDepartmentID);
  }

  return `/api/control/request-logs/export?${params.toString()}`;
}

function buildDepartmentOptions(
  departments: WorkspaceDepartment[],
  logs: RequestLog[],
  appliedDepartmentID: string,
) {
  const options = new Map<string, string>();

  for (const department of departments) {
    options.set(department.id, department.name || department.id);
  }

  for (const log of logs) {
    const departmentID = log.department_id?.trim();
    if (!departmentID || options.has(departmentID)) {
      continue;
    }
    options.set(departmentID, getRequestDepartmentLabel(log, () => "Unassigned"));
  }

  if (appliedDepartmentID && !options.has(appliedDepartmentID)) {
    options.set(appliedDepartmentID, appliedDepartmentID);
  }

  return Array.from(options.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function MobileLabel({ children }: { children: string }) {
  return (
    <div className="mb-1 text-xs font-medium uppercase text-muted-foreground xl:hidden">
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
  const ownerName = log.api_key_owner_name?.trim();
  const ownerEmail = log.api_key_owner_email?.trim();
  const ownerID = log.api_key_owner_user_id?.trim();
  const apiKeyDisplayName = log.api_key_display_name?.trim();
  const apiKeyID = log.api_key_id?.trim();
  const apiKeyLabel =
    apiKeyDisplayName && apiKeyID && apiKeyDisplayName !== apiKeyID
      ? `${apiKeyDisplayName} (${apiKeyID})`
      : apiKeyDisplayName || apiKeyID;
  const labelParts = [ownerName, ownerEmail || ownerID, apiKeyLabel].filter(
    (part): part is string => Boolean(part),
  );

  return labelParts.length > 0 ? labelParts.join(" -> ") : t("dashboard.notSet");
}

function getRequestOwnerLabel(
  log: RequestLog,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  return (
    log.api_key_owner_name?.trim() ||
    log.api_key_owner_email?.trim() ||
    log.api_key_owner_user_id?.trim() ||
    t("dashboard.notSet")
  );
}

function getRequestDepartmentLabel(
  log: RequestLog,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  return (
    log.department_name?.trim() ||
    log.department_id?.trim() ||
    t("dashboard.noDepartment")
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
