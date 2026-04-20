"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useI18n } from "@/components/i18n-provider"

export function PublicPageHeader({
  titleKey,
  descriptionKey,
}: {
  titleKey: string
  descriptionKey?: string
}) {
  const { t } = useI18n()

  return (
    <header className="flex h-16 shrink-0 items-center">
      <div className="flex w-full min-w-0 items-center justify-between gap-3 px-4 md:px-6">
        <div className="min-w-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">GatewayLLM</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{t(titleKey)}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {descriptionKey ? (
            <div className="truncate text-xs leading-tight text-muted-foreground">
              {t(descriptionKey)}
            </div>
          ) : null}
        </div>
        <LanguageSwitcher className="shrink-0" />
      </div>
    </header>
  )
}
