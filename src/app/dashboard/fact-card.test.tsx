// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FactCard } from "./fact-card";
import { QueryProvider } from "./query-provider";

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status });
}
function fact(content = "A movie fact.", age = 0, movie = "Alien") {
  return { movie, content, createdAt: new Date(Date.now() - age).toISOString() };
}
function renderCard(userId = "user-1", movie = "Alien") {
  return render(<QueryProvider><FactCard userId={userId} movie={movie} /></QueryProvider>);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("shows an error and retries fact generation on demand", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response({ error: "Couldn't get a fact right now." }, 500))
    .mockResolvedValueOnce(response({ fact: fact() }));
  vi.stubGlobal("fetch", fetchMock);
  renderCard();
  expect(await screen.findByText("Couldn't get a fact right now.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("A movie fact.")).toBeTruthy();
  expect(fetchMock).toHaveBeenLastCalledWith("/api/facts", expect.objectContaining({ method: "POST" }));
});

it("reuses a fresh fact after reload and bypasses it for an explicit new fact", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response({ fact: null }))
    .mockResolvedValueOnce(response({ fact: fact() }))
    .mockResolvedValueOnce(response({ fact: fact("A new fact.") }));
  vi.stubGlobal("fetch", fetchMock);
  const first = renderCard();
  await screen.findByText("A movie fact.");
  first.unmount();
  renderCard();
  await screen.findByText("A movie fact.");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "Get a new fact" }));
  await screen.findByText("A new fact.");
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it("does not reuse expired or other users' cached facts", async () => {
  localStorage.setItem("movie-notes:fact:user-1", JSON.stringify(fact("Old fact.", 30_001)));
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response({ fact: null }))
    .mockResolvedValueOnce(response({ fact: fact("Fresh fact.") }))
    .mockResolvedValueOnce(response({ fact: null }))
    .mockResolvedValueOnce(response({ fact: fact("Other user's fact.") }));
  vi.stubGlobal("fetch", fetchMock);
  const first = renderCard();
  await screen.findByText("Fresh fact.");
  first.unmount();
  renderCard("user-2");
  await screen.findByText("Other user's fact.");
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it("uses a recent server fact but regenerates an expired one", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response({ fact: fact("Saved fact.", 20_000) }))
    .mockResolvedValueOnce(response({ fact: fact("Expired fact.", 30_001) }))
    .mockResolvedValueOnce(response({ fact: fact("Generated fact.") }));
  vi.stubGlobal("fetch", fetchMock);
  const first = renderCard();
  await screen.findByText("Saved fact.");
  first.unmount();
  localStorage.clear();
  renderCard();
  await screen.findByText("Generated fact.");
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
});

it("keeps a movie-change invalidation across reloads until generation succeeds", async () => {
  localStorage.setItem("movie-notes:fact:user-1", JSON.stringify({ invalidatedMovie: "Alien" }));
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response({ error: "Generation failed." }, 500))
    .mockResolvedValueOnce(response({ fact: fact("Fresh after change.") }));
  vi.stubGlobal("fetch", fetchMock);
  const first = renderCard();
  await screen.findByText("Generation failed.");
  first.unmount();
  renderCard();
  await screen.findByText("Fresh after change.");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/facts", expect.objectContaining({ method: "POST" }));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/facts", expect.objectContaining({ method: "POST" }));
});

it("keeps the previous fact visible when a requested refresh fails", async () => {
  localStorage.setItem("movie-notes:fact:user-1", JSON.stringify(fact("Previous fact.")));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: "Generation failed." }, 500)));
  renderCard();
  await screen.findByText("Previous fact.");
  fireEvent.click(screen.getByRole("button", { name: "Get a new fact" }));
  await screen.findByText("Generation failed.");
  expect(screen.getByText("Previous fact.")).toBeTruthy();
  expect(JSON.parse(localStorage.getItem("movie-notes:fact:user-1")!).content).toBe("Previous fact.");
});
