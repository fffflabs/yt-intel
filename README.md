# yt-intel

Small TypeScript CLI for resilient YouTube transcript ingestion.

The project fetches player metadata, selects caption tracks, downloads `srv3` subtitles, normalizes them into plain text, and writes typed JSON artifacts for downstream analysis. The repo is intentionally scoped as a clean CLI/data-pipeline showcase rather than a larger app.

## What it does

- Fetches transcript data for a single video or a batch of video IDs
- Retries transient player request failures with backoff and cooldown windows
- Normalizes caption XML into compact text output
- Writes per-video records under `video_data/`
- Produces combined channel exports under `exports/`

## Quick start

1. Use Node `v22.22.0`
2. Run `npm install`
3. Copy `.env.example` to `.env` and set `YT_INTEL_API_KEYS`
4. Fetch one video: `npm run fetch -- VIDEO_ID [lang] [channel]`
5. Export combined channel data: `npm run export [channels...]`

## Configuration

Preferred environment variables are app-scoped:

```env
YT_INTEL_API_KEYS=your_api_key1,your_api_key2
YT_INTEL_USER_AGENTS=agent1,agent2
YT_INTEL_LANG=ru
YT_INTEL_MIN_DELAY=1.5
YT_INTEL_MAX_DELAY=3.5
YT_INTEL_LOG_LEVEL=info
```

Legacy names such as `API_KEYS` and `LANG` are still accepted for compatibility.

## Project layout

- `src/` application code
- `tests/` unit, CLI, and regression coverage
- `examples/` small curated sample artifacts for quick review
- `video_data/` per-video transcript records
- `exports/` combined per-channel JSON exports
- `lists/` channel input lists
- `archive/` historical artifacts kept out of the main flow

Large local datasets are intentionally gitignored. The public repo contract is the code, docs, fixtures, and small representative samples, not the full working dataset from a local machine.

## Development

- `npm run typecheck`
- `npm test`
- `npm run build`

## Notes

The current implementation uses the `youtubei/v1/player` endpoint as its source adapter. That detail is documented here because it affects reliability and maintenance, but it is not the main design goal of the project.

## More documentation

- `YT_INTEL.md` for the runbook and operational notes
- `README_DATA.md` for the data layout contract
- `examples/README.md` for tiny representative outputs
- `docs/architecture.md` for the code structure and design decisions
