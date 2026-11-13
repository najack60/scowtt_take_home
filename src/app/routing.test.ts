import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`redirect:${url}`); },
}));

import HomePage from "./page";
import DashboardPage from "./dashboard/page";
import OnboardingPage from "./onboarding/page";

describe("page access", () => {
  beforeEach(() => vi.resetAllMocks());

  it("sends visitors away from protected pages", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(DashboardPage()).rejects.toThrow("redirect:/");
    await expect(OnboardingPage()).rejects.toThrow("redirect:/");
  });

  it("sends first-time users to onboarding", async () => {
    mocks.getCurrentUser.mockResolvedValue({ favoriteMovie: null });
    await expect(HomePage()).rejects.toThrow("redirect:/onboarding");
    await expect(DashboardPage()).rejects.toThrow("redirect:/onboarding");
  });

  it("sends returning users to the dashboard", async () => {
    mocks.getCurrentUser.mockResolvedValue({ favoriteMovie: "Alien" });
    await expect(HomePage()).rejects.toThrow("redirect:/dashboard");
    await expect(OnboardingPage()).rejects.toThrow("redirect:/dashboard");
  });
});
