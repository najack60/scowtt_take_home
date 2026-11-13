// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FactCard } from "./fact-card";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("shows an error and retries fact generation on demand", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ content: "A movie fact." }) });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});

  render(<FactCard />);
  expect(await screen.findByText("Couldn't get a fact right now. Please try again.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("A movie fact.")).toBeTruthy();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
});
