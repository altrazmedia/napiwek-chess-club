# Agent instructions

Read every file in `docs/` before planning or changing anything in this repo. Those files are the source of truth for product intent, locked technical decisions, and the database schema.

| File | What it locks |
| --- | --- |
| [docs/app-overview.md](docs/app-overview.md) | What the product is, who it is for, and product behavior: features, data rules, ordering, filters, and scope. Not layout or component UI. |
| [docs/tech-stack.md](docs/tech-stack.md) | Languages, libraries, hosting, and architecture |
| [docs/schema.md](docs/schema.md) | Tables, enums, indexes, and what must not be stored |

Also read any new file added under `docs/` later. Do not invent requirements that are not in these docs.

## Before you change code

1. Read the docs that the change touches. A schema change needs `schema.md` and `tech-stack.md`. A change to product behavior or an API contract needs `app-overview.md` and `tech-stack.md`. A layout, styling, copy, or component-only change does not need a doc update. When in doubt about behavior, read all of them.
2. Compare the plan to those docs.
3. If the plan contradicts a locked decision, stop. Tell the user what the docs say, what you planned, and why they conflict. Ask for confirmation before editing code or docs.
4. If the docs are silent, do not fill the gap yourself. Ask, or stay inside what is already written. Deferred items stay deferred.

## Keep the docs current

The same change that alters a locked decision must update the matching doc in the same piece of work.

- Product behavior, audience, or scope → `docs/app-overview.md`
- Stack, hosting, libraries, or architecture → `docs/tech-stack.md`
- Tables, columns, enums, indexes, or what is stored vs derived → `docs/schema.md`

`docs/app-overview.md` locks features and the rules that make them correct: which data a view shows, ordering, filters, ranking, upload and identity rules, and what is in or out of scope. Do not record page layout, visual design, component structure, breakpoints, icons, colors, alignment, or exact UI copy there. Those can change without a doc update.

Before implementing, say which docs you will update and what will change in them. If no doc needs an update, say that explicitly. Do not leave the code and the docs describing different systems.

## After you change code

- After implementing changes, run `npm run format`.
- Before pushing, run `npm run check`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
