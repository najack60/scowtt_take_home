import type { FactResponse, MovieFact, UserProfile } from "@/lib/api-contracts";

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isUserProfile(value: unknown): value is UserProfile {
  return isRecord(value) && typeof value.id === "string" && value.id.length > 0
    && isNullableString(value.name) && isNullableString(value.email)
    && isNullableString(value.image) && isNullableString(value.favoriteMovie);
}

export function isMovieFact(value: unknown): value is MovieFact {
  return isRecord(value) && typeof value.movie === "string" && value.movie.length > 0
    && typeof value.content === "string" && value.content.trim().length > 0
    && typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt));
}

function isFactResponse(value: unknown): value is FactResponse {
  return isRecord(value) && (value.fact === null || isMovieFact(value.fact));
}

async function request<T>(
  path: string,
  init: RequestInit,
  isResponse: (value: unknown) => value is T,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError("Network error. Please try again.");
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.ok ? "The server returned an invalid response." : "The request failed. Please try again.",
      response.status,
    );
  }

  if (!response.ok) {
    const message = isRecord(data) && typeof data.error === "string" && data.error.trim()
      ? data.error
      : "The request failed. Please try again.";
    throw new ApiError(message, response.status);
  }
  if (!isResponse(data)) throw new ApiError("The server returned an invalid response.", response.status);
  return data;
}

export const api = {
  me: (signal?: AbortSignal) => request("/api/me", { signal }, isUserProfile),
  updateMovie: (movie: string, expectedUserId: string) => request("/api/me/movie", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Expected-User-Id": expectedUserId },
    body: JSON.stringify({ movie }),
  }, isUserProfile),
  fact: (expectedUserId: string, signal?: AbortSignal) => request("/api/fact", {
    signal, headers: { "X-Expected-User-Id": expectedUserId },
  }, isFactResponse),
  generateFact: (expectedUserId: string, signal?: AbortSignal) => request("/api/facts", {
    method: "POST", signal, headers: { "X-Expected-User-Id": expectedUserId },
  }, isFactResponse),
};
