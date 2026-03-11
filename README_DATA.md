# Data layout (yt-intel)

Canonical flow for bot/web:
- Channel registry: `channels.json` — id/slug/title/lang + paths to list, transcripts dir, export file.
- Video lists (input): `lists/<channel>.txt` — one video ID per line.
- Transcripts (canonical): `video_data/<channel>/<video>.json` — per-video outputs.
- Exports (combined): `exports/<channel>.json` — array of per-video records.
- Legacy/extra: `archive/legacy/per_video/` holds old per-video dumps; `archive/legacy/tools/` holds old scripts/logs; other archived artifacts stay in `archive/`.

Rules:
- Do not delete `video_data/` or `tests/fixtures/python_baseline/`.
- Prefer writing new channel lists under `lists/` and exports under `exports/`.
- If regenerating exports, overwrite in `exports/` and (optionally) archive old versions under `archive/`.
