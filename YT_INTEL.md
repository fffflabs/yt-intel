# yt-intel Runbook (context-first)

Single page to brief humans/LLMs: what this tool does, how to run it, configs, data contracts, failure modes, and roadmap. Primary stack: TypeScript/Node (NodeNext ESM, tsx). No live Python code; only historical baselines in tests.

## TL;DR
- Purpose: bulk fetch YouTube ASR transcripts via `youtubei/v1/player`, with retries/backoff, and export clean JSON.
- Key commands: `npm run fetch -- <VIDEO_ID> [lang] [channel]`; `npm run batch`; `npm run export [channels...]`.
- Data locations: per-video JSON `video_data/<channel>/<id>.json` (gitignored); exports `<channel>.json` in repo root; baselines in `tests/fixtures/python_baseline/video_data/` (do not delete).
- Tests: `npm test` (unit + CLI + e2e); lint/typecheck `npm run lint`.

## Command Sheet
| Script | Input | Output | Exit codes | Notes |
| --- | --- | --- | --- | --- |
| `npm run fetch -- <VIDEO_ID> [lang] [channel]` | Video ID, optional lang/channel | `video_data/<channel>/<id>.json` | 0 ok; 100 no_subs; 1 error | Uses `src/flows/fetchSingle.ts` + youtube client |
| `npm run batch` | `video_db.json` entries | Updates `video_db.json`, writes per-video JSON | same as fetch per video | Honors delays/backoff/cooldowns; statuses `pending|success|error|no_subs` |
| `npm run export [channels...]` | Channel list (defaults DevOops_conf, HighLoadChannel) | `<channel>.json` in repo root | 0/1 | Combines per-video files |

## Config (.env)
| Key | Default | Type | Used in | Notes |
| --- | --- | --- | --- | --- |
| `API_KEYS` | (required) | comma list | `src/config.ts` | Empty set fails fast |
| `USER_AGENTS` | (required) | comma list | `src/config.ts` | Rotated per request |
| `LANG` | `ru` | string | `src/config.ts` | System `LANG` can override; pass CLI arg to force |
| `MIN_DELAY` | `1.5` | seconds | `src/config.ts` | Batch spacing |
| `MAX_DELAY` | `3.5` | seconds | `src/config.ts` | Batch spacing |
| `LOG_LEVEL` | `info` | enum | `src/logger.ts` | `debug|info|warn|error` |
| Client/backoff constants | — | numbers | `src/config.ts` | Cooldowns, error streak limits, client versions |

## Data Contracts
- Per-video JSON (written by fetch): `{ video_id, channel, title, views:int, duration:int, published, text }` at `video_data/<channel>/<id>.json`.
- Combined export: array of the same objects in `<channel>.json`.
- `video_db.json` entry statuses: `pending | success | error | no_subs`.
- Baselines: `tests/fixtures/python_baseline/video_data/` — canonical outputs from legacy Python; required for e2e.

## Flow Sketches
- **Fetch**: parse args/env → youtubei player with key/UA rotation → pick ASR track for `lang` → download srv3 → parse to text → write JSON → exit code (0/100/1).
- **Batch**: load `video_db.json` → for each pending apply initial delay → call fetchSingle with retries/backoff → on errors use cooldowns (short/long) → update status back to DB.
- **Export**: for requested channels (or defaults) glob `video_data/<channel>/*.json` → merge into array → write `<channel>.json` in root.

## Failure Modes & Handling
- Missing `API_KEYS`/`USER_AGENTS`: fail fast at startup.
- Player 403/429/timeouts: retries with backoff and key/UA rotation; may mark `error` after streak limits.
- No subtitles: fetch exits 100, batch marks `no_subs` and continues.
- Malformed srv3: parse error surfaces as failure (exit 1) for that video.

## Testing Matrix
- Lint/typecheck: `npm run lint` (tsc --noEmit).
- Unit/CLI: part of `npm test` (see `tests/*.test.ts`, fixtures in `tests/fixtures/`).
- E2E: `tests/e2e.test.ts` compares TS output against `tests/fixtures/python_baseline/video_data/DevOops_conf/-kq832Othh4.json` with stubbed network; keep baselines stable.

## Roadmap (next)
- Channel resolver: URL/handle → channel ID + capped ID list (YouTube Data API or youtubei feed/search).
- Fetcher as callable: export batch/single functions for programmatic use (CLIs stay).
- Job runner: accept ID list, run with backoff, produce export artifact.
- Telegram flow: `/fetch` handler, delivery (zip/size handling), per-user limits, logging/metrics.
- Delivery/size handling: zip large outputs, friendly messages for no-subtitles cases.

## Boundaries & History
- Legacy Python code removed; only data baselines remain.
- This runbook replaces prior docs (`docs/`, TRANSCRIPT_TOOL, js-port notes, etc.).

## File Map (current)
- Code: `src/` (cli, flows, clients, captions, utils); `tsconfig.json`, `package.json`.
- Tests: `tests/` with fixtures in `tests/fixtures/` (includes python_baseline).
- Data: `video_data/`, `video_db*.json`, exports in repo root (gitignored); archives in `archive/` if present.
- Docs: `README.md` (quick start), `YT_INTEL.md` (this file).
