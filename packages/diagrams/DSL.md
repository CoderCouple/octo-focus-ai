# OctoFocusAI Diagram DSL — v2 spec

**Status:** draft for review. No parser code follows this doc until the
grammar is locked.

**Goal:** one text grammar that drives every diagram on the OctoFocusAI
canvas — architecture, flowchart, sequence, ER, mindmap — readable by a
human, emittable by Claude, round-trippable from the visual editor.

**Design principles**

1. **Eraser-compatible** — adopt their grammar verbatim where possible.
   Zero switching cost for users coming from Eraser, and Claude already
   knows the syntax from its training data.
2. **One grammar, all types** — no `type` directive in the source. The
   parser infers diagram kind from the constructs used. Mixed-mode is a
   parse error, not silently allowed.
3. **Text is the source of truth.** Visual edits round-trip back to
   text. The DSL drawer always shows the canonical form.
4. **AI-friendly emission target.** Newline-delimited, low-syntax,
   forgiving whitespace. Claude does well here.
5. **Extensible without breaking compatibility.** Our additions
   (`math`, `embed`, `note`, `comment`) live in the same `[ ]` attribute
   syntax — they're ignored gracefully by any Eraser-only parser.

---

## Table of contents

- [1. Lexical layer](#1-lexical-layer)
- [2. Universal grammar](#2-universal-grammar)
- [3. Architecture diagrams](#3-architecture-diagrams)
- [4. Flowcharts](#4-flowcharts)
- [5. Sequence diagrams](#5-sequence-diagrams)
- [6. Entity-relationship diagrams](#6-entity-relationship-diagrams)
- [7. Mindmaps (OctoFocusAI addition)](#7-mindmaps-octofocusai-addition)
- [8. Diagram-type inference](#8-diagram-type-inference)
- [9. Diagram-level directives](#9-diagram-level-directives)
- [10. Icon catalog](#10-icon-catalog)
- [11. OctoFocusAI extensions](#11-octofocusai-extensions)
- [12. Mermaid passthrough](#12-mermaid-passthrough)
- [13. AST shape](#13-ast-shape)
- [14. Errors and partial parses](#14-errors-and-partial-parses)
- [15. Round-trip semantics](#15-round-trip-semantics)
- [16. Out of scope for v1](#16-out-of-scope-for-v1)
- [17. Examples](#17-examples)

---

## 1. Lexical layer

```
COMMENT       ::= "//" <to end of line>
NEWLINE       ::= "\n" | "\r\n"
WHITESPACE    ::= " " | "\t"   (ignored except inside quoted strings)
IDENT         ::= [A-Za-z_][A-Za-z0-9_-]*
QUOTED        ::= "\"" <any char except unescaped "\""> "\""
NAME          ::= IDENT | QUOTED
NUMBER        ::= [0-9]+ ("." [0-9]+)?
HEX_COLOR     ::= "\"#" [0-9A-Fa-f]{3,8} "\""
```

**Reserved characters in unquoted names:** `> < - { } [ ] , : "`
plus the keywords `loop`, `alt`, `else`, `opt`, `par`, `and`, `break`,
`activate`, `deactivate`, `direction`, `colorMode`, `styleMode`,
`typeface`, `notation`.

To use a reserved character or keyword as a name, wrap in `"…"`:

```
User > "https://localhost:8080": GET
"CI/CD" [icon: gear] { id string pk }
```

Comments are line-only — no `/* … */`. Empty lines are allowed and
ignored.

---

## 2. Universal grammar

Everything in the language reduces to four constructs: **declarations,
groups, connections, and directives.**

```
program       ::= ( declaration | connection | directive | block | COMMENT | NEWLINE )*

declaration   ::= NAME attributes? group_body?
group_body    ::= "{" ( declaration | connection | block | NEWLINE )* "}"

connection   ::= NAME ( "." NAME )?       // optional attribute reference (ER)
                 conn_op
                 NAME ( "." NAME )?
                 ( "," NAME ( "." NAME )? )*    // multi-target fan-out
                 ( ":" CONN_LABEL )?
                 attributes?

conn_op       ::= ">" | "<" | "<>" | "-" | "--" | "-->"

attributes    ::= "[" attr_pair ( "," attr_pair )* "]"
attr_pair     ::= IDENT ":" ( IDENT | QUOTED | NUMBER | HEX_COLOR )

directive     ::= "title" QUOTED
                | "direction" ( "down" | "up" | "right" | "left" )
                | "colorMode" ( "pastel" | "bold" | "outline" )
                | "styleMode" ( "shadow" | "plain" | "watercolor" )
                | "typeface" ( "rough" | "clean" | "mono" )
                | "notation" ( "chen" | "crows-feet" )
```

**Key invariants**

- `NAME { … }` makes the node a **group**. Group and node are the same
  primitive; the body promotes it.
- Edges can fan out (`A > B, C, D`) and chain (`A > B > C`).
- A connection that references an undeclared `NAME` auto-creates a blank
  node with that name.
- Attribute values are quoted if they contain spaces or reserved chars.
  Hex colors must be quoted (`"#0a0"`), color names need not (`blue`).
- Attribute keys are extensible; unknown keys are preserved as opaque
  strings on the AST node (round-tripped, but not rendered).

### 2.1 Universal attribute keys

| Key | Values | Default | Notes |
|---|---|---|---|
| `icon` | icon name from the catalog | — | Section 10 |
| `color` | named color or `"#hex"` | — | `red, green, blue, yellow, purple, orange, grey, silver` |
| `label` | string | name of the node | Lets two nodes share a display label |
| `colorMode` | `pastel` `bold` `outline` | `pastel` | Per-node override of the diagram default |
| `styleMode` | `shadow` `plain` `watercolor` | `shadow` | |
| `typeface` | `rough` `clean` `mono` | `rough` | |

### 2.2 Connection attributes

```
A > B: optional label [color: green]
A > B [color: red]                      // unlabeled connection with style
```

Allowed on `[ ]` after a connection:

| Key | Values |
|---|---|
| `color` | named color or `"#hex"` |
| `style` | `dashed` `dotted` `bold` (in addition to the `--` `-->` operators) |
| `label` | redundant with `: <label>`, picked up if both forms appear |

---

## 3. Architecture diagrams

The default kind. Uses sections 2.1 and 2.2 only, plus icons and groups.

```
title "Backend Architecture"

Web [icon: react, color: blue]

AWS [icon: aws] {
  Lambda [icon: aws-lambda]
  Postgres [icon: aws-rds]
  Bucket [icon: aws-s3]
}

Web > Lambda: HTTPS
Lambda > Postgres: query
Lambda > Bucket: read assets
```

**Recognized by:** presence of cloud icons (`aws-*`, `gcp-*`, `azure-*`,
`k8s-*`) **or** groups containing them. No keyword needed.

**Layout:** Dagre, default direction `right`.

---

## 4. Flowcharts

Adds the `shape` attribute. 11 shapes:

```
rectangle (default), cylinder, diamond, document, ellipse,
hexagon, oval, parallelogram, star, trapezoid, triangle
```

Example:

```
direction down

Start [shape: oval, icon: send] > Process [shape: rectangle, color: blue]
Process > Decision [shape: diamond, icon: check-square]
Decision > Success [color: green]: yes
Decision > Retry [color: red]: no
Retry > Process
```

**Recognized by:** presence of `[shape: …]` on at least one node, **or**
a `direction` directive with no other type signals.

**Layout:** Dagre, default direction `down`.

---

## 5. Sequence diagrams

Columns are auto-declared on first reference. Time flows top to bottom.

```
title "User login"

User > Frontend: clicks login
Frontend > Auth: POST /token

alt [label: "If valid"] {
  Auth > Frontend: 200 OK
  Frontend > User: redirect /home
} else [label: "If invalid"] {
  Auth > Frontend: 401
  Frontend > User: show error
}

loop [label: "Every 5 min"] {
  Frontend > Auth: refresh token
}

par {
  Auth > Analytics: log event
} and {
  Auth > Cache: warm session
}

opt [label: "First login only"] {
  Auth > User: send welcome email
}

break [label: "If rate-limited"] {
  Auth > Frontend: 429
}
```

**Block types** (one of):
`loop`, `alt`/`else`, `opt`, `par`/`and`, `break`.
Each accepts an optional `[label: "…", icon: …, color: …]` after the
keyword.

**Activations:**

```
Client > Server: request
activate Server
Server > Client: response
deactivate Server
```

`activate <NAME>` and `deactivate <NAME>` are statements, not edges.

**Recognized by:** presence of any block keyword (`alt`, `opt`, `loop`,
`par`, `break`) or any `activate` / `deactivate` statement. Without
those, a flat list of `A > B: …` edges defaults to architecture mode,
not sequence — the user has to use a block or directive to opt in.

> **Open design question:** should we accept a one-line `participant
> User [icon: user]` declaration like Mermaid does, even though Eraser
> doesn't? Probably yes — it lets you set icons on a column before any
> messages flow. **Decision pending.**

**Layout:** custom vertical pipeline (columns equally spaced left-to-right,
messages stacked top-to-bottom, activation rectangles per `activate`
pair).

---

## 6. Entity-relationship diagrams

Entities use the same `Name { … }` group syntax. The body is a list of
**attribute declarations**, not nested entities.

```
users [icon: user, color: blue] {
  id            uuid pk
  email         varchar unique
  team_id       uuid > teams.id     // inline FK + relationship
  created_at    timestamp
}

teams {
  id            uuid pk
  name          varchar
}

posts {
  id            uuid pk
  user_id       uuid
  body          text
}

// out-of-line relationships
posts.user_id > users.id
```

### 6.1 Attribute declarations

```
attr_decl  ::= IDENT type? metadata*
type       ::= IDENT                 // free-form; common: int, uuid, varchar, text, jsonb, timestamp
metadata   ::= "pk" | "fk" | "unique" | "nullable" | "not_null"
```

Attribute types are **free-form identifiers** — the parser doesn't
validate them. Renderer shows the verbatim text. We don't try to be a
SQL linter.

### 6.2 Cardinality semantics (context-sensitive)

**Inside ER diagrams the connector operators reuse `< > -` `<>` but mean
cardinality, not direction:**

| Symbol | ER meaning |
|---|---|
| `>` | many-to-one (left has many, right has one) |
| `<` | one-to-many |
| `-` | one-to-one |
| `<>` | many-to-many |

The parser switches to ER mode when it sees an `Entity { fields }` block
where the body contains attribute declarations (not nested groups). Once
in ER mode, all connectors are interpreted with ER semantics until the
end of file.

A document is **either** ER **or** non-ER — mixing entity blocks with
flow-style edges in the same canvas is a parse error in v1.

### 6.3 Inline relationship statements

Inside the entity body, you can write a connector right after the
attribute type — it declares the FK and the relationship in one line:

```
posts {
  user_id  uuid > users.id    // declares posts.user_id, links to users.id
}
```

### 6.4 Notation directive

```
notation crows-feet     // default: chen
```

Affects how cardinalities are drawn on edges. Renderer-only — doesn't
change parsing.

**Recognized by:** the first `Name { field declarations }` block, where
"attribute declarations" means lines that are not themselves
declarations or groups.

**Layout:** table grid — entities laid out left-to-right in declaration
order, edges routed between attribute rows.

---

## 7. Mindmaps (OctoFocusAI addition)

Mindmaps are a tree of nodes. Uses the same `Name { children }` group
syntax with no attributes carrying special meaning beyond `icon`,
`color`, `label`.

```
"AI workspace" {
  Capture {
    Web clipper
    Voice input
    Email forward
  }
  Synthesize {
    AI write-with-me
    Summaries
    Flashcards
  }
  Share {
    Public URL
    Embed widget
    PDF export
  }
}
```

**Recognized by:** a single root group with no edges in the document,
**or** the explicit directive (see below — under deliberation):

```
direction radial   // proposed; radial isn't valid for other types
```

**Layout:** radial — root at center, children at increasing radii.

> **Open design question:** Eraser doesn't have a mindmap mode. Either
> we add a `direction radial` (cleanest — fits existing direction
> system), or we accept that any treelike doc with no edges defaults to
> mindmap layout. **Lean toward the former.**

---

## 8. Diagram-type inference

The parser scans the AST once and picks a single `kind`:

| Detected when | Inferred kind |
|---|---|
| Any block keyword (`alt`, `opt`, `loop`, `par`, `break`) OR any `activate`/`deactivate` | `sequence` |
| Any `Name { field decls }` block | `er` |
| Any node has `[shape: …]` OR a `direction down`/`up`/`left`/`right` directive | `flowchart` |
| Any icon in `{aws-*, gcp-*, azure-*, k8s-*}` OR a group containing them | `architecture` |
| `direction radial` OR a single rooted group with no edges | `mindmap` |
| Otherwise | `architecture` (fallback) |

**Resolution order** is top-down in the table — first match wins. So a
doc with both shape attributes and ER entities is classified as `er`
(the entity block fires first by row order). If that's wrong, the user
adds `direction down` to force flowchart, or removes the entity block.

**Conflict handling:** if a doc has both block keywords AND entity
blocks, we emit a parse error rather than silently picking one.

---

## 9. Diagram-level directives

These are statements at the top level (not inside any group). All are
optional, all have defaults.

```
title           "My architecture"
direction       right       // down | up | right | left (radial reserved for mindmap)
colorMode       pastel      // pastel | bold | outline
styleMode       shadow      // shadow | plain | watercolor
typeface        rough       // rough | clean | mono
notation        chen        // chen | crows-feet  (ER only)
```

`direction` defaults by kind: `down` for flowchart and sequence,
`right` for architecture and ER, `radial` for mindmap.

Directives can appear anywhere — first occurrence wins.

---

## 10. Icon catalog

We vendor Eraser's icon name registry as `packages/diagrams/icons.json`.
**1,824 icons in 7 categories:**

| Category | Count | Notes |
|---|---|---|
| Azure | 488 | full official Azure architecture set |
| AWS | 372 | full official AWS architecture set |
| Tech Logos | 360 | GitHub, Slack, Datadog, Notion, Vercel, … |
| General (Lucide) | 322 | same Lucide set we already ship — free |
| Google Cloud | 216 | full official GCP set |
| Kubernetes | 40 | control-plane, etcd, node, kubelet, … |
| Networking | 26 | router, firewall, load-balancer, … |

**v1 ship list** — ~300 of the 1,824:
- All 322 General icons (no extra weight; we already use Lucide)
- Top 50 AWS by usage frequency
- Top 30 GCP
- Top 30 Azure
- All 40 K8s
- All 26 Networking
- Top 80 Tech Logos

Long tail loads on demand via a code-split SVG sprite per category.

**Custom user icons** (OctoFocusAI extension, see §11): users upload an
SVG, reference as `[icon: my-org-logo]`. Stored as a `canvas_asset` with
`kind = "icon"`.

---

## 11. OctoFocusAI extensions

All of these live inside the same `[ ]` attribute syntax. Eraser-only
parsers ignore unknown keys; ours renders them.

### `math: "<latex>"`

KaTeX-rendered LaTeX inside any node label. Useful for ML / infra docs.

```
"Cache hit rate" [math: "p_{hit} = \\frac{H}{H + M}"]
```

### `comment: "<thread-id>"` or `comment: "text"`

Pins a comment thread to the shape. If the value is a `cmt_<uuid>`,
it links to an existing thread; if it's a free string, it creates a
thread on first save with that initial body. Rendered as a badge on
the corner of the shape.

```
"User Service" [icon: server, comment: "needs review before launch"]
```

### `embed: "<doc-id>"`

Embeds a live preview of another OctoFocusAI doc (note, canvas, or
artifact) inside the shape. Re-renders when the embedded doc changes.

```
"Auth design" [embed: "pag_01H...XYZ"]
```

### `note: "<page-id>" | "<page-slug>"`

A "see also" backlink. The shape gets a small icon that opens the
linked note in a side panel.

```
"Service mesh" [note: "service-mesh-rfc"]
```

### Custom icons

```
"Acme" [icon: ast_01H...QRS]      // canvas_asset id with kind=icon
```

The renderer detects the `ast_` prefix and loads the SVG from the asset
store instead of the icon catalog.

---

## 12. Mermaid passthrough

If the DSL drawer source starts with a Mermaid opener:

```
sequenceDiagram
    Alice->>Bob: Hello
```

…or any line matches `^(sequenceDiagram|flowchart|erDiagram|classDiagram|stateDiagram|graph (TD|LR|BT|RL)|mindmap)\b`, we hand the entire source to `mermaid.js` and bypass our parser.

Detected at top of file only. Mixed Eraser + Mermaid syntax in one
document is **not** supported in v1.

---

## 13. AST shape

The parser emits an `OctoFocusAIDiagram` v2:

```ts
type OctoFocusAIDiagram = {
  kind: "architecture" | "flowchart" | "sequence" | "er" | "mindmap";
  title?: string;
  directives: {
    direction?: "down" | "up" | "left" | "right" | "radial";
    colorMode?: "pastel" | "bold" | "outline";
    styleMode?: "shadow" | "plain" | "watercolor";
    typeface?: "rough" | "clean" | "mono";
    notation?: "chen" | "crows-feet";
  };
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  blocks?: SequenceBlock[];      // sequence only
  activations?: Activation[];    // sequence only
  metadata?: Record<string, unknown>;
};

type DiagramNode = {
  id: string;                    // generated from name; stable across reparses
  name: string;                  // source identifier
  label?: string;                // display label (defaults to name)
  parentId?: string;             // for groups and ER attribute parents
  isGroup: boolean;
  // ER-only: attribute rows
  attributes?: EntityAttribute[];
  // styling
  icon?: string;
  color?: string;
  shape?: FlowchartShape;        // flowchart only
  style?: ConnectionStyle;
  // OctoFocusAI extensions (opaque to renderer-validate)
  math?: string;
  comment?: string;
  embed?: string;
  note?: string;
  // round-trip — keys we didn't recognize, preserved verbatim
  extra?: Record<string, string>;
};

type DiagramEdge = {
  id: string;
  sourceId: string;              // refers to node.id
  targetId: string;
  sourceAttr?: string;           // ER inline attribute (e.g. "team_id")
  targetAttr?: string;
  operator: ">" | "<" | "<>" | "-" | "--" | "-->";
  label?: string;
  color?: string;
  style?: "dashed" | "dotted" | "bold";
  // ER semantics, populated only when kind === "er"
  erCardinality?: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
};

type SequenceBlock = {
  id: string;
  kind: "loop" | "alt" | "opt" | "par" | "break";
  label?: string;
  icon?: string;
  color?: string;
  edgeIds: string[];             // edges contained in this block
  alternates?: SequenceBlock[];  // alt → else, par → and
};

type Activation = {
  participantId: string;
  startEdgeId: string;
  endEdgeId: string;
};

type EntityAttribute = {
  name: string;
  type?: string;
  modifiers: ("pk" | "fk" | "unique" | "nullable" | "not_null")[];
};
```

`id` for nodes is `slugify(name) + counter` — stable across reparses
of the same source, so visual edits that move shapes around don't lose
their tldraw position cache.

---

## 14. Errors and partial parses

Parsers fail soft. The return shape is:

```ts
type ParseResult = {
  diagram: OctoFocusAIDiagram;          // best-effort partial
  errors: ParseError[];
};

type ParseError = {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
  // optional pointer back to AST nodes built from later, valid lines
  recoveredAtLine?: number;
};
```

**Rules:**

- A malformed line is dropped, parsing continues at the next line.
- A malformed block (`alt { …`) consumes until matching `}` or EOF; any
  edges parsed inside are dropped.
- Forward references to undeclared names are **not** errors — they
  auto-create blank nodes (matches Eraser behavior).
- Mixed-mode conflicts (block keywords + ER entities in the same doc)
  ARE errors.
- Unknown attribute keys are **warnings**, not errors.

Renderer policy: render the diagram from whatever the parser returned,
overlay error markers in the DSL drawer's gutter.

---

## 15. Round-trip semantics

When the user edits visually and we serialize back to DSL:

**Preserved:**
- All node/group names, attributes (recognized and unrecognized)
- Edge directions and operators
- Block structure for sequence
- Directive lines
- ER entity bodies including attribute order

**Lost:**
- Comments
- Blank lines
- Trailing whitespace
- Original attribute-key order within a single `[ … ]`
- Statement order across the file (we re-emit groups before edges)

This is a known tradeoff; preserving exact source text would require an
incremental editor model (CST not AST) which is out of scope for v1.

---

## 16. Out of scope for v1

- **Custom CST / incremental parsing.** We parse the whole doc every
  keystroke (debounced). Acceptable up to ~10k lines.
- **Macros / imports** (`@include other.dsl`). No.
- **Loops / variables.** No `for x in …`. The grammar stays
  declarative.
- **Color palettes / themes.** Only the named colors and hex codes
  listed in §2.1. No `palette: corporate` indirection in v1.
- **Linting / autoformat.** We can add a `serializeDsl(parsed)` that
  emits canonical form, but `lint` against a style guide is later.

---

## 17. Examples

### 17.1 Architecture

```
title "Notes service"

direction right
colorMode bold

WebApp [icon: react]

API Gateway [icon: aws-api-gateway, color: orange]

Services {
  Auth [icon: aws-lambda]
  Notes [icon: aws-lambda]
  Search [icon: aws-lambda]
}

Postgres [icon: aws-rds]
S3 [icon: aws-s3, label: "Asset bucket"]

WebApp > API Gateway
API Gateway > Auth, Notes, Search
Notes > Postgres
Notes > S3
```

### 17.2 Flowchart

```
title "Note publish flow"
direction down

Start [shape: oval] > "Validate input" [shape: rectangle]
"Validate input" > Valid? [shape: diamond]
Valid? > Save [color: green]: yes
Valid? > "Show error" [color: red]: no
Save > "Generate OG image" [shape: rectangle]
"Generate OG image" > "Update CDN" [shape: cylinder]
"Update CDN" > End [shape: oval]
"Show error" > Start
```

### 17.3 Sequence

```
title "Magic link login"

User [icon: user] > Web [icon: monitor]: enters email
Web > Auth: POST /otp

alt [label: "Email valid"] {
  Auth > Mailer: send link
  Mailer > User: email
  User > Web: clicks link
  Web > Auth: POST /verify

  activate Auth
  Auth > Web: 200 + session
  Web > User: redirect /app
  deactivate Auth
} else [label: "Rate limited"] {
  Auth > Web: 429
  Web > User: "try again later"
}

opt [label: "First login"] {
  Auth > Mailer: welcome email
}
```

### 17.4 ER

```
title "Workspace model"
notation crows-feet

users [icon: user] {
  id              uuid pk
  email           varchar unique
  created_at      timestamp
}

workspaces {
  id              uuid pk
  name            varchar
  slug            varchar unique
  owner_id        uuid > users.id      // FK + relationship inline
}

workspace_members {
  id              uuid pk
  workspace_id    uuid > workspaces.id
  user_id         uuid > users.id
  role            varchar
}
```

### 17.5 Mindmap

```
title "OctoFocusAI pillars"
direction radial

"OctoFocusAI" [icon: zap] {
  "AI co-author" {
    "/ai in notes"
    "/ai on canvas"
    "Voice in"
  }
  "Cross-surface" {
    "Inline canvas embeds"
    "@page mentions"
    "Linked split view"
  }
  "Findability" {
    "Cmd-K palette"
    "Semantic search"
    "Outline panel"
  }
  "Distribution" {
    "Public URLs"
    "Embed widget"
    "GitHub bot"
    "CLI"
  }
  "Artifacts" {
    "Flashcards"
    "Quiz"
    "Mindmap"
    "Infographic"
  }
}
```

### 17.6 OctoFocusAI extensions

```
title "Auth design with backlinks"

"Auth Service" [
  icon: aws-lambda,
  note: "auth-rfc",
  comment: "needs review before launch"
] {
  "Rate limit" [math: "r = \\frac{60}{n_{ip}}"]
  "Magic link"
  "OAuth"
}

"Auth Service" > "Acme Corp" [icon: ast_01H...QRS]   // custom icon asset
"Auth Service" > "Design doc" [embed: "pag_01H...XYZ"]
```

---

## Open questions to lock before coding

1. **`participant <Name>` declarations in sequence mode** — accept it
   for parity with Mermaid users, or reject for Eraser purity?
2. **`direction radial`** for mindmap — explicit directive, or auto-detect
   from "treelike + no edges"?
3. **Mixed kinds** — should we ever allow architecture nodes inside an
   ER document for high-level annotation, or strict separation?
4. **Asset-id references in `icon:`** — `ast_<uuid>` prefix is the
   discriminator, or do we want a `[icon: custom("ast_…")]` wrapper for
   clarity?
5. **Block nesting in sequence** — Eraser docs are quiet on whether
   `alt { alt { … } }` is allowed. Lean: yes, parser recursive anyway.
6. **Comment-as-attribute** — `[comment: "text"]` creates a thread on
   save. Should the thread also be visible to anonymous viewers on
   public URLs? Probably no — comments stay workspace-internal.
