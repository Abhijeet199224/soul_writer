import { CheckEmailPanel } from "@/components/auth/CheckEmailPanel";

interface CheckEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const { email } = await searchParams;

  if (!email) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fff7ed,_#f5f5f4_55%)] px-6 py-12">
        <p className="text-sm text-stone-600">Missing email address.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fff7ed,_#f5f5f4_55%)] px-6 py-12">
      <CheckEmailPanel email={decodeURIComponent(email)} />
    </main>
  );
}
