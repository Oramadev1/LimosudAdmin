import { LoginForm } from "@/app/login/LoginForm";
import { siteConfig } from "@/config/site";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F7F9] px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold text-[#3563E9]">{siteConfig.brand}</p>
          <h1 className="mt-2 text-xl font-bold text-gray-900">Admin sign in</h1>
          <p className="mt-1 text-sm text-gray-500">{siteConfig.description}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
