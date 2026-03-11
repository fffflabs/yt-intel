# yt-intel — YouTube transcript fetcher

TypeScript CLI to pull YouTube ASR transcripts in bulk using `youtubei/v1/player`, with retries, backoff, and clean JSON outputs.

## Quick start
- Install: `npm install`
- Configure `.env` (example below)
- Fetch one: `npm run fetch -- VIDEO_ID [lang] [channel]`
- Batch from `video_db.json`: `npm run batch`
- Export per-channel JSON: `npm run export [channels...]`

### .env sample
```env
API_KEYS=your_api_key1,your_api_key2
USER_AGENTS=agent1,agent2
LANG=ru
MIN_DELAY=1.5
MAX_DELAY=3.5
LOG_LEVEL=info
```

## Outputs
- Per-video JSON at `video_data/<channel>/<id>.json`
- Combined exports `<channel>.json` in repo root

## Develop
- Lint/typecheck: `npm run lint`
- Tests (unit + CLI + e2e): `npm test`

## More info
See `yt-intel.md` for the full runbook (stack, config, data layout, roadmap).
