import type { DashboardSearchParams } from "./dashboard-pagination";

export const DASHBOARD_TIME_RANGE_PARAM = "time_range";
export const DASHBOARD_TIME_RANGE_START_PARAM = "start_date";
export const DASHBOARD_TIME_RANGE_END_PARAM = "end_date";

export const DASHBOARD_TIME_RANGE_OPTIONS = [
  {
    value: "7d",
    labelKey: "dashboard.last7Days",
  },
  {
    value: "30d",
    labelKey: "dashboard.last30Days",
  },
  {
    value: "month",
    labelKey: "dashboard.thisMonth",
  },
  {
    value: "custom",
    labelKey: "dashboard.customRange",
  },
] as const;

export type DashboardTimeRangeValue =
  (typeof DASHBOARD_TIME_RANGE_OPTIONS)[number]["value"];

export type DashboardTimeRange = {
  value: DashboardTimeRangeValue;
  labelKey: (typeof DASHBOARD_TIME_RANGE_OPTIONS)[number]["labelKey"];
  days: number;
  lookbackDays: number;
  startDate: string;
  endDate: string;
  endDateInclusive: string;
  recentWindowStartDate: string;
  comparisonStartDate: string;
  startedAfter: string;
  startedBefore: string;
};

export function parseDashboardTimeRange(
  searchParams: DashboardSearchParams | undefined,
) {
  const value = normalizeDashboardTimeRangeValue(
    readSearchParam(searchParams, DASHBOARD_TIME_RANGE_PARAM),
  );

  return resolveDashboardTimeRange(value, {
    customStartDate: readSearchParam(
      searchParams,
      DASHBOARD_TIME_RANGE_START_PARAM,
    ),
    customEndDate: readSearchParam(searchParams, DASHBOARD_TIME_RANGE_END_PARAM),
  });
}

export function resolveDashboardTimeRange(
  value: DashboardTimeRangeValue,
  options: {
    now?: Date;
    customStartDate?: string;
    customEndDate?: string;
  } = {},
): DashboardTimeRange {
  const now = options.now ?? new Date();
  const endDate = startOfUTCDay(now);
  const fallbackStartDate = addUTCDays(endDate, -29);
  let startDate =
    value === "month"
      ? new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1))
      : addUTCDays(endDate, value === "7d" ? -6 : -29);
  let endDateInclusive = endDate;

  if (value === "custom") {
    const customStartDate =
      parseUTCDate(options.customStartDate) ?? fallbackStartDate;
    const customEndDate = parseUTCDate(options.customEndDate) ?? endDate;

    if (customStartDate <= customEndDate) {
      startDate = customStartDate;
      endDateInclusive = customEndDate;
    } else {
      startDate = customEndDate;
      endDateInclusive = customStartDate;
    }
  }

  const exclusiveRangeEndDate = addUTCDays(endDateInclusive, 1);
  const recentWindowStartDate = addUTCDays(exclusiveRangeEndDate, -7);
  const comparisonStartDate = addUTCDays(exclusiveRangeEndDate, -14);
  const lookbackStartDate =
    comparisonStartDate < startDate ? comparisonStartDate : startDate;
  const days = Math.max(1, differenceInUTCDays(startDate, exclusiveRangeEndDate));
  const lookbackDays = Math.max(
    1,
    differenceInUTCDays(lookbackStartDate, addUTCDays(endDate, 1)),
  );
  const option =
    DASHBOARD_TIME_RANGE_OPTIONS.find((item) => item.value === value) ??
    DASHBOARD_TIME_RANGE_OPTIONS[1];

  return {
    value,
    labelKey: option.labelKey,
    days,
    lookbackDays,
    startDate: formatUTCDate(startDate),
    endDate: formatUTCDate(exclusiveRangeEndDate),
    endDateInclusive: formatUTCDate(endDateInclusive),
    recentWindowStartDate: formatUTCDate(recentWindowStartDate),
    comparisonStartDate: formatUTCDate(comparisonStartDate),
    startedAfter: startDate.toISOString(),
    startedBefore: exclusiveRangeEndDate.toISOString(),
  };
}

export function normalizeDashboardTimeRangeValue(
  value: string | undefined,
): DashboardTimeRangeValue {
  return DASHBOARD_TIME_RANGE_OPTIONS.some((option) => option.value === value)
    ? (value as DashboardTimeRangeValue)
    : "30d";
}

function readSearchParam(
  searchParams: DashboardSearchParams | undefined,
  key: string,
) {
  const value = searchParams?.[key];

  return Array.isArray(value) ? value[0] : value;
}

function startOfUTCDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUTCDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function parseUTCDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || formatUTCDate(date) !== value
    ? undefined
    : date;
}

function differenceInUTCDays(startDate: Date, endDate: Date) {
  return Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
}

function formatUTCDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
