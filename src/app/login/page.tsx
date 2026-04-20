import { LoginForm } from "@/components/login-form"
import { PublicPageHeader } from "@/components/public-page-header"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full flex-col">
      <PublicPageHeader
        titleKey="auth.signInTitle"
        descriptionKey="auth.signInDescription"
      />
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
