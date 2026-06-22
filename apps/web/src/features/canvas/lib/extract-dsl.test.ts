import { describe, expect, it } from "vitest";
import { extractDsl } from "./extract-dsl";

describe("extractDsl", () => {
  it("returns empty string when diagramSchema is null", () => {
    expect(extractDsl(null)).toBe("");
  });

  it("returns empty string when diagramSchema has no dsl key", () => {
    expect(extractDsl({ otherStuff: 1 })).toBe("");
  });

  it("returns empty string when dsl is not a string", () => {
    expect(extractDsl({ dsl: 123 })).toBe("");
    expect(extractDsl({ dsl: { nested: true } })).toBe("");
    expect(extractDsl({ dsl: null })).toBe("");
  });

  it("returns the dsl string when present and string-typed", () => {
    expect(extractDsl({ dsl: "A -> B" })).toBe("A -> B");
  });

  it("returns empty string for non-object schema values", () => {
    expect(extractDsl("hi" as unknown as null)).toBe("");
    expect(extractDsl(42 as unknown as null)).toBe("");
  });
});
