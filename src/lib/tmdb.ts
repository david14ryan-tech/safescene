const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

function requireKey() {
  if (!API_KEY) {
    throw new Error("Missing TMDB key. Set EXPO_PUBLIC_TMDB_API_KEY in .env and restart Expo.");
  }
}

export type MediaType = "movie" | "tv";

export type TmdbSearchItem = {
  id: number;
  media_type: MediaType;
  title?: string; // movie
  name?: string; // tv
  overview?: string;
  poster_path?: string | null;
  release_date?: string; // movie
  first_air_date?: string; // tv
};

export async function searchMulti(query: string): Promise<TmdbSearchItem[]> {
  requireKey();
  const q = query.trim();
  if (!q) return [];

  const url =
    `${BASE_URL}/search/multi?api_key=${API_KEY}` +
    `&query=${encodeURIComponent(q)}&include_adult=false&language=en-US`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB search error: ${res.status}`);

  const data = await res.json();
  const results: any[] = data?.results ?? [];
  return results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
}

export function posterUrl(path?: string | null, size: "w185" | "w342" | "w500" = "w342") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
