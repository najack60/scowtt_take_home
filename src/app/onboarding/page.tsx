import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { MovieForm } from "./movie-form";
import { Brand } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.favoriteMovie !== null) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
      <Brand />
      <div className="flex flex-1 items-center justify-center py-16">
        <section className="w-full max-w-lg rounded-3xl border border-stone-800 bg-stone-900/80 p-8 shadow-2xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            One quick question
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            What&apos;s your favorite movie?
          </h1>
          <p className="mt-4 leading-7 text-stone-400">
            Tell us the film you love and we&apos;ll find something fun to share about it.
          </p>
          <MovieForm />
        </section>
      </div>
    </main>
  );
}
