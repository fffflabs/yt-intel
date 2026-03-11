# Architecture

## Intent

`yt-intel` is a deliberately small CLI pipeline. The goal is to keep transcript ingestion understandable, testable, and easy to operate from a terminal without turning the repository into a broader platform.

## Structure

- `src/cli/` parses arguments, prints help, and maps outcomes to exit codes
- `src/flows/` owns orchestration such as fetch, transform, and write
- `src/clients/` contains external source adapters
- `src/captions/` handles caption-track selection and XML-to-text normalization
- `src/utils/` keeps small generic helpers out of the main flows

## Data flow

1. A CLI command resolves the requested video ID, language, and channel.
2. The YouTube client fetches player data with retries, key rotation, and backoff.
3. Caption parsing selects the best available track for the requested language.
4. The caption downloader requests `srv3` subtitles and normalizes them into plain text.
5. The flow writes a stable JSON record to `video_data/<channel>/<video>.json`.
6. Export commands merge per-video records into `exports/<channel>.json`.

## Design choices

- Small modules over framework adoption: the codebase is simple enough that bespoke modules are clearer than bringing in a CLI or validation framework.
- Typed outputs over loose scripting: transcript artifacts are shaped consistently so downstream consumers have a stable contract.
- Backward-compatible config cleanup: app-scoped env vars are preferred, while older names remain supported to avoid breaking local setups.
- Deterministic exports: export inputs are sorted before writing so generated outputs are predictable and diff-friendly.

## Boundaries

- This repository is a CLI/data-pipeline showcase, not a web product.
- The current source adapter uses `youtubei/v1/player`; that implementation detail is documented but not treated as the project identity.
- Historical artifacts and large generated datasets are kept outside the main code path to preserve a clean repo narrative.
