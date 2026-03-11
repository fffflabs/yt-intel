import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fetchVideoData, setHttpClient } from "../src/clients/youtube.js";
import { extractCaptionUrl, NoSubtitlesError } from "../src/captions/parse.js";
import type { PlayerResponse } from "../src/types/youtube.js";
import { useMockFetch } from "./helpers/mockFetch.js";

const fixturesDir = path.join("tests", "fixtures");

// Force deterministic random picks in tests.
const originalMathRandom = Math.random;
const fixedRandom = () => 0.1; // always pick first element

const loadJson = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(fixturesDir, name), "utf8")) as PlayerResponse;

export const runYoutubeTests = async () => {
  Math.random = fixedRandom;
  try {
    const okResponse = loadJson("player_ok.json");
    const { calls, mock } = useMockFetch([
      async () => ({ status: 200, ok: true, json: () => okResponse })
    ]);
    setHttpClient(mock as any);

    const result = await fetchVideoData({ videoId: "abc123", lang: "ru", maxAttempts: 2 });
    assert.equal(result.videoDetails?.title, "Test title");
    assert.equal(calls.length, 1, "Should call fetch once on success");
    setHttpClient(globalThis.fetch as any);

    const noCaptions = loadJson("player_no_captions.json");
    const fallback = extractCaptionUrl(noCaptions, "ru");
    assert.equal(fallback.languageCode, "en", "Should fall back to ASR English when requested lang missing");
  } finally {
    Math.random = originalMathRandom;
  }

  Math.random = fixedRandom;
  try {
    const failingFetch = useMockFetch([
      async () => ({ status: 500, ok: false, json: () => ({}) }),
      async () => ({ status: 500, ok: false, json: () => ({}) })
    ]);
    setHttpClient(failingFetch.mock as any);

    let threw = false;
    try {
      await fetchVideoData({ videoId: "fail", lang: "ru", maxAttempts: 2 });
    } catch (error) {
      threw = true;
      assert.match(
        (error as Error).message,
        /Failed to fetch video data/,
        "Should throw after retries"
      );
    }
    assert.equal(threw, true, "Expected fetchVideoData to throw");
    assert.equal(failingFetch.calls.length, 2, "Should attempt twice");
    setHttpClient(globalThis.fetch as any);
  } finally {
    Math.random = originalMathRandom;
  }

  // Caption selection without ASR should throw.
  const noCaptionTracks = { captions: { playerCaptionsTracklistRenderer: { captionTracks: [] } } };
  assert.throws(
    () => extractCaptionUrl(noCaptionTracks, "ru"),
    (err: any) => err instanceof NoSubtitlesError,
    "Should throw NoSubtitlesError when no matching ASR track"
  );
};
