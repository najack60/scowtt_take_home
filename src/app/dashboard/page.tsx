import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardClient } from "./dashboard-client";
import { LogoutForm } from "./logout-form";
import { QueryProvider } from "./query-provider";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.favoriteMovie === null) redirect("/onboarding");

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <Brand />
        <LogoutForm userId={user.id} signOut={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }} />
      </header>
      <div className="mx-auto max-w-3xl py-20">
        <QueryProvider><DashboardClient initialUser={user} /></QueryProvider>
      </div>
    </main>
  );
}
