import { describe, expect, it } from "vitest";
import { validateMovie } from "./movie";

describe("validateMovie", () => {
  it("trims a valid title and accepts the 100-character boundary", () => {
    expect(validateMovie("  Alien  ")).toEqual({ movie: "Alien" });
    expect(validateMovie("x".repeat(100))).toEqual({ movie: "x".repeat(100) });
  });

  it("rejects missing, blank, non-text, and overlong titles", () => {
    for (const value of [null, "   ", new File(["x"], "movie.txt"), "x".repeat(101)]) {
      expect(validateMovie(value)).toHaveProperty("error");
    }
  });
});
