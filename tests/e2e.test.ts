import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fetchSubsAndSave } from "../src/flows/fetchSingle.js";
import type { PlayerResponse } from "../src/types/youtube.js";

const baselineRoot = path.join("tests", "fixtures", "python_baseline");

const readBaseline = async (channel: string, videoId: string) => {
  const filePath = path.join(baselineRoot, "video_data", channel, `${videoId}.json`);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
};

const makeTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "yt-e2e-"));
  return dir;
};

export const runE2eTests = async () => {
  const videoId = "-kq832Othh4";
  const channel = "DevOops_conf";
  const baseline = await readBaseline(channel, videoId);

  const tempOut = await makeTempDir();

  const fakePlayerData: PlayerResponse = {
    videoDetails: {
      title: baseline.title,
      viewCount: String(baseline.views),
      lengthSeconds: String(baseline.duration)
    },
    microformat: {
      playerMicroformatRenderer: {
        publishDate: baseline.published
      }
    },
    captions: {
      playerCaptionsTracklistRenderer: {
        captionTracks: [
          {
            baseUrl: "https://example.com/fake",
            languageCode: "ru",
            kind: "asr"
          }
        ]
      }
    }
  };

  const fakeDownload = async () => baseline.text;
  const fakeFetchPlayer = async () => fakePlayerData;

  const outcome = await fetchSubsAndSave({
    videoId,
    lang: "ru",
    channel,
    outRoot: tempOut,
    skipInitialDelay: true,
    fetchPlayerData: fakeFetchPlayer,
    downloadText: fakeDownload
  });

  assert.equal(outcome.status, "success");
  const outPath = path.join(tempOut, channel, `${videoId}.json`);
  const produced = JSON.parse(await fs.readFile(outPath, "utf8"));

  assert.deepEqual(
    { ...produced, text: produced.text.slice(0, 200) },
    { ...baseline, text: baseline.text.slice(0, 200) },
    "Produced output should match baseline in all fields (text compared by prefix)"
  );
};
