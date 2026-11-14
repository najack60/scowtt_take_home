import { isMovieFact } from "@/lib/api";
import type { MovieFact } from "@/lib/api-contracts";

export const FACT_FRESH_MS = 30_000;

function key(userId: string) {
  return `movie-notes:fact:${userId}`;
}

export function isFreshFact(fact: MovieFact, movie: string, now = Date.now()) {
  const age = now - Date.parse(fact.createdAt);
  return fact.movie === movie && age >= 0 && age < FACT_FRESH_MS;
}

export function readCachedFact(userId: string, movie: string): MovieFact | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      localStorage.removeItem(key(userId));
      return null;
    }
    return isMovieFact(value) && isFreshFact(value, movie) ? value : null;
  } catch (error) {
    console.warn("Could not read the fact cache:", error);
    return null;
  }
}

export function writeCachedFact(userId: string, fact: MovieFact) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(fact));
  } catch (error) {
    console.warn("Could not save the fact cache:", error);
  }
}

export function markFactInvalidated(userId: string, movie: string) {
  try {
    localStorage.setItem(key(userId), JSON.stringify({ invalidatedMovie: movie }));
  } catch (error) {
    console.warn("Could not invalidate the fact cache:", error);
  }
}

export function isFactInvalidated(userId: string, movie: string) {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return false;
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" && value !== null
      && "invalidatedMovie" in value && value.invalidatedMovie === movie;
  } catch (error) {
    console.warn("Could not read the fact cache invalidation:", error);
    return false;
  }
}

export function clearCachedFact(userId: string) {
  try {
    localStorage.removeItem(key(userId));
  } catch (error) {
    console.warn("Could not clear the fact cache:", error);
  }
}
