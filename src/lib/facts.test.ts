import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createResponse: vi.fn(),
  createFact: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class {
    responses = { create: mocks.createResponse };
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { fact: { create: mocks.createFact } } }));

import { generateAndSaveFact } from "./facts";

describe("generateAndSaveFact", () => {
  beforeEach(() => vi.resetAllMocks());

  it("persists a non-empty generated fact with its owner and movie", async () => {
    mocks.createResponse.mockResolvedValue({ output_text: "  Some trivia.  " });
    const fact = { content: "Some trivia.", movie: "Alien", createdAt: new Date("2026-01-01") };
    mocks.createFact.mockResolvedValue(fact);
    await expect(generateAndSaveFact("user-1", "Alien")).resolves.toEqual(fact);
    expect(mocks.createFact).toHaveBeenCalledWith({
      data: { userId: "user-1", movie: "Alien", content: "Some trivia." },
      select: { content: true, movie: true, createdAt: true },
    });
  });

  it("does not save an empty model response", async () => {
    mocks.createResponse.mockResolvedValue({ output_text: "  " });
    await expect(generateAndSaveFact("user-1", "Alien")).rejects.toThrow("empty fact");
    expect(mocks.createFact).not.toHaveBeenCalled();
  });
});
