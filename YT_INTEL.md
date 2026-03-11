# yt-intel Runbook (context-first)

Single page to brief humans/LLMs: what this tool does, how to run it, configs, data contracts, failure modes, and roadmap. Primary stack: TypeScript/Node (NodeNext ESM, tsx). No live Python code; only historical baselines in tests.

## TL;DR
- Runtime: Node `v22.22.0` (`.nvmrc` and `.node-version` are committed for repo-local alignment).
- Purpose: fetch YouTube transcript data into stable JSON artifacts with retries/backoff and deterministic exports.
- Key commands: `npm run fetch -- <VIDEO_ID> [lang] [channel]`; `npm run batch`; `npm run export [channels...]`.
- Data locations: per-video JSON `video_data/<channel>/<id>.json` (gitignored); exports `exports/<channel>.json`; baselines in `tests/fixtures/python_baseline/video_data/` (do not delete).
- Tests: `npm test` (unit + CLI + e2e); typecheck `npm run typecheck`.

## Command Sheet
| Script | Input | Output | Exit codes | Notes |
| --- | --- | --- | --- | --- |
| `npm run fetch -- <VIDEO_ID> [lang] [channel]` | Video ID, optional lang/channel | `video_data/<channel>/<id>.json` | 0 ok; 100 no_subs; 1 error | Uses `src/flows/fetchSingle.ts` + youtube client |
| `npm run batch` | `video_db.json` entries | Updates `video_db.json`, writes per-video JSON | same as fetch per video | Honors delays/backoff/cooldowns; statuses `pending|success|error|no_subs` |
| `npm run export [channels...]` | Channel list (defaults DevOops_conf, HighLoadChannel) | `exports/<channel>.json` | 0/1 | Combines per-video files in sorted order |

## Config (.env)
| Key | Default | Type | Used in | Notes |
| --- | --- | --- | --- | --- |
| `YT_INTEL_API_KEYS` | (required) | comma list | `src/config.ts` | Preferred name; `API_KEYS` still accepted |
| `YT_INTEL_USER_AGENTS` | built-in fallback list | comma list | `src/config.ts` | Preferred name; `USER_AGENTS` still accepted |
| `YT_INTEL_LANG` | `ru` | string | `src/config.ts` | Preferred name; legacy `LANG` still accepted |
| `YT_INTEL_MIN_DELAY` | `1.5` | seconds | `src/config.ts` | Preferred name; legacy `MIN_DELAY` still accepted |
| `YT_INTEL_MAX_DELAY` | `3.5` | seconds | `src/config.ts` | Preferred name; legacy `MAX_DELAY` still accepted |
| `YT_INTEL_LOG_LEVEL` | `info` | enum | `src/logger.ts` | Preferred name; legacy `LOG_LEVEL` still accepted |
| Client/backoff constants | — | numbers | `src/config.ts` | Cooldowns, error streak limits, client versions |

## Data Contracts
- Per-video JSON (written by fetch): `{ video_id, channel, title, views:int, duration:int, published, text }` at `video_data/<channel>/<id>.json`.
- Combined export: array of the same objects in `exports/<channel>.json`.
- `video_db.json` entry statuses: `pending | success | error | no_subs`.
- Baselines: `tests/fixtures/python_baseline/video_data/` — canonical outputs from legacy Python; required for e2e.

## Flow Sketches
- **Fetch**: parse args/env → youtubei player with key/UA rotation → pick ASR track for `lang` → download srv3 → parse to text → write JSON → exit code (0/100/1).
- **Batch**: load `video_db.json` → for each pending apply initial delay → call fetchSingle with retries/backoff → on errors use cooldowns (short/long) → update status back to DB.
- **Export**: for requested channels (or defaults) glob `video_data/<channel>/*.json` → merge into array → write `exports/<channel>.json`.

## Failure Modes & Handling
- Missing API keys: fail fast at startup.
- Player 403/429/timeouts: retries with backoff and key/UA rotation; may mark `error` after streak limits.
- No subtitles: fetch exits 100, batch marks `no_subs` and continues.
- Malformed srv3: parse error surfaces as failure (exit 1) for that video.

## Testing Matrix
- Lint/typecheck: `npm run lint` (tsc --noEmit).
- Unit/CLI: part of `npm test` (see `tests/*.test.ts`, fixtures in `tests/fixtures/`).
- E2E: `tests/e2e.test.ts` compares TS output against `tests/fixtures/python_baseline/video_data/DevOops_conf/-kq832Othh4.json` with stubbed network; keep baselines stable.

## Roadmap (next)
- Improve player-response typing to remove remaining `any` usage around response parsing.
- Standardize CLI UX and exit behavior across commands.
- Curate smaller sample outputs for easier public review.
- Keep the adapter approach documented without broadening the project into a larger app.

## Boundaries & History
- Legacy Python code removed; only data baselines remain.
- This runbook replaces prior docs (`docs/`, TRANSCRIPT_TOOL, js-port notes, etc.).
- Large runtime datasets remain local and gitignored; public readers should rely on fixtures and curated samples rather than full exports.

## File Map (current)
- Code: `src/` (cli, flows, clients, captions, utils); `tsconfig.json`, `package.json`.
- Tests: `tests/` with fixtures in `tests/fixtures/` (includes python_baseline).
- Data: `examples/`, `video_data/`, `exports/`, `video_db*.json`, archives in `archive/`.
- Docs: `README.md` (quick start), `YT_INTEL.md` (this file).
