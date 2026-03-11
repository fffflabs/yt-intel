#!/usr/bin/env tsx
import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../logger.js";

const DEFAULT_CHANNELS = ["DevOops_conf", "HighLoadChannel"];
const INPUT_ROOT = "video_data";
const OUTPUT_DIR = "exports";
const usage = "Usage: npm run export [channel...]\n       tsx src/cli/exportCombined.ts [channel...]\n       Options: -h, --help";

type VideoRecord = {
  video_id: string;
  channel: string;
  title: string;
  views: number;
  duration: number;
  published: string;
  text: string;
};

const collectChannelData = async (channel: string): Promise<VideoRecord[]> => {
  const channelPath = path.join(INPUT_ROOT, channel);
  try {
    const files = (await fs.readdir(channelPath)).sort();
    const combined: VideoRecord[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = path.join(channelPath, file);
      try {
        const raw = await fs.readFile(filePath, "utf8");
        const data = JSON.parse(raw);
        if (data.title && data.text && data.video_id) {
          combined.push(data);
        } else {
          logger.warn("Skipped incomplete transcript file", { filePath });
        }
      } catch (error) {
        logger.warn("Error reading transcript file", { filePath, error: String(error) });
      }
    }

    return combined;
  } catch {
    logger.warn("Channel transcript folder not found", { channelPath });
    return [];
  }
};

export const parseExportArgs = (argv: string[]) => {
  if (argv.includes("-h") || argv.includes("--help")) {
    return { help: true, channels: [] as string[] };
  }
  return { help: false, channels: argv.length > 0 ? argv : DEFAULT_CHANNELS };
};

export const main = async () => {
  const parsed = parseExportArgs(process.argv.slice(2));
  if (parsed.help) {
    console.log(usage);
    process.exit(0);
    return;
  }

  const channels = parsed.channels;
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const channel of channels) {
    logger.info(`Combining channel`, { channel });
    const data = await collectChannelData(channel);
    const outPath = path.join(OUTPUT_DIR, `${channel}.json`);
    await fs.writeFile(outPath, JSON.stringify(data, null, 2), { encoding: "utf8" });
    logger.info(`Saved export`, { outPath, count: data.length });
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error("Fatal error in export", { error: String(error) });
    process.exit(1);
  });
}
