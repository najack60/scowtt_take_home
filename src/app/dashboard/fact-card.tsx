"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import type { MovieFact } from "@/lib/api-contracts";
import { FACT_FRESH_MS, isFactInvalidated, isFreshFact, readCachedFact, writeCachedFact } from "@/lib/fact-cache";

export function FactCard({ userId, movie, forceFresh = false, onFactLoaded }: {
  userId: string;
  movie: string;
  forceFresh?: boolean;
  onFactLoaded?: () => void;
}) {
  const client = useQueryClient();
  const forceNew = useRef(forceFresh);
  const query = useQuery<MovieFact>({
    queryKey: ["fact", userId, movie],
    staleTime: (query) => query.state.data
      ? Math.max(0, Date.parse(query.state.data.createdAt) + FACT_FRESH_MS - query.state.dataUpdatedAt)
      : 0,
    queryFn: async ({ signal }) => {
      const refresh = forceNew.current || isFactInvalidated(userId, movie);
      forceNew.current = false;
      if (!refresh) {
        const cached = readCachedFact(userId, movie);
        if (cached) return cached;
      }

      try {
        const existing = refresh ? null : (await api.fact(userId, signal)).fact;
        signal.throwIfAborted();
        if (existing && existing.movie !== movie) {
          void client.invalidateQueries({ queryKey: ["me", userId] });
          throw new ApiError("Your movie changed. Please try again.");
        }
        const fact = existing && isFreshFact(existing, movie)
          ? existing
          : (await api.generateFact(userId, signal)).fact;
        signal.throwIfAborted();
        if (!fact || fact.movie !== movie) {
          void client.invalidateQueries({ queryKey: ["me", userId] });
          throw new ApiError("Your movie changed. Please try again.");
        }
        writeCachedFact(userId, fact);
        return fact;
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 409)) {
          void client.invalidateQueries({ queryKey: ["me", userId] });
        }
        throw error;
      }
    },
  });

  useEffect(() => {
    if (query.data) onFactLoaded?.();
  }, [query.data, onFactLoaded]);

  function refresh() {
    forceNew.current = true;
    void query.refetch({ cancelRefetch: true });
  }

  return (
    <section aria-labelledby="fact-title" className="rounded-3xl border border-amber-400/20 bg-amber-400/[0.06] p-7 sm:p-9">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-2xl text-amber-400">✦</span>
        <h2 id="fact-title" className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">A little movie trivia</h2>
      </div>
      <div aria-live="polite" className="mt-6 min-h-20">
        {query.isPending && <p className="text-stone-400">Finding your fact...</p>}
        {query.data && <p className="text-xl leading-relaxed text-stone-100">{query.data.content}</p>}
        {query.isError && <p role="alert" className="mt-3 text-rose-300">{query.error.message}</p>}
        {!query.isPending && !query.data && !query.isError && <p className="text-stone-400">No fact available yet.</p>}
        {!query.isPending && (
          <button onClick={refresh} disabled={query.isFetching} className="mt-4 rounded-lg border border-stone-600 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60">
            {query.isFetching ? "Finding your fact..." : query.isError ? "Try again" : "Get a new fact"}
          </button>
        )}
      </div>
      <p className="mt-6 text-xs text-stone-500">AI-generated trivia may be inaccurate.</p>
    </section>
  );
}
