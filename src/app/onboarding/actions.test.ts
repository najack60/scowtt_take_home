import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { updateMany: mocks.updateMany } } }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`redirect:${url}`); },
}));

import { saveMovie } from "./actions";

function form(movie: string) {
  const data = new FormData();
  data.set("movie", movie);
  data.set("userId", "another-user");
  return data;
}

describe("saveMovie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "current-user", favoriteMovie: null });
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("redirects unauthenticated or already onboarded users without writing", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    await expect(saveMovie({}, form("Alien"))).rejects.toThrow("redirect:/");
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "current-user", favoriteMovie: "Alien" });
    await expect(saveMovie({}, form("Other"))).rejects.toThrow("redirect:/dashboard");
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects invalid input without writing", async () => {
    expect(await saveMovie({}, form("   "))).toHaveProperty("error");
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("saves only the authenticated user's trimmed title if still unset", async () => {
    await expect(saveMovie({}, form("  Alien  "))).rejects.toThrow("redirect:/dashboard");
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "current-user", favoriteMovie: null },
      data: { favoriteMovie: "Alien" },
    });
  });

  it("reports database failures instead of redirecting", async () => {
    mocks.updateMany.mockRejectedValueOnce(new Error("database down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await saveMovie({}, form("Alien"))).toEqual({
      error: "Could not save your movie. Please try again.",
      value: "Alien",
    });
    log.mockRestore();
  });
});
