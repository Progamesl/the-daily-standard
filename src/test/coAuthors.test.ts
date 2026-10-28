import { describe, it, expect } from "vitest";
import type { InternalNote } from "@/lib/adminDataService";
import { normalizeArticle } from "@/lib/normalizeArticle";
import {
  readCoAuthors,
  withCoAuthors,
  isCoAuthorsNote,
  storyAuthors,
  joinNames,
  bylineText,
} from "@/lib/coAuthors";

const note = (content: string, id = "n1"): InternalNote => ({
  id,
  authorId: "u1",
  authorName: "Editor",
  content,
  createdAt: "2026-10-01T00:00:00.000Z",
  type: "note",
});

const sam = { id: "sam", name: "Sam Lee" };
const jo = { id: "jo", name: "Jo Park" };

describe("co-authors kept in the internal notes", () => {
  it("round-trips through the notes without touching real notes", () => {
    const real = [note("Needs a second source"), note('{"kind":"trash","previousStatus":"draft"}', "t1")];
    const notes = withCoAuthors(real, [sam, jo], { id: "u1", name: "Editor" });

    expect(readCoAuthors(notes)).toEqual([sam, jo]);
    expect(notes.filter((n) => !isCoAuthorsNote(n))).toEqual(real);
  });

  it("replaces the list rather than adding a second entry", () => {
    const once = withCoAuthors([], [sam]);
    const twice = withCoAuthors(once, [jo]);
    expect(twice.filter(isCoAuthorsNote)).toHaveLength(1);
    expect(readCoAuthors(twice)).toEqual([jo]);
  });

  it("removes the entry when nobody is left", () => {
    const notes = withCoAuthors([note("keep me")], [sam]);
    expect(withCoAuthors(notes, [])).toEqual([note("keep me")]);
  });

  it("leaves the notes alone when nothing changed", () => {
    const notes = withCoAuthors([], [sam]);
    expect(withCoAuthors(notes, [{ ...sam }])).toBe(notes);
  });

  it("ignores ordinary notes, trash notes and malformed entries", () => {
    expect(readCoAuthors([note("co_authors are great")])).toEqual([]);
    expect(readCoAuthors([note('{"kind":"trash"}')])).toEqual([]);
    expect(readCoAuthors([note('{"kind":"co_authors","authors":[{"id":"x"},{"id":"","name":"No Id"}]}')])).toEqual([]);
    expect(readCoAuthors(undefined)).toEqual([]);
  });
});

describe("bylines", () => {
  const ana = { id: "ana", name: "Ana Ruiz", role: "Staff Writer", bio: "", image: "" };
  const author = (a: { id: string; name: string }) => ({ ...a, role: "Student Journalist", bio: "", image: "" });

  it("joins names AP style, without a serial comma", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["Ana Ruiz"])).toBe("Ana Ruiz");
    expect(joinNames(["Ana Ruiz", "Sam Lee"])).toBe("Ana Ruiz and Sam Lee");
    expect(joinNames(["Ana Ruiz", "Sam Lee", "Jo Park"])).toBe("Ana Ruiz, Sam Lee and Jo Park");
  });

  it("puts the main author first and never credits anyone twice", () => {
    const authors = storyAuthors({ author: ana, coAuthors: [author(sam), author(ana), author(jo), author(sam)] });
    expect(authors.map((a) => a.id)).toEqual(["ana", "sam", "jo"]);
  });

  it("is just the main author for a story written alone", () => {
    expect(bylineText({ author: ana })).toBe("Ana Ruiz");
  });

  it("survives the public normaliser, which is where every story enters the site", () => {
    const article = normalizeArticle({
      id: "1",
      slug: "s",
      author: ana,
      coAuthors: [sam, { id: "ghost" }, null, jo],
    });
    expect(bylineText(article)).toBe("Ana Ruiz, Sam Lee and Jo Park");
    expect(article.coAuthors?.[0].role).toBe("Student Journalist");
  });
});
