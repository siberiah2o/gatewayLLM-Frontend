import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { DashboardSection } from "./dashboard-routes"
import {
  DashboardActionCluster,
  DashboardPanelContent,
  DashboardPanelHeader,
  DashboardRow,
  DashboardStackContent,
  DashboardSummaryGrid,
} from "./dashboard-ui"

export function DashboardSectionSkeleton({
  section,
}: {
  section: DashboardSection
}) {
  switch (section) {
    case "status":
      return <StatusSectionSkeleton />
    case "usage":
      return <UsageSectionSkeleton />
    case "logs":
      return <RequestLogsSectionSkeleton />
    case "workspaces":
      return <WorkspacesSectionSkeleton />
    case "account":
      return <AccountSectionSkeleton />
    case "users":
      return <UsersSectionSkeleton />
    case "members":
      return <MembersSectionSkeleton />
    case "registration":
      return <RegistrationSectionSkeleton />
    case "api-keys":
      return <ApiKeysSectionSkeleton />
    case "provider-setups":
      return <ProviderSetupsSectionSkeleton />
    case "models":
      return <ModelsSectionSkeleton />
    case "credentials":
      return <CredentialsSectionSkeleton />
    case "deployments":
      return <DeploymentsSectionSkeleton />
    case "chat-smoke":
      return <ChatSmokeSectionSkeleton />
  }
}

function StatusSectionSkeleton() {
  return (
    <section className="grid auto-rows-min gap-4 md:grid-cols-3 xl:grid-cols-7">
      {Array.from({ length: 7 }).map((_, index) => (
        <MetricCardSkeleton key={index} />
      ))}
    </section>
  )
}

function WorkspacesSectionSkeleton() {
  return (
    <section className="grid gap-3">
      <Card id="workspaces">
        <PanelHeaderSkeleton
          titleWidth="w-28"
          descriptionWidth="w-56"
          actionWidth={null}
        />
        <DashboardStackContent>
          <InlineFormSkeleton fields={2} buttonWidth="w-28" />
          {Array.from({ length: 3 }).map((_, index) => (
            <DashboardRow
              key={index}
              className="gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center"
            >
              <PrimaryBlockSkeleton
                titleWidth="w-40"
                detailWidths={["w-48"]}
              />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-14 rounded-md" />
                <Skeleton className="h-4 w-10" />
              </div>
            </DashboardRow>
          ))}
        </DashboardStackContent>
      </Card>
    </section>
  )
}

function ProviderSetupsSectionSkeleton() {
  return (
    <section className="grid gap-3">
      <SummaryCardSkeleton count={2} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Card>
          <PanelHeaderSkeleton titleWidth="w-40" />
          <DashboardPanelContent>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <DashboardRow
                  key={index}
                  className="gap-3 p-3 xl:grid-cols-[minmax(10rem,0.8fr)_minmax(12rem,1fr)_minmax(14rem,1.1fr)_minmax(12rem,0.9fr)_minmax(10rem,0.8fr)_auto]"
                >
                  <PrimaryBlockSkeleton
                    titleWidth="w-24"
                    detailWidths={["w-36"]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-32"
                    detailWidths={["w-28"]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-44"
                    detailWidths={["w-20"]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-28"
                    detailWidths={["w-18"]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-24"
                    detailWidths={[]}
                  />
                  <ActionClusterSkeleton widths={["w-20", "w-20"]} />
                </DashboardRow>
              ))}
            </div>
          </DashboardPanelContent>
        </Card>

        <SidebarCardSkeleton
          titleWidth="w-36"
          descriptionWidth="w-24"
          fields={8}
        />
      </div>
    </section>
  )
}

function AccountSectionSkeleton() {
  return (
    <section className="grid gap-4">
      <SummaryCardSkeleton count={2} size="default" />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <PanelHeaderSkeleton
            titleWidth="w-36"
            descriptionWidth="w-40"
            actionWidth={null}
          />
          <DashboardPanelContent>
            <div className="flex flex-col">
              {Array.from({ length: 3 }).map((_, index) => (
                <AccountDetailSkeleton key={index} />
              ))}
            </div>
          </DashboardPanelContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <PanelHeaderSkeleton
              titleWidth="w-32"
              descriptionWidth={null}
              actionWidth={null}
            />
            <DashboardPanelContent>
              <div className="flex flex-col">
                {Array.from({ length: 2 }).map((_, index) => (
                  <AccountDetailSkeleton key={index} />
                ))}
              </div>
            </DashboardPanelContent>
          </Card>

          <Card>
            <PanelHeaderSkeleton
              titleWidth="w-32"
              descriptionWidth={null}
              actionWidth={null}
            />
            <DashboardPanelContent>
              <div className="flex flex-col">
                {Array.from({ length: 2 }).map((_, index) => (
                  <AccountDetailSkeleton key={index} />
                ))}
              </div>
            </DashboardPanelContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function UsersSectionSkeleton() {
  return (
    <section className="grid gap-3">
      <SummaryCardSkeleton count={2} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <PanelHeaderSkeleton titleWidth="w-24" />
          <DashboardPanelContent>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <DashboardRow
                  key={index}
                  className="gap-3 p-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(14rem,1.1fr)_minmax(10rem,0.8fr)_auto]"
                >
                  <PrimaryBlockSkeleton
                    titleWidth="w-32"
                    detailWidths={["w-48"]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-44"
                    detailWidths={["w-32"]}
                  />
                  <BadgeClusterSkeleton widths={["w-16", "w-24"]} />
                  <ActionClusterSkeleton widths={["w-20", "w-20"]} />
                </DashboardRow>
              ))}
            </div>
          </DashboardPanelContent>
        </Card>

        <SidebarCardSkeleton
          titleWidth="w-28"
          descriptionWidth="w-32"
          fields={3}
        />
      </div>
    </section>
  )
}

function MembersSectionSkeleton() {
  return (
    <section className="grid gap-3">
      <SummaryCardSkeleton count={2} />

      <Card>
        <PanelHeaderSkeleton titleWidth="w-28" />
        <DashboardPanelContent>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <DashboardRow
                key={index}
                className="gap-3 p-3 xl:grid-cols-[minmax(12rem,1fr)_5rem_minmax(12rem,0.7fr)_minmax(26rem,1fr)]"
              >
                <PrimaryBlockSkeleton
                  titleWidth="w-32"
                  detailWidths={["w-44", "w-36"]}
                />
                <BadgeClusterSkeleton widths={["w-10"]} />
                <BadgeClusterSkeleton widths={["w-14", "w-28"]} />
                <ActionClusterSkeleton
                  widths={["w-20", "w-20", "w-14", "w-24", "w-14"]}
                />
              </DashboardRow>
            ))}
          </div>
        </DashboardPanelContent>
      </Card>
    </section>
  )
}

function RegistrationSectionSkeleton() {
  return (
    <section className="grid gap-3">
      <SummaryCardSkeleton count={2} />

      <Card>
        <PanelHeaderSkeleton titleWidth="w-36" />
        <DashboardPanelContent>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <DashboardRow
                key={index}
                className="gap-3 p-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(0,1fr)_minmax(12rem,0.8fr)_auto]"
              >
                <PrimaryBlockSkeleton
                  titleWidth="w-32"
                  detailWidths={["w-44"]}
                />
                <PrimaryBlockSkeleton
                  titleWidth="w-48"
                  detailWidths={[]}
                />
                <PrimaryBlockSkeleton
                  titleWidth="w-36"
                  detailWidths={[]}
                />
                <ActionClusterSkeleton widths={["w-20", "w-20"]} />
              </DashboardRow>
            ))}
          </div>
        </DashboardPanelContent>
      </Card>
    </section>
  )
}

function ApiKeysSectionSkeleton() {
  return (
    <section className="grid gap-3">
      <SummaryCardSkeleton count={2} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <PanelHeaderSkeleton titleWidth="w-36" />
          <DashboardPanelContent>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <DashboardRow
                  key={index}
                  className="gap-3 p-3 xl:grid-cols-[minmax(10rem,0.95fr)_minmax(0,1.2fr)_minmax(12rem,0.95fr)_minmax(10rem,0.85fr)_auto]"
                >
                  <PrimaryBlockSkeleton
                    titleWidth="w-28"
                    detailWidths={["w-36"]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-44"
                    detailWidths={[]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-36"
                    detailWidths={[]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-28"
                    detailWidths={[]}
                  />
                  <ActionClusterSkeleton widths={["w-16", "w-20"]} />
                </DashboardRow>
              ))}
            </div>
          </DashboardPanelContent>
        </Card>

        <SidebarCardSkeleton
          titleWidth="w-32"
          descriptionWidth="w-32"
          fields={2}
        />
      </div>
    </section>
  )
}

function ModelsSectionSkeleton() {
  return (
    <section className="grid gap-3">
      <SummaryCardSkeleton count={2} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Card>
          <PanelHeaderSkeleton titleWidth="w-28" />
          <DashboardPanelContent>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <DashboardRow
                  key={index}
                  className="gap-3 p-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto]"
                >
                  <PrimaryBlockSkeleton
                    titleWidth="w-36"
                    detailWidths={["w-44"]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-24"
                    detailWidths={[]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-36"
                    detailWidths={[]}
                  />
                  <ActionClusterSkeleton widths={["w-20", "w-20"]} />
                </DashboardRow>
              ))}
            </div>
          </DashboardPanelContent>
        </Card>

        <SidebarCardSkeleton
          titleWidth="w-28"
          descriptionWidth="w-32"
          fields={4}
        />
      </div>
    </section>
  )
}

function CredentialsSectionSkeleton() {
  return (
    <section className="grid gap-3">
      <SummaryCardSkeleton count={2} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Card>
          <PanelHeaderSkeleton titleWidth="w-36" />
          <DashboardPanelContent>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <DashboardRow
                  key={index}
                  className="gap-3 p-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,0.8fr)_auto]"
                >
                  <PrimaryBlockSkeleton
                    titleWidth="w-36"
                    detailWidths={["w-44"]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-24"
                    detailWidths={[]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-36"
                    detailWidths={[]}
                  />
                  <ActionClusterSkeleton widths={["w-20", "w-20"]} />
                </DashboardRow>
              ))}
            </div>
          </DashboardPanelContent>
        </Card>

        <SidebarCardSkeleton
          titleWidth="w-40"
          descriptionWidth="w-32"
          fields={4}
        />
      </div>
    </section>
  )
}

function DeploymentsSectionSkeleton() {
  return (
    <section className="grid gap-3">
      <SummaryCardSkeleton count={2} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Card>
          <PanelHeaderSkeleton titleWidth="w-36" />
          <DashboardPanelContent>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <DashboardRow
                  key={index}
                  className="gap-3 p-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.9fr)_minmax(14rem,1fr)_auto]"
                >
                  <PrimaryBlockSkeleton
                    titleWidth="w-36"
                    detailWidths={["w-44"]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-32"
                    detailWidths={[]}
                  />
                  <PrimaryBlockSkeleton
                    titleWidth="w-28"
                    detailWidths={["w-40"]}
                  />
                  <ActionClusterSkeleton widths={["w-20", "w-20"]} />
                </DashboardRow>
              ))}
            </div>
          </DashboardPanelContent>
        </Card>

        <SidebarCardSkeleton
          titleWidth="w-36"
          descriptionWidth="w-32"
          fields={4}
        />
      </div>
    </section>
  )
}

function ChatSmokeSectionSkeleton() {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid h-full min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[19rem_minmax(0,1fr)]">
        <Card
          size="sm"
          className="min-h-0 border-border/70 bg-card shadow-xs xl:h-full xl:overflow-hidden"
        >
          <CardHeader className="shrink-0 border-b bg-muted/20">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden py-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg border bg-background/70 p-3 shadow-xs"
              >
                <div className="mb-3 flex gap-2.5">
                  <Skeleton className="size-7 rounded-md" />
                  <div className="grid flex-1 gap-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="grid gap-3">
                  <FieldSkeleton
                    labelWidth="w-20"
                    controlClassName="h-8 w-full"
                  />
                  <FieldSkeleton
                    labelWidth="w-24"
                    controlClassName="h-8 w-full"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="min-h-0 flex-1 border-border/70 bg-card shadow-xs xl:h-full xl:overflow-hidden">
          <CardHeader className="shrink-0 border-b bg-background">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-64 max-w-full" />
            <CardAction className="flex gap-2">
              <Skeleton className="h-7 w-20 rounded-lg" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </CardAction>
            <div className="col-span-full flex gap-2 pt-1">
              <Skeleton className="h-6 w-32 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden px-0">
            <div className="min-h-0 flex-1 bg-muted/10 px-4 py-4 sm:px-6">
              <div className="mx-auto grid h-full max-w-2xl place-items-center">
                <div className="grid justify-items-center gap-3">
                  <Skeleton className="size-10 rounded-xl" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-72 max-w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <div className="shrink-0 border-t bg-background/95 px-4 py-3 sm:px-6">
              <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border bg-card shadow-xs">
                <div className="flex items-end gap-2 p-3">
                  <Skeleton className="h-11 flex-1 rounded-md" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
                <div className="flex justify-between border-t bg-muted/20 px-3 py-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function UsageSectionSkeleton() {
  return (
    <section className="grid gap-3">
      <Card id="usage">
        <PanelHeaderSkeleton
          titleWidth="w-36"
          descriptionWidth="w-64"
          actionWidth={null}
        />
        <DashboardStackContent>
          {Array.from({ length: 6 }).map((_, index) => (
            <DashboardRow
              key={index}
              className="gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center"
            >
              <PrimaryBlockSkeleton
                titleWidth="w-28"
                detailWidths={["w-52"]}
              />
              <Skeleton className="h-4 w-16 md:justify-self-end" />
            </DashboardRow>
          ))}
        </DashboardStackContent>
      </Card>
    </section>
  )
}

function RequestLogsSectionSkeleton() {
  return (
    <section className="grid gap-3">
      <Card id="request-logs">
        <PanelHeaderSkeleton
          titleWidth="w-36"
          descriptionWidth="w-72"
          actionWidth={null}
        />
        <DashboardStackContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <DashboardRow
              key={index}
              className="gap-3 p-3 xl:grid-cols-[minmax(13rem,1.2fr)_minmax(10rem,0.8fr)_minmax(9rem,0.7fr)_minmax(8rem,0.6fr)_minmax(8rem,0.7fr)_auto]"
            >
              <PrimaryBlockSkeleton
                titleWidth="w-40"
                detailWidths={["w-52"]}
              />
              <PrimaryBlockSkeleton
                titleWidth="w-32"
                detailWidths={["w-28"]}
              />
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-4 w-20" />
              <PrimaryBlockSkeleton
                titleWidth="w-20"
                detailWidths={["w-28"]}
              />
              <Skeleton className="h-7 w-16 xl:justify-self-end" />
            </DashboardRow>
          ))}
        </DashboardStackContent>
      </Card>
    </section>
  )
}

function MetricCardSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-14" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  )
}

function SummaryCardSkeleton({
  count,
  size = "compact",
}: {
  count: number
  size?: "compact" | "default"
}) {
  return (
    <Card>
      <DashboardSummaryGrid>
        {Array.from({ length: count }).map((_, index) => (
          <SummaryTileSkeleton key={index} size={size} />
        ))}
      </DashboardSummaryGrid>
    </Card>
  )
}

function SummaryTileSkeleton({
  size = "compact",
}: {
  size?: "compact" | "default"
}) {
  const isDefault = size === "default"

  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 rounded-md bg-muted/50",
        isDefault
          ? "grid-cols-[2rem_minmax(0,1fr)] p-3"
          : "grid-cols-[1.75rem_minmax(0,1fr)] p-2"
      )}
    >
      <Skeleton className={cn(isDefault ? "size-8" : "size-7", "rounded-md")} />
      <div className="min-w-0">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className={cn("max-w-full", isDefault ? "h-6 w-40" : "h-5 w-32")} />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </div>
  )
}

function PanelHeaderSkeleton({
  titleWidth,
  descriptionWidth = "w-40",
  actionWidth = "w-10",
}: {
  titleWidth: string
  descriptionWidth?: string | null
  actionWidth?: string | null
}) {
  return (
    <DashboardPanelHeader>
      <CardTitle>
        <Skeleton className={cn("h-5", titleWidth)} />
      </CardTitle>
      {descriptionWidth ? (
        <CardDescription>
          <Skeleton className={cn("h-4", descriptionWidth)} />
        </CardDescription>
      ) : null}
      {actionWidth ? (
        <CardAction>
          <Skeleton className={cn("h-5 rounded-md", actionWidth)} />
        </CardAction>
      ) : null}
    </DashboardPanelHeader>
  )
}

function SidebarCardSkeleton({
  titleWidth,
  descriptionWidth,
  fields,
}: {
  titleWidth: string
  descriptionWidth: string
  fields: number
}) {
  return (
    <Card>
      <PanelHeaderSkeleton
        titleWidth={titleWidth}
        descriptionWidth={descriptionWidth}
        actionWidth={null}
      />
      <DashboardStackContent>
        <InlineFormSkeleton fields={fields} buttonWidth="w-28" />
      </DashboardStackContent>
    </Card>
  )
}

function InlineFormSkeleton({
  fields,
  buttonWidth,
}: {
  fields: number
  buttonWidth: string
}) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: fields }).map((_, index) => (
        <FieldSkeleton
          key={index}
          labelWidth={index % 2 === 0 ? "w-20" : "w-24"}
          controlClassName="h-10 w-full"
        />
      ))}
      <div className="flex items-center gap-2">
        <Skeleton className={cn("h-9", buttonWidth)} />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  )
}

function FieldSkeleton({
  labelWidth,
  controlClassName,
}: {
  labelWidth: string
  controlClassName: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className={cn("h-3", labelWidth)} />
      <Skeleton className={controlClassName} />
    </div>
  )
}

function PrimaryBlockSkeleton({
  titleWidth,
  detailWidths,
}: {
  titleWidth: string
  detailWidths: string[]
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-1.5">
        <Skeleton className={cn("h-5 max-w-full", titleWidth)} />
        {detailWidths.map((width) => (
          <Skeleton key={width} className={cn("h-3 max-w-full", width)} />
        ))}
      </div>
    </div>
  )
}

function BadgeClusterSkeleton({
  widths,
}: {
  widths: string[]
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {widths.map((width) => (
        <Skeleton key={width} className={cn("h-5 rounded-md", width)} />
      ))}
    </div>
  )
}

function ActionClusterSkeleton({
  widths,
}: {
  widths: string[]
}) {
  return (
    <div className="xl:justify-self-end">
      <DashboardActionCluster>
        {widths.map((width, index) => (
          <Skeleton key={`${width}-${index}`} className={cn("h-8 rounded-md", width)} />
        ))}
      </DashboardActionCluster>
    </div>
  )
}

function AccountDetailSkeleton() {
  return (
    <div className="grid min-h-14 grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 border-b py-3 last:border-b-0">
      <Skeleton className="size-8 rounded-md" />
      <div className="min-w-0">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-36 max-w-full" />
        </div>
      </div>
    </div>
  )
}
