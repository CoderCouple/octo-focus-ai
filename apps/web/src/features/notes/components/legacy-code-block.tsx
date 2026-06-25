"use client";

import { createReactBlockSpec } from "@blocknote/react";
import type { Ref } from "react";

/**
 * Bare-bones `codeBlock` spec that accepts inline text content
 * (`content: "inline"`). Exists only so notes saved BEFORE the
 * `richCode` rename still load — without it BlockNote rejects the
 * stored document with `Invalid content for node codeBlock` and the
 * whole editor crashes.
 *
 * New code blocks come from the `/code block` slash menu, which now
 * inserts our richer `richCode` block instead.
 */
export const LegacyCodeBlock = createReactBlockSpec(
  {
    type: "codeBlock" as const,
    propSchema: {
      language: { default: "" },
    },
    content: "inline" as const,
  },
  {
    toExternalHTML: ({ block }) => {
      const lang = (block.props.language as string) || "";
      return (
        <pre>
          <code className={lang ? `language-${lang}` : undefined} />
        </pre>
      );
    },
    render: ({ contentRef }) => (
      <pre className="bg-muted/30 my-2 overflow-auto rounded-lg border p-3 font-mono text-[0.85rem] leading-relaxed">
        <code ref={contentRef as Ref<HTMLElement>} className="block whitespace-pre" />
      </pre>
    ),
  },
);
