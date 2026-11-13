import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), createResponse: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: mocks.createResponse };
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`redirect:${url}`); },
}));

import { prisma } from "@/lib/prisma";
import { saveMovie } from "@/app/onboarding/actions";
import { generateAndSaveFact } from "@/lib/facts";

const testUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testUrl)("PostgreSQL onboarding and facts", () => {
  const userId = `test-${randomUUID()}`;
  const otherId = `test-${randomUUID()}`;

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== testUrl) {
      throw new Error("DATABASE_URL must equal TEST_DATABASE_URL for integration tests");
    }
    await prisma.user.createMany({
      data: [
        { id: userId, email: `${userId}@example.test` },
        { id: otherId, email: `${otherId}@example.test` },
      ],
    });
  });

  afterAll(async () => {
    if (process.env.DATABASE_URL === testUrl) {
      await prisma.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
      await prisma.$disconnect();
    }
  });

  it("saves only the signed-in user's movie and persists a related fact", async () => {
    mocks.auth.mockResolvedValue({ user: { id: userId } });
    const form = new FormData();
    form.set("movie", "  Alien  ");
    form.set("userId", otherId);
    await expect(saveMovie({}, form)).rejects.toThrow("redirect:/dashboard");

    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).favoriteMovie).toBe("Alien");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: otherId } })).favoriteMovie).toBeNull();

    mocks.createResponse.mockResolvedValue({ output_text: "A fact about Alien." });
    await generateAndSaveFact(userId, "Alien");
    expect(await prisma.fact.findMany({ where: { userId }, select: { movie: true, content: true } }))
      .toEqual([{ movie: "Alien", content: "A fact about Alien." }]);

    form.set("movie", "Other");
    await expect(saveMovie({}, form)).rejects.toThrow("redirect:/dashboard");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).favoriteMovie).toBe("Alien");
  });
});
