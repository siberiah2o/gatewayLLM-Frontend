"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_TIME_RANGE_OPTIONS,
  DASHBOARD_TIME_RANGE_END_PARAM,
  DASHBOARD_TIME_RANGE_PARAM,
  DASHBOARD_TIME_RANGE_START_PARAM,
  type DashboardTimeRange,
} from "./dashboard-time-range";

const PAGINATION_PAGE_SUFFIX = "_page";

export function DashboardTimeRangeControl({
  timeRange,
  className,
}: {
  timeRange: DashboardTimeRange;
  className?: string;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectRange(nextValue: DashboardTimeRange["value"]) {
    const params = new URLSearchParams(searchParams);
    params.set(DASHBOARD_TIME_RANGE_PARAM, nextValue);
    if (nextValue === "custom") {
      params.set(DASHBOARD_TIME_RANGE_START_PARAM, timeRange.startDate);
      params.set(DASHBOARD_TIME_RANGE_END_PARAM, timeRange.endDateInclusive);
    } else {
      params.delete(DASHBOARD_TIME_RANGE_START_PARAM);
      params.delete(DASHBOARD_TIME_RANGE_END_PARAM);
    }

    replaceWithParams(params);
  }

  function selectCustomDate(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    params.set(DASHBOARD_TIME_RANGE_PARAM, "custom");
    params.set(DASHBOARD_TIME_RANGE_START_PARAM, timeRange.startDate);
    params.set(DASHBOARD_TIME_RANGE_END_PARAM, timeRange.endDateInclusive);
    if (value) {
      params.set(key, value);
    }

    replaceWithParams(params);
  }

  function replaceWithParams(params: URLSearchParams) {
    for (const key of Array.from(params.keys())) {
      if (key.endsWith(PAGINATION_PAGE_SUFFIX)) {
        params.delete(key);
      }
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap gap-1 rounded-md border border-border/70 bg-background p-1",
        className,
      )}
      aria-label={t("dashboard.timeRange")}
    >
      {DASHBOARD_TIME_RANGE_OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="xs"
          variant={timeRange.value === option.value ? "secondary" : "ghost"}
          aria-pressed={timeRange.value === option.value}
          className="h-6 rounded-[6px] px-2"
          onClick={() => {
            selectRange(option.value);
          }}
        >
          {t(option.labelKey)}
        </Button>
      ))}
      {timeRange.value === "custom" ? (
        <div className="flex min-w-0 flex-wrap gap-1">
          <Input
            type="date"
            value={timeRange.startDate}
            aria-label={t("dashboard.startDate")}
            className="h-6 w-32 px-2 text-xs"
            onChange={(event) => {
              selectCustomDate(
                DASHBOARD_TIME_RANGE_START_PARAM,
                event.target.value,
              );
            }}
          />
          <Input
            type="date"
            value={timeRange.endDateInclusive}
            aria-label={t("dashboard.endDate")}
            className="h-6 w-32 px-2 text-xs"
            onChange={(event) => {
              selectCustomDate(
                DASHBOARD_TIME_RANGE_END_PARAM,
                event.target.value,
              );
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
