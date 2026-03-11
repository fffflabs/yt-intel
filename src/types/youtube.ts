export type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
};

export type PlayerResponse = {
  videoDetails?: {
    title?: string;
    viewCount?: string;
    lengthSeconds?: string;
  };
  microformat?: {
    playerMicroformatRenderer?: {
      publishDate?: string;
    };
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
};
