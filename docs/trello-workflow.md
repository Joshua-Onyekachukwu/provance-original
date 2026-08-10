# Trello Workflow — CLI Sync

**Purpose:** Keep the Trello board the single source of truth for *tracking* development progress, while the docs under `docs/` remain the source of truth for *specification*. The CLI (`scripts/trello.mjs`) is a zero-dependency bridge between the two: it pushes cards from a JSON spec, moves them as work progresses, and snapshots the board back into the repo.

**Zero dependencies:** Node 18+ only (builtin `fetch`, `fs`, `path`, `url`). No npm install, no Trello SDK.

---

## 1. Get API credentials

1. Open the [Trello Power-Ups Admin](https://trello.com/power-ups/admin) and create an **API Key** (classic API key flow).
2. On that same page, click **Token** (under the key) and **Allow** — this generates a long-lived token.
3. Export both:

```bash
export TRELLO_API_KEY="your-api-key"
export TRELLO_TOKEN="your-token"
```

> Put these in your shell profile or a `.env.local` you source manually — `.env*` is gitignored. The CLI never writes secrets to disk.

## 2. Quick start

```bash
# 1. Create the board + lists + labels (idempotent; caches the board id)
npm run trello -- init

# 2. Push the starter spec (creates/updates cards; idempotent by title)
npm run trello -- push --spec scripts/trello.spec.json

# 3. Preview the board as markdown in the repo
npm run trello -- snapshot            # writes docs/trello-board.md

# 4. Move work along as you complete it
npm run trello -- move "Scan upload + queue round-trip" Done

# 5. Leave evidence links on a card
npm run trello -- comment "Scan upload + queue round-trip" "Live-verified against Supabase — see PR #42"
```

The board id is cached in `scripts/.trello-state.json` (gitignored). Override any time with `--board <id>`.

## 3. Command reference

| Command | What it does | Key flags |
|---|---|---|
| `init` | Find-or-create the board, default lists, and the label taxonomy | `--name Board` (default `Provance`), `--lists a,b,c` |
| `push` | Upsert cards from a JSON spec (create new, update existing by title) | `--spec path` (default `scripts/trello.spec.json`), `--dry-run`, `--board id` |
| `move <card> <list>` | Move a card to another list (card = title or 24-hex id) | — |
| `comment <card> "text"` | Post a comment on a card | — |
| `snapshot` | Write `docs/trello-board.md` (lists, cards, labels, summary) | `--out path` |
| `status` | Print a list/phase/type/priority distribution to the console | `--board id` |
| `--help` | Usage | — |

`init` and `push` **create** the board when it doesn't exist; `move`, `comment`, `snapshot`, and `status` only **resolve** an existing board (via the cached id, `--board`, or a name match) and error out on a typo instead of silently creating an empty board — run `init` first if you haven't.

All commands are **idempotent**: boards, lists, labels, and cards are matched by name and reused, never duplicated. `push` updates the description, labels, and list of an existing card with the same title instead of creating a second card — safe to re-run after editing the spec.

**Rate limits:** the client throttles to ~4 requests/second, safely under Trello's per-key limit. Large snapshots just take a few extra seconds.

## 4. The spec schema

`scripts/trello.spec.json` (or any path via `--spec`) describes the board:

```json
{
  "board": "Provance",
  "lists": ["Backlog", "In Progress", "Done"],
  "cards": [
    {
      "title": "Scan upload + queue round-trip",
      "list": "In Progress",
      "phase": "Phase 3",
      "type": "Backend",
      "priority": "P0",
      "desc": "Optional long description.",
      "acceptance": ["POST /scans returns a signed upload URL", "Worker completes the scan"],
      "links": ["https://github.com/Joshua-Onyekachukwu/provance-original"]
    }
  ]
}
```

**Fields:**

| Field | Required | Notes |
|---|---|---|
| `board` | no | Board name to find/create (default `Provance`) |
| `lists` | no | List names; missing ones are created (default Backlog / In Progress / Done) |
| `cards[].title` | yes | Must be unique; used for idempotent matching |
| `cards[].list` | no | Must be declared in `lists` (default `Backlog`) |
| `cards[].phase` | no | `"Phase 3"`, `"3"`, or `"Phase: 3"` → label `Phase: 3`; `"Post-MVP"` → `Phase: Post-MVP` (deferred themes) |
| `cards[].type` | no | One of Feature, Fix, Backend, Frontend, Docs, Test, Design, Ops, Admin → label `Type: X` |
| `cards[].priority` | no | `P0`–`P3` → label `Priority: Px` |
| `cards[].acceptance` | no | Rendered as a `- [ ]` checklist under "Acceptance criteria" |
| `cards[].links` | no | Rendered as a Links section |
| `labels` | no | Extra `{ "name", "color" }` labels beyond the taxonomy |

`push` validates the whole spec **before any network call** and fails fast with a list of errors (unknown list, unknown type, duplicate titles, malformed acceptance, …).

**Label taxonomy** (created by `init`, matched by name): phases 1–6 (sky) + `Phase: Post-MVP` (black), types with distinct colors, priorities P0 (red) / P1 (orange) / P2 (yellow) / P3 (lime).

## 6. Board content

The full board spec in `scripts/trello.spec.json` ships **32 cards** generated from `docs/project-state/current-feature-status.md` and `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`: 15 shipped (Done), 5 in flight (In Progress — scan dedup, org module, notifications/sessions backend, live e2e validation), and 12 queued (Backlog — approved-but-unbuilt features, Phase 4–6 pipeline/security/launch slices, and deferred post-MVP themes). Regenerate or extend it whenever a phase's status changes, then re-run `push` — it upserts by title, so edited cards update in place.

## 5. Workflow

1. **Plan → cards:** when a phase/feature is approved, add its cards to `scripts/trello.spec.json` and run `push`.
2. **Start work:** `move <card> "In Progress"`.
3. **Finish work:** `move <card> "Done"` and `comment` with the PR/report link.
4. **Keep the repo in sync:** run `snapshot` after each milestone so `docs/trello-board.md` reflects the live board (or run `status` for a quick console view).
5. **Review:** cards carry phase/type/priority labels and acceptance criteria, so a quick board glance shows what's shipped vs. in flight and whether P0 work is blocked.

The CLI intentionally keeps *tracking* on Trello and *specification* in `docs/` — the two stay linked through the spec file and the snapshot.
