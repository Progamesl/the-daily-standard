import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { adDayInput, adEndsAt, adErrorMessage, adStartsAt, newAdId } from "@/lib/ads";

// A stand-in for the Supabase client that records what the Ads page sends.
const db = vi.hoisted(() => ({
  sent: [] as { op: string; payload?: Record<string, unknown> }[],
  rows: [] as Record<string, unknown>[],
  writeAnswer: { data: [{ id: "x" }], error: null } as { data: unknown[] | null; error: { message: string } | null },
}));

vi.mock("@/lib/supabaseClient", () => {
  const write = (op: string, payload?: Record<string, unknown>) => {
    db.sent.push({ op, payload });
    const chain = {
      eq: () => chain,
      select: () => Promise.resolve(db.writeAnswer),
    };
    return chain;
  };
  return {
    supabase: {
      from: () => ({
        select: () => ({ order: () => Promise.resolve({ data: db.rows, error: null }) }),
        insert: (payload: Record<string, unknown>) => write("insert", payload),
        update: (payload: Record<string, unknown>) => write("update", payload),
        delete: () => write("delete"),
      }),
    },
  };
});

const toasts = vi.hoisted(() => ({ success: [] as string[], error: [] as string[] }));
vi.mock("sonner", () => ({
  toast: {
    success: (m: string) => toasts.success.push(m),
    error: (m: string) => toasts.error.push(m),
  },
}));
vi.mock("@/lib/adminUserService", () => ({ logActivity: () => {} }));

import AdminAds from "@/pages/admin/AdminAds";

describe("ad dates", () => {
  it("runs an ad from the start of its first day to the end of its last, in the editor's time", () => {
    const start = new Date(adStartsAt("2026-12-01")!);
    const end = new Date(adEndsAt("2026-12-31")!);
    expect([start.getDate(), start.getHours(), start.getMinutes()]).toEqual([1, 0, 0]);
    expect([end.getDate(), end.getHours(), end.getMinutes()]).toEqual([31, 23, 59]);
  });

  it("shows the same days again when the ad is opened for editing", () => {
    expect(adDayInput(adStartsAt("2026-12-01"))).toBe("2026-12-01");
    expect(adDayInput(adEndsAt("2026-12-31"))).toBe("2026-12-31");
    expect(adDayInput(null)).toBe("");
    expect(adStartsAt("")).toBeNull();
  });
});

describe("ad errors and ids", () => {
  it("gives every new ad its own id", () => {
    const a = newAdId();
    expect(a).toMatch(/^ad_/);
    expect(newAdId()).not.toBe(a);
  });

  it("explains a refused write in words an editor can act on", () => {
    expect(adErrorMessage({ message: 'new row violates row-level security policy for table "ads"' }))
      .toMatch(/not allowed to change ads/);
    expect(adErrorMessage({ message: "Something odd" })).toBe("Something odd");
  });
});

async function fillNewAd() {
  render(<AdminAds />);
  fireEvent.click(await screen.findByRole("button", { name: /Create First Ad/ }));
  fireEvent.change(screen.getByPlaceholderText("Smith Tutoring"), { target: { value: "Smith Tutoring" } });
  fireEvent.change(screen.getByPlaceholderText("Spring 2025 Campaign"), { target: { value: "Fall push" } });
  fireEvent.change(screen.getByPlaceholderText("Or paste image URL…"), { target: { value: "https://cdn.example.com/ad.png" } });
  fireEvent.change(screen.getByPlaceholderText("https://advertiser-website.com"), { target: { value: "https://smith.example.com" } });
}

describe("creating an ad on the admin Ads page", () => {
  beforeEach(() => {
    db.sent = [];
    db.rows = [];
    db.writeAnswer = { data: [{ id: "x" }], error: null };
    toasts.success = [];
    toasts.error = [];
  });

  it("sends the ad with an id, since the table has no default for one", async () => {
    await fillNewAd();
    fireEvent.click(screen.getByRole("button", { name: "Create Ad" }));

    await waitFor(() => expect(toasts.success).toHaveLength(1));
    expect(db.sent).toHaveLength(1);
    const { op, payload } = db.sent[0];
    expect(op).toBe("insert");
    expect(payload).toMatchObject({
      advertiser: "Smith Tutoring",
      title: "Fall push",
      image_url: "https://cdn.example.com/ad.png",
      link_url: "https://smith.example.com",
      placement: "sidebar",
      active: false,
      starts_at: null,
      ends_at: null,
    });
    expect(payload?.id).toMatch(/^ad_/);
    expect(toasts.error).toEqual([]);
  });

  it("does not call a write saved when the database turned it away", async () => {
    db.writeAnswer = { data: [], error: null };
    await fillNewAd();
    fireEvent.click(screen.getByRole("button", { name: "Create Ad" }));

    await waitFor(() => expect(toasts.error).toHaveLength(1));
    expect(toasts.error[0]).toMatch(/not allowed to change ads/);
    expect(toasts.success).toEqual([]);
  });

  it("will not save until the required fields are filled", async () => {
    render(<AdminAds />);
    fireEvent.click(await screen.findByRole("button", { name: /Create First Ad/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create Ad" }));
    await new Promise((r) => setTimeout(r, 0));
    expect(db.sent).toEqual([]);
  });

  it("refuses an end date before the start date", async () => {
    await fillNewAd();
    const [start, end] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'));
    fireEvent.change(start, { target: { value: "2026-12-10" } });
    fireEvent.change(end, { target: { value: "2026-12-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Ad" }));

    await waitFor(() => expect(toasts.error).toEqual(["The end date is before the start date"]));
    expect(db.sent).toEqual([]);
  });
});
