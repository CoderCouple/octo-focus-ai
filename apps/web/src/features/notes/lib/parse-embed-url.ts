/**
 * Recognise the embed-URL shapes the notes editor knows how to expand
 * into custom blocks. Used by the paste-capture and drop-capture
 * handlers on `NotesEditor` so the two surfaces share one source of
 * truth for what counts as a valid embed URL.
 *
 * Two shapes today:
 *   - `/c/<cmp_…>` → Components artifact  → `generativeUi` block
 *   - `/f/<fig_…>` → Saved canvas figure → `figure` block
 *
 * The boundary check (start-of-string OR literal `/c/` / `/f/`)
 * deliberately matches BOTH the full URL paste (`https://…/f/fig_xxx`)
 * AND a bare id (`fig_xxx`) — bare ids are useful for keyboard /
 * AI-pasted contexts where the user might not have an origin prefix.
 */

export type EmbedTarget =
  | { kind: "component"; id: string }
  | { kind: "figure"; id: string };

const COMPONENT_RE = /(?:^|\/c\/)(cmp_[A-Za-z0-9_-]+)/;
const FIGURE_RE = /(?:^|\/f\/)(fig_[A-Za-z0-9_-]+)/;

/**
 * Returns the embed target encoded in `text`, or null when no
 * recognised id is present. Whitespace is trimmed first; multi-line
 * pastes are inspected as a single string (the user pasted ONE thing).
 *
 * Component IDs take precedence — they're rarer and the user is
 * unlikely to paste both at once, so deterministic ordering is fine.
 */
export function parseEmbedUrl(text: string): EmbedTarget | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const component = trimmed.match(COMPONENT_RE);
  if (component) return { kind: "component", id: component[1]! };

  const figure = trimmed.match(FIGURE_RE);
  if (figure) return { kind: "figure", id: figure[1]! };

  return null;
}
