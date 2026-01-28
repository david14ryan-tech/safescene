import type { MediaType } from "./tmdb";
import type { TriggerKey } from "../constants/triggers";

export function titleKey(mediaType: MediaType, tmdbId: number) {
  return `${mediaType}_${tmdbId}`;
}

export function voteDocId(mediaType: MediaType, tmdbId: number, triggerKey: TriggerKey, uid: string) {
  return `${mediaType}_${tmdbId}_${triggerKey}_${uid}`;
}
