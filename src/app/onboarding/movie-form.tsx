"use client";

import { useActionState } from "react";
import { saveMovie, type OnboardingState } from "./actions";

const initialState: OnboardingState = {};

export function MovieForm() {
  const [state, formAction, pending] = useActionState(saveMovie, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="movie" className="block text-sm font-medium text-stone-200">
          Movie title
        </label>
        <input
          id="movie"
          name="movie"
          type="text"
          defaultValue={state.value}
          required
          autoFocus
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "movie-error" : "movie-hint"}
          placeholder="e.g. The Grand Budapest Hotel"
          className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none placeholder:text-stone-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        />
        <p id="movie-hint" className="mt-2 text-sm text-stone-400">
          Up to 100 characters.
        </p>
        {state.error && (
          <p id="movie-error" role="alert" className="mt-2 text-sm text-rose-300">
            {state.error}
          </p>
        )}
      </div>
      <button
        disabled={pending}
        className="w-full rounded-xl bg-amber-400 px-5 py-3 font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : "Continue to dashboard"}
      </button>
    </form>
  );
}
