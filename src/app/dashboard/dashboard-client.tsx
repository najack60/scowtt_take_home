"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { UserProfile } from "@/lib/api-contracts";
import { markFactInvalidated } from "@/lib/fact-cache";
import { validateMovie } from "@/lib/movie";
import { FactCard } from "./fact-card";

export function DashboardClient({ initialUser }: { initialUser: UserProfile }) {
  const client = useQueryClient();
  const userKey = ["me", initialUser.id] as const;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialUser.favoriteMovie ?? "");
  const [formError, setFormError] = useState("");
  const [changedMovie, setChangedMovie] = useState<string | null>(null);
  const userQuery = useQuery({
    queryKey: userKey,
    queryFn: async ({ signal }) => {
      const profile = await api.me(signal);
      if (profile.id !== initialUser.id) throw new ApiError("Your session has changed. Please reload.", 409);
      return profile;
    },
    initialData: initialUser,
    staleTime: 30_000,
  });
  const user = userQuery.data;

  const mutation = useMutation({
    mutationFn: (movie: string) => api.updateMovie(movie, initialUser.id),
    onMutate: async (movie) => {
      await Promise.all([
        client.cancelQueries({ queryKey: userKey }),
        client.cancelQueries({ queryKey: ["fact", initialUser.id] }),
      ]);
      const previous = client.getQueryData<UserProfile>(userKey);
      client.setQueryData<UserProfile>(userKey, (current) =>
        current ? { ...current, favoriteMovie: movie } : current,
      );
      return { previous };
    },
    onError: (error, _movie, context) => {
      if (context?.previous) client.setQueryData(userKey, context.previous);
      setEditing(true);
      setFormError(error.message);
      if (error instanceof ApiError && (error.status === 401 || error.status === 409)) {
        void client.invalidateQueries({ queryKey: userKey });
      }
    },
    onSuccess: (updated, _movie, context) => {
      if (updated.id !== initialUser.id) {
        if (context?.previous) client.setQueryData(userKey, context.previous);
        setEditing(true);
        setFormError("The server returned an invalid profile.");
        return;
      }
      if (updated.favoriteMovie !== context?.previous?.favoriteMovie) {
        if (updated.favoriteMovie) {
          markFactInvalidated(initialUser.id, updated.favoriteMovie);
          setChangedMovie(updated.favoriteMovie);
        }
        client.removeQueries({ queryKey: ["fact", initialUser.id] });
      }
      client.setQueryData(userKey, updated);
      setDraft(updated.favoriteMovie ?? "");
    },
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateMovie(draft);
    if ("error" in result) {
      setFormError(result.error);
      return;
    }
    setFormError("");
    setEditing(false);
    mutation.mutate(result.movie);
  }

  if (userQuery.error instanceof ApiError && (userQuery.error.status === 401 || userQuery.error.status === 409)) {
    return <p role="alert" className="text-rose-300">{userQuery.error.message}</p>;
  }

  return (
    <>
      <div className="flex items-center gap-4">
        {user.image ? (
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
      {userQuery.isError && <p role="alert" className="mt-4 text-sm text-rose-300">{userQuery.error.message}</p>}
      <p className="mt-14 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Your favorite movie</p>
      <h1 className="mt-3 break-words text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        {user.favoriteMovie || "No movie selected"}
      </h1>
      {mutation.isPending && <p aria-live="polite" className="mt-2 text-sm text-stone-400">Saving...</p>}
      {editing ? (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label htmlFor="edit-movie" className="block text-sm font-medium text-stone-200">Movie title</label>
          <input
            id="edit-movie"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={100}
            required
            autoFocus
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? "edit-movie-error" : undefined}
            className="w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white focus:border-amber-400"
          />
          {formError && <p id="edit-movie-error" role="alert" className="text-sm text-rose-300">{formError}</p>}
          <div className="flex gap-3">
            <button type="submit" className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-stone-950">Save</button>
            <button type="button" onClick={() => { setEditing(false); setDraft(user.favoriteMovie ?? ""); setFormError(""); }} className="rounded-lg border border-stone-600 px-4 py-2 text-white">Cancel</button>
          </div>
        </form>
      ) : (
        <button disabled={mutation.isPending} onClick={() => { setDraft(user.favoriteMovie ?? ""); setFormError(""); setEditing(true); }} className="mt-5 rounded-lg border border-stone-600 px-4 py-2 text-sm text-white disabled:opacity-60">
          Edit movie
        </button>
      )}
      <div className="mt-10">
        {mutation.isPending ? (
          <p className="text-stone-400">Updating your movie...</p>
        ) : user.favoriteMovie ? (
          <FactCard
            userId={user.id}
            movie={user.favoriteMovie}
            forceFresh={changedMovie === user.favoriteMovie}
            onFactLoaded={() => setChangedMovie(null)}
          />
        ) : (
          <p className="text-stone-400">Choose a movie to get a fact.</p>
        )}
      </div>
    </>
  );
}
