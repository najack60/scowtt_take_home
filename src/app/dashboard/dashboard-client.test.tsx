// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DashboardClient } from "./dashboard-client";
import { QueryProvider } from "./query-provider";

const user = { id: "user-1", name: null, email: null, image: null, favoriteMovie: "Alien" };
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status });
}
function fact(movie: string, content: string) {
  return { movie, content, createdAt: new Date().toISOString() };
}
function renderDashboard() {
  return render(<QueryProvider><DashboardClient initialUser={user} /></QueryProvider>);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("cancels a draft without saving and handles missing profile fields", async () => {
  localStorage.setItem("movie-notes:fact:user-1", JSON.stringify(fact("Alien", "Original fact")));
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  renderDashboard();
  await screen.findByText("Original fact");
  expect(screen.getByText("Movie fan")).toBeTruthy();
  expect(screen.getByText("Email unavailable")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Edit movie" }));
  fireEvent.change(screen.getByLabelText("Movie title"), { target: { value: "Arrival" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("heading", { name: "Alien" })).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("updates optimistically, invalidates the old fact, and generates for the new movie", async () => {
  localStorage.setItem("movie-notes:fact:user-1", JSON.stringify(fact("Alien", "Old fact")));
  let finishSave!: (response: Response) => void;
  const save = new Promise<Response>((resolve) => { finishSave = resolve; });
  const fetchMock = vi.fn()
    .mockReturnValueOnce(save)
    .mockResolvedValueOnce(response({ fact: fact("Arrival", "New fact") }));
  vi.stubGlobal("fetch", fetchMock);
  renderDashboard();
  await screen.findByText("Old fact");
  fireEvent.click(screen.getByRole("button", { name: "Edit movie" }));
  fireEvent.change(screen.getByLabelText("Movie title"), { target: { value: "Arrival" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await screen.findByRole("heading", { name: "Arrival" });
  expect(screen.queryByText("Old fact")).toBeNull();
  expect(screen.getByText("Saving...")).toBeTruthy();
  finishSave(response({ ...user, favoriteMovie: "Arrival" }));
  await screen.findByText("New fact");
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/me/movie", expect.objectContaining({ method: "PUT" }));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/facts", expect.objectContaining({ method: "POST" }));
  expect(JSON.parse(localStorage.getItem("movie-notes:fact:user-1")!)).toMatchObject({ movie: "Arrival", content: "New fact" });
});

it("rolls back a failed save and preserves the previous fact", async () => {
  localStorage.setItem("movie-notes:fact:user-1", JSON.stringify(fact("Alien", "Old fact")));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: "Save failed." }, 500)));
  renderDashboard();
  await screen.findByText("Old fact");
  fireEvent.click(screen.getByRole("button", { name: "Edit movie" }));
  fireEvent.change(screen.getByLabelText("Movie title"), { target: { value: "Arrival" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await screen.findByText("Save failed.");
  expect(screen.getByRole("heading", { name: "Alien" })).toBeTruthy();
  expect(screen.getByDisplayValue("Arrival")).toBeTruthy();
  await waitFor(() => expect(screen.getByText("Old fact")).toBeTruthy());
});

it("ignores an old in-flight fact after a movie change", async () => {
  let finishOldFact!: (response: Response) => void;
  const oldFact = new Promise<Response>((resolve) => { finishOldFact = resolve; });
  const fetchMock = vi.fn()
    .mockReturnValueOnce(oldFact)
    .mockResolvedValueOnce(response({ ...user, favoriteMovie: "Arrival" }))
    .mockResolvedValueOnce(response({ fact: fact("Arrival", "New fact") }));
  vi.stubGlobal("fetch", fetchMock);
  renderDashboard();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Edit movie" }));
  fireEvent.change(screen.getByLabelText("Movie title"), { target: { value: "Arrival" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await screen.findByText("New fact");
  finishOldFact(response({ fact: fact("Alien", "Late old fact") }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("movie-notes:fact:user-1")!).movie).toBe("Arrival"));
  expect(screen.queryByText("Late old fact")).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
