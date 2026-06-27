import { describe, expect, it } from "vitest";
import { parseEmbedUrl } from "./parse-embed-url";

describe("parseEmbedUrl", () => {
  describe("figure URLs", () => {
    it("matches a full production /f/ URL", () => {
      expect(
        parseEmbedUrl("https://www.octofocus.ai/f/fig_a5761250-2c26-4197-bb59-f9f141f4759d"),
      ).toEqual({
        kind: "figure",
        id: "fig_a5761250-2c26-4197-bb59-f9f141f4759d",
      });
    });

    it("matches a path-only /f/ URL", () => {
      expect(parseEmbedUrl("/f/fig_abc123")).toEqual({ kind: "figure", id: "fig_abc123" });
    });

    it("matches a bare fig_ id at the start", () => {
      expect(parseEmbedUrl("fig_abc123")).toEqual({ kind: "figure", id: "fig_abc123" });
    });

    it("trims surrounding whitespace and newlines before matching", () => {
      const pasted = "\n   https://octofocus.ai/f/fig_xyz   \n";
      expect(parseEmbedUrl(pasted)).toEqual({ kind: "figure", id: "fig_xyz" });
    });

    it("preserves UUID dashes and underscores in the captured id", () => {
      const url = "/f/fig_550e8400-e29b-41d4-a716-446655440000";
      expect(parseEmbedUrl(url)?.id).toBe("fig_550e8400-e29b-41d4-a716-446655440000");
    });
  });

  describe("component URLs", () => {
    it("matches a full production /c/ URL", () => {
      expect(parseEmbedUrl("https://octofocus.ai/c/cmp_abc")).toEqual({
        kind: "component",
        id: "cmp_abc",
      });
    });

    it("matches a bare cmp_ id at the start", () => {
      expect(parseEmbedUrl("cmp_simple")).toEqual({ kind: "component", id: "cmp_simple" });
    });

    it("prefers components when both substrings somehow appear", () => {
      // Defensive ordering: components match first (rarer, cleaner intent).
      // The chance of a real paste containing both is near zero, but if it
      // does we want a deterministic answer.
      const mixed = "first /c/cmp_one then /f/fig_two";
      expect(parseEmbedUrl(mixed)).toEqual({ kind: "component", id: "cmp_one" });
    });
  });

  describe("non-matches", () => {
    it("returns null for empty / whitespace-only input", () => {
      expect(parseEmbedUrl("")).toBeNull();
      expect(parseEmbedUrl("   \n  \t ")).toBeNull();
    });

    it("returns null for plain text without an id", () => {
      expect(parseEmbedUrl("just some random text")).toBeNull();
    });

    it("ignores ids that don't sit at a `/f/` or `/c/` boundary", () => {
      // `fig_abc` mid-string with no leading `/f/` and not at start
      // — we treat this as plain text to avoid false positives in
      // longer pasted documents.
      expect(parseEmbedUrl("hello fig_abc world")).toBeNull();
      expect(parseEmbedUrl("/notes/fig_abc")).toBeNull();
    });

    it("ignores URLs to unrelated routes", () => {
      expect(parseEmbedUrl("https://octofocus.ai/note/pag_xyz")).toBeNull();
      expect(parseEmbedUrl("https://octofocus.ai/canvas/cnv_xyz")).toBeNull();
    });

    it("ignores prefixes that look similar but aren't ours", () => {
      // `cmpx_` and `figs_` aren't our prefixes — character class
      // boundary should not capture these.
      expect(parseEmbedUrl("/c/cmpx_abc")).toBeNull();
      expect(parseEmbedUrl("/f/figs_abc")).toBeNull();
    });
  });
});
