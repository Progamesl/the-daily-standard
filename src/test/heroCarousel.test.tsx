import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import type { Article } from "@/data/seedData";

const story = (n: number): Article => ({
  id: `s${n}`,
  slug: `story-${n}`,
  headline: `Headline ${n}`,
  dek: `Dek ${n}`,
  body: "",
  image: `https://cdn.example.com/${n}.jpg`,
  images: [],
  imageCaption: "",
  section: "us",
  author: { id: "a", name: "Ana Ruiz", role: "", bio: "", image: "" },
  publishedAt: new Date("2026-11-01"),
  readingTime: 3,
  tags: [],
});

const shown = () =>
  screen.getAllByRole("group").filter((g) => g.getAttribute("aria-hidden") === "false").map((g) => g.getAttribute("href"));

function renderCarousel(count: number) {
  return render(
    <MemoryRouter>
      <HeroCarousel articles={Array.from({ length: count }, (_, i) => story(i + 1))} />
    </MemoryRouter>,
  );
}

describe("the homepage carousel", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows one story at a time and fades to the next every six seconds, round and back", () => {
    renderCarousel(4);
    expect(shown()).toEqual(["/article/story-1"]);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    act(() => { vi.advanceTimersByTime(5999); });
    expect(shown()).toEqual(["/article/story-1"]);
    act(() => { vi.advanceTimersByTime(1); });
    expect(shown()).toEqual(["/article/story-2"]);

    // A slide at a time: each one's timer is set once React has shown it.
    for (const next of ["story-3", "story-4", "story-1"]) {
      act(() => { vi.advanceTimersByTime(6000); });
      expect(shown()).toEqual([`/article/${next}`]);
    }
  });

  it("holds still while the reader points at it", () => {
    renderCarousel(4);
    const carousel = screen.getByRole("region", { name: "Top stories" });
    fireEvent.mouseEnter(carousel);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(shown()).toEqual(["/article/story-1"]);
    fireEvent.mouseLeave(carousel);
    act(() => { vi.advanceTimersByTime(6000); });
    expect(shown()).toEqual(["/article/story-2"]);
  });

  it("jumps to a story from its dot, and stops for good with pause", () => {
    renderCarousel(4);
    fireEvent.click(screen.getByRole("button", { name: /Show story 3 of 4/ }));
    expect(shown()).toEqual(["/article/story-3"]);

    fireEvent.click(screen.getByRole("button", { name: "Pause the top stories" }));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(shown()).toEqual(["/article/story-3"]);
    expect(screen.getByRole("button", { name: "Play the top stories" })).toBeInTheDocument();
  });

  it("never moves on its own for a reader who asked for reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query.includes("reduce"), media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    renderCarousel(4);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(shown()).toEqual(["/article/story-1"]);
  });

  it("is a plain lead story, without controls, when there is only one", () => {
    renderCarousel(1);
    expect(shown()).toEqual(["/article/story-1"]);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
