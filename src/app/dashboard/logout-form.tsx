"use client";

import { clearCachedFact } from "@/lib/fact-cache";

export function LogoutForm({ userId, signOut }: { userId: string; signOut: () => Promise<void> }) {
  return (
    <form action={signOut} onSubmit={() => clearCachedFact(userId)}>
      <button className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-300 transition hover:border-stone-500 hover:text-white">
        Log out
      </button>
    </form>
  );
}
