import { expect, it } from "vitest";
import { isFreshFact } from "./fact-cache";

it("reuses only a matching movie's fact younger than 30 seconds", () => {
  const createdAt = "2026-01-01T00:00:00.000Z";
  const fact = { movie: "Alien", content: "Trivia", createdAt };
  const start = Date.parse(createdAt);
  expect(isFreshFact(fact, "Alien", start + 29_999)).toBe(true);
  expect(isFreshFact(fact, "Alien", start + 30_000)).toBe(false);
  expect(isFreshFact(fact, "Arrival", start + 1)).toBe(false);
  expect(isFreshFact(fact, "Alien", start - 1)).toBe(false);
});
