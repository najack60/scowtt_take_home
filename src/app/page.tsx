import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect(user.favoriteMovie === null ? "/onboarding" : "/dashboard");

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col overflow-hidden px-6 py-8">
      <Brand />
      <div className="grid flex-1 items-center gap-12 py-20 md:grid-cols-2">
        <section className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-400">
            For the films that stay with you
          </p>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">
            Your favorite film, a little more interesting.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-stone-400">
            Pick a movie you love. We&apos;ll bring you a little piece of trivia
            to make your next rewatch even better.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
            className="mt-9"
          >
            <button className="inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3.5 font-semibold text-stone-950 transition hover:bg-stone-200">
              <span aria-hidden="true" className="font-bold text-blue-600">G</span>
              Sign in with Google
            </button>
          </form>
          <p className="mt-4 text-sm text-stone-500">A small delight for movie people.</p>
        </section>
        <div aria-hidden="true" className="hidden justify-center md:flex">
          <div className="relative w-full max-w-sm rotate-3 rounded-[2rem] border border-stone-700 bg-gradient-to-br from-stone-800 to-stone-950 p-7 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-700 pb-5 text-xs uppercase tracking-[0.2em] text-stone-400">
              <span>Movie Notes</span>
              <span>01 / 01</span>
            </div>
            <div className="grid aspect-[4/5] place-items-center">
              <span className="text-[10rem] leading-none text-amber-400">✦</span>
            </div>
            <div className="border-t border-stone-700 pt-5 text-sm text-stone-400">
              A little trivia. A lot of movie magic.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
