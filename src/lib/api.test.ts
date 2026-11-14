import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("API client", () => {
  it.each([401, 500])("normalizes HTTP %s errors", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Request failed" }), { status }),
    ));
    await expect(api.me()).rejects.toMatchObject({ name: "ApiError", status, message: "Request failed" });
  });

  it("reports network failures and malformed responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response("{", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ fact: { content: "" } }), { status: 200 })));
    await expect(api.me()).rejects.toThrow("Network error");
    await expect(api.fact("user-1")).rejects.toBeInstanceOf(ApiError);
    await expect(api.fact("user-1")).rejects.toThrow("invalid response");
  });
});
