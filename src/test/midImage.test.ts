import { describe, it, expect } from "vitest";
import {
  placeMidImage,
  midImageSlot,
  paragraphTexts,
  readMidImage,
  withMidImage,
  normalizeMidImage,
} from "@/lib/midImage";
import { readTopics, withTopics } from "@/lib/topics";
import { isStoryDataNote } from "@/lib/storyNotes";
import { normalizeArticle } from "@/lib/normalizeArticle";

const body = (n: number) => Array.from({ length: n }, (_, i) => `<p>Paragraph ${i + 1}.</p>`).join("");
const chart = { url: "https://cdn.example.com/chart.png", caption: "Turnout by grade", after: null };

/** What follows each paragraph, so a test can say where the picture landed. */
function order(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.body.children).map((el) =>
    el.tagName === "FIGURE" ? "FIGURE" : (el.textContent ?? "").replace("Paragraph ", "P").replace(".", ""),
  );
}

describe("placing the picture inside the story", () => {
  it("goes halfway through when no paragraph is chosen", () => {
    expect(order(placeMidImage(body(4), chart))).toEqual(["P1", "P2", "FIGURE", "P3", "P4"]);
    expect(order(placeMidImage(body(5), chart))).toEqual(["P1", "P2", "P3", "FIGURE", "P4", "P5"]);
  });

  it("goes after the chosen paragraph, and never after the last one", () => {
    expect(order(placeMidImage(body(5), { ...chart, after: 1 }))).toEqual(["P1", "FIGURE", "P2", "P3", "P4", "P5"]);
    // The story was cut after the editor picked paragraph 9.
    expect(order(placeMidImage(body(3), { ...chart, after: 9 }))).toEqual(["P1", "P2", "FIGURE", "P3"]);
    expect(midImageSlot(1, null)).toBe(1);
    expect(midImageSlot(0, 3)).toBe(0);
  });

  it("counts only paragraphs with words in, outside quotes and lists", () => {
    const html = "<p>One.</p><p> </p><blockquote><p>Quoted.</p></blockquote><p>Two.</p><ul><li><p>Item.</p></li></ul><p>Three.</p>";
    expect(paragraphTexts(html)).toEqual(["One.", "Two.", "Three."]);
  });

  it("writes the caption as text, so it can never become markup", () => {
    const html = placeMidImage(body(2), { ...chart, caption: '<img src=x onerror="alert(1)"> & "quotes"' });
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelectorAll("img")).toHaveLength(1);
    expect(doc.querySelector("figcaption")?.textContent).toBe('<img src=x onerror="alert(1)"> & "quotes"');
    expect(doc.querySelector("figure img")?.getAttribute("alt")).toContain("quotes");
  });

  it("leaves out the caption line when there is no caption", () => {
    const html = placeMidImage(body(2), { ...chart, caption: "" });
    expect(html).toContain("<figure");
    expect(html).not.toContain("figcaption");
  });

  it("finds the paragraphs in a story typed straight into the admin editor", () => {
    // What the editor actually saves: the first line bare, every line after it in a <div>.
    const typed = "First line.<div>Second line.</div><div>Third line.</div><div>Fourth line.</div>";
    expect(paragraphTexts(typed)).toEqual(["First line.", "Second line.", "Third line.", "Fourth line."]);
    const html = placeMidImage(typed, chart);
    expect(html.indexOf("Second line.")).toBeLessThan(html.indexOf("<figure"));
    expect(html.indexOf("<figure")).toBeLessThan(html.indexOf("Third line."));
    expect(placeMidImage(typed, { ...chart, after: 1 }).indexOf("<figure")).toBeLessThan(html.indexOf("Second line."));
  });

  it("looks inside a wrapper, as Google Docs pastes have", () => {
    const pasted = '<b id="docs-internal"><p>One.</p><p>Two.</p><p>Three.</p></b>';
    expect(paragraphTexts(pasted)).toEqual(["One.", "Two.", "Three."]);
    const html = placeMidImage(pasted, chart);
    expect(html.indexOf("Two.")).toBeLessThan(html.indexOf("<figure"));
    expect(html.indexOf("<figure")).toBeLessThan(html.indexOf("Three."));
  });

  it("waits for the body, and leaves a story without a picture alone", () => {
    expect(placeMidImage("", chart)).toBe("");
    expect(placeMidImage("<p> </p>", chart)).toBe("<p> </p>");
    expect(placeMidImage("Just one line of text", chart)).toContain("chart.png");
    expect(placeMidImage(body(3), undefined)).toBe(body(3));
  });
});

describe("keeping the picture with the story", () => {
  it("round-trips through the notes alongside topics, out of the notes panel", () => {
    let notes = withTopics([], ["technology"]);
    notes = withMidImage(notes, { ...chart, after: 2 });
    expect(readMidImage(notes)).toEqual({ ...chart, after: 2 });
    expect(readTopics(notes)).toEqual(["technology"]);
    expect(notes.filter((n) => !isStoryDataNote(n))).toEqual([]);
    expect(readMidImage(withMidImage(notes, null))).toBeUndefined();
  });

  it("only accepts a real web address, never a pasted data: picture", () => {
    expect(normalizeMidImage({ url: "data:image/png;base64,AAAA", caption: "x" })).toBeUndefined();
    expect(normalizeMidImage({ url: "javascript:alert(1)" })).toBeUndefined();
    expect(normalizeMidImage({ url: " https://x.com/a.png ", after: "3" })).toEqual({ url: "https://x.com/a.png", caption: "", after: 3 });
  });

  it("survives the public normaliser", () => {
    const article = normalizeArticle({ id: "1", slug: "s", midImage: { url: chart.url, caption: chart.caption } });
    expect(article.midImage).toEqual({ ...chart, after: null });
    expect(normalizeArticle({ id: "2", slug: "t" }).midImage).toBeUndefined();
  });
});
