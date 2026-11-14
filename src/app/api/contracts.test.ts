import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  update: vi.fn(),
  findFirst: vi.fn(),
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { update: mocks.update }, fact: { findFirst: mocks.findFirst } } }));

import { GET as getMe } from "./me/route";
import { PUT } from "./me/movie/route";
import { GET as getFact } from "./fact/route";

const user = { id: "user-1", name: null, email: null, image: null, favoriteMovie: "Alien" };
function movieRequest(body: string, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/me/movie", {
    method: "PUT",
    headers: { origin, host: "localhost:3000", "content-type": "application/json" },
    body,
  });
}
function factRequest(expectedUser?: string) {
  return new Request("http://localhost:3000/api/fact", {
    headers: expectedUser ? { "x-expected-user-id": expectedUser } : {},
  });
}

describe("authenticated API contracts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.update.mockResolvedValue({ ...user, favoriteMovie: "Arrival" });
    mocks.findFirst.mockResolvedValue(null);
  });

  it("requires authentication and disables caching for private responses", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    for (const response of [await getMe(), await getFact(factRequest()), await PUT(movieRequest('{"movie":"Arrival"}'))]) {
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("rejects cross-origin and invalid movie input", async () => {
    expect((await PUT(movieRequest('{"movie":"Alien"}', "https://localhost:3000"))).status).toBe(403);
    for (const body of ["{", "{}", '{"movie":42}', '{"movie":"  "}', JSON.stringify({ movie: "a".repeat(101) })]) {
      expect((await PUT(movieRequest(body))).status).toBe(400);
    }
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("trims and updates only the authenticated user regardless of supplied user id", async () => {
    const response = await PUT(movieRequest('{"movie":"  Arrival  ","userId":"other"}'));
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user-1" }, data: { favoriteMovie: "Arrival" },
    }));
    expect(await response.json()).toEqual({ ...user, favoriteMovie: "Arrival" });
  });

  it("rejects a stale dashboard session before updating another signed-in account", async () => {
    const request = new Request("http://localhost:3000/api/me/movie", {
      method: "PUT",
      headers: { origin: "http://localhost:3000", host: "localhost:3000", "x-expected-user-id": "old-user" },
      body: JSON.stringify({ movie: "Arrival" }),
    });
    expect((await PUT(request)).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
    expect((await getFact(factRequest("old-user"))).status).toBe(409);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("reads only the current user's current movie fact and returns null for empty history", async () => {
    const response = await getFact(factRequest());
    expect(await response.json()).toEqual({ fact: null });
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1", movie: "Alien" },
    }));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns nullable profile fields without exposing account credentials", async () => {
    const response = await getMe();
    expect(await response.json()).toEqual(user);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reports persistence failures without exposing internal details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.update.mockRejectedValueOnce(new Error("database details"));
    const response = await PUT(movieRequest('{"movie":"Arrival"}'));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Couldn't save your movie. Please try again." });
    log.mockRestore();
  });
});
