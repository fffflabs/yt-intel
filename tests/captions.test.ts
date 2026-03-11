import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { extractCaptionUrl, NoSubtitlesError, parseSrv3XmlToText } from "../src/captions/parse.js";

const fixturesDir = path.join("tests", "fixtures");

export const runCaptionsTests = () => {
  const xmlPath = path.join(fixturesDir, "sample_srv3.xml");
  const xml = fs.readFileSync(xmlPath, "utf8");
  const text = parseSrv3XmlToText(xml);
  assert.equal(text, "Hello world This is srv3 caption text.", "Parsed srv3 text should match words");

  const captionsPath = path.join(fixturesDir, "player_captions.json");
  const captions = JSON.parse(fs.readFileSync(captionsPath, "utf8"));
  const track = extractCaptionUrl(captions, "ru");
  assert.equal(track.baseUrl, "https://example.com/captions", "Should pick matching lang ASR track");
  assert.equal(track.languageCode, "ru", "Should return matched language code");

  assert.throws(
    () => extractCaptionUrl({}, "fr"),
    (err: any) => err instanceof NoSubtitlesError,
    "Should throw NoSubtitlesError when no captions"
  );
};
