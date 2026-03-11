import he from "he";
import type { CaptionTrack, PlayerResponse } from "../types/youtube.js";

export class NoSubtitlesError extends Error {
  code = "NO_SUBTITLES";
  constructor(message = "No subtitles available") {
    super(message);
    this.name = "NoSubtitlesError";
  }
}

const hasAsrKind = (kind?: string): boolean => Boolean(kind && kind.includes("asr"));

type SelectedTrack = { baseUrl: string; languageCode: string };

const pickTrack = (tracks: CaptionTrack[], lang: string): SelectedTrack | null => {
  const asrTracks = tracks.filter((track) => hasAsrKind(track.kind));

  // 1) exact language match (requested lang)
  const exact = asrTracks.find((track) => track.languageCode === lang);
  if (exact && exact.languageCode) {
    return { baseUrl: exact.baseUrl, languageCode: exact.languageCode };
  }

  // 2) prefer English ASR if available
  const english = asrTracks.find((track) => track.languageCode?.startsWith("en"));
  if (english && english.languageCode) {
    return { baseUrl: english.baseUrl, languageCode: english.languageCode };
  }

  // 3) otherwise take first ASR track
  const fallback = asrTracks[0];
  if (fallback && fallback.languageCode) {
    return { baseUrl: fallback.baseUrl, languageCode: fallback.languageCode };
  }

  // 4) if no ASR tracks, fall back to any caption track
  const firstAny = tracks.find((track) => track.languageCode);
  if (firstAny && firstAny.languageCode) {
    return { baseUrl: firstAny.baseUrl, languageCode: firstAny.languageCode };
  }

  return null;
};

export const extractCaptionUrl = (data: PlayerResponse, lang: string): SelectedTrack => {
  const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  const selected = pickTrack(tracks, lang);
  if (selected) return selected;

  throw new NoSubtitlesError();
};

export const parseSrv3XmlToText = (xml: string): string => {
  const paragraphs: string[] = [];

  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let paragraphMatch: RegExpExecArray | null;

  while ((paragraphMatch = paragraphRegex.exec(xml)) !== null) {
    const content = paragraphMatch[1];
    const words: string[] = [];

    const wordRegex = /<s[^>]*>([\s\S]*?)<\/s>/g;
    let wordMatch: RegExpExecArray | null;

    while ((wordMatch = wordRegex.exec(content)) !== null) {
      const text = he.decode(wordMatch[1].trim());
      if (text) {
        words.push(text);
      }
    }

    if (words.length > 0) {
      paragraphs.push(words.join(" "));
    } else {
      // Some tracks have raw text inside <p> without <s> nodes.
      const raw = he.decode(content.replace(/<[^>]+>/g, "").trim());
      if (raw) {
        paragraphs.push(raw);
      }
    }
  }

  return paragraphs.join(" ");
};

export const downloadSubsText = async (url: string): Promise<string> => {
  const finalUrl = `${url}&fmt=srv3`;
  const response = await globalThis.fetch(finalUrl);

  if (!response.ok) {
    throw new Error(`Failed to download captions: HTTP ${response.status}`);
  }

  const xml = await response.text();
  return parseSrv3XmlToText(xml);
};
