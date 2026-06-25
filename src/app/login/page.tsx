import { LoginForm } from "@/app/login/LoginForm";
import { LoginRedirect } from "@/app/login/LoginRedirect";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { siteConfig } from "@/config/site";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F7F9] px-4">
      <LoginRedirect />
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo height={72} />
          <h1 className="mt-4 text-xl font-bold text-gray-900">Admin sign in</h1>
          <p className="mt-1 text-sm text-gray-500">{siteConfig.description}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
