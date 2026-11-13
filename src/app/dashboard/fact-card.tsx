"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FactState =
  | { status: "loading" }
  | { status: "success"; content: string }
  | { status: "error"; message: string };

export function FactCard() {
  const [state, setState] = useState<FactState>({ status: "loading" });
  const started = useRef(false);

  const loadFact = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/facts", { method: "POST" });
      if (!response.ok) throw new Error("Fact request failed");
      const data: unknown = await response.json();
      if (
        typeof data !== "object" ||
        data === null ||
        !("content" in data) ||
        typeof data.content !== "string" ||
        !data.content.trim()
      ) {
        throw new Error("Invalid fact response");
      }
      setState({ status: "success", content: data.content });
    } catch (error) {
      console.error("Could not load movie fact:", error);
      setState({ status: "error", message: "Couldn't get a fact right now. Please try again." });
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void loadFact();
  }, [loadFact]);

  return (
    <section aria-labelledby="fact-title" className="rounded-3xl border border-amber-400/20 bg-amber-400/[0.06] p-7 sm:p-9">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-2xl text-amber-400">✦</span>
        <h2 id="fact-title" className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
          A little movie trivia
        </h2>
      </div>
      <div aria-live="polite" className="mt-6 min-h-20">
        {state.status === "loading" && <p className="text-stone-400">Finding your fact...</p>}
        {state.status === "success" && (
          <p className="text-xl leading-relaxed text-stone-100">{state.content}</p>
        )}
        {state.status === "error" && (
          <div>
            <p className="text-rose-300">{state.message}</p>
            <button
              onClick={() => void loadFact()}
              className="mt-4 rounded-lg border border-stone-600 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              Try again
            </button>
          </div>
        )}
      </div>
      <p className="mt-6 text-xs text-stone-500">
        AI-generated trivia may be inaccurate.
      </p>
    </section>
  );
}
