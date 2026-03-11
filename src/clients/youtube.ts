import { config, requireApiKeys } from "../config.js";
import { logger } from "../logger.js";
import type { PlayerResponse } from "../types/youtube.js";
import { randomBetween, randomItem } from "../utils/random.js";
import { sleep } from "../utils/sleep.js";

type FetchOpts = {
  videoId: string;
  lang?: string;
  maxAttempts?: number;
};

let httpFetch: typeof fetch = globalThis.fetch;

export const setHttpClient = (fn: typeof fetch) => {
  httpFetch = fn;
};

export const fetchVideoData = async ({
  videoId,
  lang = config.defaultLang,
  maxAttempts = 5
}: FetchOpts): Promise<PlayerResponse> => {
  const apiKeys = requireApiKeys();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const key = randomItem(apiKeys);
    const version = randomItem(config.clientVersions);
    const userAgent = randomItem(config.userAgents);

    const endpoint = "https://www.youtube.com/youtubei/v1/player";
    const params = new URLSearchParams({ key });
    const url = `${endpoint}?${params.toString()}`;

    const headers = {
      "User-Agent": userAgent,
      "Content-Type": "application/json"
    };

    const body = {
      videoId,
      context: {
        client: {
          hl: lang,
          clientName: "WEB",
          clientVersion: version
        }
      }
    };

    try {
      const response = await httpFetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const json = (await response.json()) as PlayerResponse;
      return json;
    } catch (error) {
      logger.warn(`Attempt ${attempt}/${maxAttempts} failed`, { error: String(error) });
      if (attempt === maxAttempts) {
        break;
      }
      const waitSeconds = randomBetween(3, 6);
      logger.info(`Backoff for ${waitSeconds.toFixed(2)}s`);
      await sleep(waitSeconds * 1000);
    }
  }

  throw new Error(`Failed to fetch video data for ${videoId} after ${maxAttempts} attempts`);
};
