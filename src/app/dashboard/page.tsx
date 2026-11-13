import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/current-user";
import { FactCard } from "./fact-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.favoriteMovie === null) redirect("/onboarding");

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <Brand />
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}>
          <button className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-300 transition hover:border-stone-500 hover:text-white">
            Log out
          </button>
        </form>
      </header>
      <div className="mx-auto max-w-3xl py-20">
        <div className="flex items-center gap-4">
          {user.image ? (
            // Google profile photos are hosted on a user-specific external URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-stone-800 text-xl text-amber-400">
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{user.name || "Movie fan"}</p>
            <p className="truncate text-sm text-stone-400">{user.email || "Email unavailable"}</p>
          </div>
        </div>
        <p className="mt-14 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Your favorite movie
        </p>
        <h1 className="mt-3 break-words text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {user.favoriteMovie}
        </h1>
        <div className="mt-10"><FactCard /></div>
      </div>
    </main>
  );
}
