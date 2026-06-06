import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

function LoginFallback() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-amber-200/60 bg-white/80 p-8 text-center text-sm text-stone-500">
      Loading...
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fff7ed,_#f5f5f4_55%)] px-6 py-12">
      <Suspense fallback={<LoginFallback />}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
