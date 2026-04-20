"use client"

import { LanguagesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n-provider"
import { locales, type Locale } from "@/lib/i18n"

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <div
      className={className}
      role="group"
      aria-label={t("language.label")}
    >
      <div className="inline-flex h-9 items-center rounded-md border bg-background p-1">
        <LanguagesIcon className="mx-2 size-4 text-muted-foreground" />
        {locales.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={locale === item ? "secondary" : "ghost"}
            className="h-7 px-2 text-xs"
            onClick={() => setLocale(item as Locale)}
            aria-pressed={locale === item}
          >
            {t(`language.${item}`)}
          </Button>
        ))}
      </div>
    </div>
  )
}
