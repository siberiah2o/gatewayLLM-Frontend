"use client"

import { type ComponentProps, type ReactElement, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/components/i18n-provider"
import { normalizeLocale, translateKnownError } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export type DashboardTranslator = ReturnType<typeof useI18n>["t"]

type ErrorPayload = {
  error?: {
    message?: string
  }
}

type DashboardSelectOption = {
  label: string
  value: string
}

export function DashboardFormSelect({
  id,
  name,
  label,
  options,
  defaultValue,
  disabled,
  required,
  size = "default",
  labelClassName,
  triggerClassName,
}: {
  id: string
  name: string
  label: string
  options: DashboardSelectOption[]
  defaultValue?: string
  disabled?: boolean
  required?: boolean
  size?: "default" | "sm"
  labelClassName?: string
  triggerClassName?: string
}) {
  const labelId = `${id}-label`
  const selectKey = `${id}:${defaultValue ?? "__empty__"}`

  return (
    <>
      <FieldLabel id={labelId} className={labelClassName}>
        {label}
      </FieldLabel>
      <Select
        key={selectKey}
        name={name}
        items={options}
        defaultValue={defaultValue ?? null}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger
          id={id}
          aria-labelledby={labelId}
          size={size}
          className={cn("w-full", triggerClassName)}
        >
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  )
}

export function memberRoleOptions(t: ReturnType<typeof useI18n>["t"]) {
  return [
    { value: "member", label: t("values.member") },
    { value: "admin", label: t("values.admin") },
  ]
}

export function activeStatusOptions(t: ReturnType<typeof useI18n>["t"]) {
  return [
    { value: "active", label: t("values.active") },
    { value: "inactive", label: t("values.inactive") },
  ]
}

export function emailVerificationOptions(t: ReturnType<typeof useI18n>["t"]) {
  return [
    { value: "true", label: t("dashboard.verified") },
    { value: "false", label: t("dashboard.unverified") },
  ]
}

export async function responseError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as ErrorPayload | null

  return translateKnownError(
    activeClientLocale(),
    payload?.error?.message,
    fallback
  )
}

export function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function activeClientLocale() {
  if (typeof document === "undefined") {
    return "en"
  }

  const cookieLocale = document.cookie
    .split("; ")
    .find((item) => item.startsWith("NEXT_LOCALE="))
    ?.split("=")[1]

  return normalizeLocale(
    cookieLocale ?? document.documentElement.lang ?? navigator.language
  )
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  trigger,
  triggerRender,
  title,
  description,
  confirmLabel,
  confirmVariant,
  confirmDisabled,
  cancelLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  triggerRender: ReactElement
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: ComponentProps<typeof Button>["variant"]
  confirmDisabled?: boolean
  cancelLabel: string
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={triggerRender}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {cancelLabel}
          </DialogClose>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
