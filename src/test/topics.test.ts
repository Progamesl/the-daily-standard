import { describe, it, expect } from "vitest";
import type { InternalNote } from "@/lib/adminDataService";
import { normalizeArticle } from "@/lib/normalizeArticle";
import { readTopics, withTopics, getTopicBySlug, TOPICS } from "@/lib/topics";
import { readCoAuthors, withCoAuthors } from "@/lib/coAuthors";
import { isStoryDataNote } from "@/lib/storyNotes";
import { sections } from "@/data/seedData";

const note = (content: string, id = "n1"): InternalNote => ({
  id,
  authorId: "u1",
  authorName: "Editor",
  content,
  createdAt: "2026-10-01T00:00:00.000Z",
  type: "note",
});

describe("topic pages", () => {
  it("never share a slug with a real section, which would mix the two pages", () => {
    const sectionSlugs = new Set(sections.map((s) => s.slug));
    expect(TOPICS.filter((t) => sectionSlugs.has(t.slug))).toEqual([]);
  });

  it("round-trips through the notes and drops slugs that are not topic pages", () => {
    const notes = withTopics([note("keep me")], ["technology", "politics"]);
    expect(readTopics(notes)).toEqual(["technology", "politics"]);
    expect(readTopics([note('{"kind":"topics","topics":["technology","world",3,"technology"]}')])).toEqual(["technology"]);
    expect(getTopicBySlug("journalism")?.name).toBe("Journalism");
  });

  it("removes the entry when the story is taken off every topic page", () => {
    const notes = withTopics([note("keep me")], ["business"]);
    expect(withTopics(notes, [])).toEqual([note("keep me")]);
  });

  it("lives alongside co-authors without either one disturbing the other", () => {
    let notes = withCoAuthors([note("a real note")], [{ id: "sam", name: "Sam Lee" }]);
    notes = withTopics(notes, ["journalism"]);
    notes = withCoAuthors(notes, [{ id: "jo", name: "Jo Park" }]);

    expect(readTopics(notes)).toEqual(["journalism"]);
    expect(readCoAuthors(notes)).toEqual([{ id: "jo", name: "Jo Park" }]);
    expect(notes.filter((n) => !isStoryDataNote(n))).toEqual([note("a real note")]);
  });

  it("keeps the trash note visible to the code that reads it", () => {
    expect(isStoryDataNote(note('{"kind":"trash","previousStatus":"draft"}'))).toBe(false);
  });

  it("survives the public normaliser", () => {
    const article = normalizeArticle({ id: "1", slug: "s", topics: ["technology", 7, null] });
    expect(article.topics).toEqual(["technology", "7"]);
  });
});
