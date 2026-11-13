import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  generateAndSaveFact: vi.fn(),
}));

vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/facts", () => ({ generateAndSaveFact: mocks.generateAndSaveFact }));

import { POST } from "./route";

function request(origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/facts", {
    method: "POST",
    headers: { origin, host: "localhost:3000" },
  });
}

describe("POST /api/facts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", favoriteMovie: "Alien" });
    mocks.generateAndSaveFact.mockResolvedValue({ content: "A fact." });
  });

  it("rejects cross-origin and unauthenticated requests", async () => {
    expect((await POST(request("https://elsewhere.example"))).status).toBe(403);
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.generateAndSaveFact).not.toHaveBeenCalled();
  });

  it("requires onboarding before generating", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "user-1", favoriteMovie: null });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.generateAndSaveFact).not.toHaveBeenCalled();
  });

  it("generates for the authenticated user's movie and prevents caching", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ content: "A fact." });
    expect(mocks.generateAndSaveFact).toHaveBeenCalledWith("user-1", "Alien");
  });

  it("returns an explicit error on generation or persistence failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.generateAndSaveFact.mockRejectedValueOnce(new Error("upstream failure"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Couldn't get a fact right now. Please try again." });
    log.mockRestore();
  });
});
