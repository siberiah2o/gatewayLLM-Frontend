import { SignupForm } from "@/components/signup-form"
import { PublicPageHeader } from "@/components/public-page-header"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full flex-col">
      <PublicPageHeader
        titleKey="auth.requestAccessTitle"
        descriptionKey="auth.requestAccessDescription"
      />
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
