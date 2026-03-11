import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { downloadSubsText, extractCaptionUrl, NoSubtitlesError } from "../captions/parse.js";
import { fetchVideoData } from "../clients/youtube.js";
import { logger } from "../logger.js";
import type { PlayerResponse } from "../types/youtube.js";
import { randomBetween } from "../utils/random.js";
import { sleep } from "../utils/sleep.js";

export type VideoRecord = {
  video_id: string;
  channel: string;
  title: string;
  views: number;
  duration: number;
  published: string;
  text: string;
};

type FetchAndSaveOpts = {
  videoId: string;
  lang?: string;
  channel?: string;
  outRoot?: string;
  skipInitialDelay?: boolean;
  fetchPlayerData?: typeof fetchVideoData;
  downloadText?: typeof downloadSubsText;
};

type FetchOutcome =
  | { status: "success"; path: string; lang: string }
  | { status: "no_subs"; path?: string }
  | { status: "error"; error: string };

const extractPublishedDate = (data: PlayerResponse): string => {
  return data.microformat?.playerMicroformatRenderer?.publishDate ?? "";
};

const buildResult = (
  videoId: string,
  channel: string,
  data: PlayerResponse,
  text: string
): VideoRecord => {
  const details = data?.videoDetails ?? {};
  return {
    video_id: videoId,
    channel,
    title: details.title ?? "",
    views: Number(details.viewCount ?? 0),
    duration: Number(details.lengthSeconds ?? 0),
    published: extractPublishedDate(data),
    text
  };
};

const ensureDir = async (dirPath: string) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const writeJson = async (filePath: string, payload: unknown) => {
  const json = JSON.stringify(payload, null, 2);
  await fs.writeFile(filePath, json, { encoding: "utf8" });
};

export const fetchSubsAndSave = async (opts: FetchAndSaveOpts): Promise<FetchOutcome> => {
  const {
    videoId,
    lang = config.defaultLang,
    channel = "UnknownChannel",
    outRoot = "video_data",
    skipInitialDelay = false,
    fetchPlayerData,
    downloadText
  } = opts;

  const outDir = path.join(outRoot, channel);
  const outPath = path.join(outDir, `${videoId}.json`);

  const playerFetcher = fetchPlayerData ?? fetchVideoData;
  const captionsFetcher = downloadText ?? downloadSubsText;

  if (!skipInitialDelay) {
    const initialDelay = randomBetween(config.minDelaySeconds, config.maxDelaySeconds);
    logger.info(`Delay before request: ${initialDelay.toFixed(2)} sec`);
    await sleep(initialDelay * 1000);
  }

  try {
    logger.info("Fetching video data...", { videoId, lang });
    const playerData = await playerFetcher({ videoId, lang });
    const captionTrack = extractCaptionUrl(playerData, lang);

    logger.info("Downloading captions...");
    const text = await captionsFetcher(captionTrack.baseUrl);
    const result = buildResult(videoId, channel, playerData, text);

    await ensureDir(outDir);
    await writeJson(outPath, result);
    logger.info(`Saved transcript`, { outPath, captionsLang: captionTrack.languageCode });

    return { status: "success", path: outPath, lang: captionTrack.languageCode };
  } catch (error) {
    if (error instanceof NoSubtitlesError) {
      logger.warn("No auto subtitles available");
      return { status: "no_subs", path: outPath };
    }

    logger.error("Error during fetch", { error: String(error) });
    return { status: "error", error: error instanceof Error ? error.message : String(error) };
  }
};
