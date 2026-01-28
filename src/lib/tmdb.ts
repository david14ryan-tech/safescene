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

export type TmdbDetails = {
  id: number;
  media_type: MediaType;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number; // movie
  episode_run_time?: number[]; // tv
  genres?: { id: number; name: string }[];
};

export async function searchMulti(query: string): Promise<TmdbSearchItem[]> {
  requireKey();
  const q = query.trim();
  if (!q) return [];

  const url =
    `${BASE_URL}/search/multi?api_key=${API_KEY}` +
    `&query=${encodeURIComponent(q)}&include_adult=false&language=en-US`;

  const res = await fetch(url);

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    console.log("TMDB error status:", res.status);
    console.log("TMDB error body:", bodyText);
    throw new Error(`TMDB search error: ${res.status}`);
  }

  const data = await res.json();
  const results: any[] = data?.results ?? [];
  return results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
}

export async function getDetails(type: MediaType, id: number): Promise<TmdbDetails> {
  requireKey();

  const url = `${BASE_URL}/${type}/${id}?api_key=${API_KEY}&language=en-US`;
  const res = await fetch(url);

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    console.log("TMDB details error status:", res.status);
    console.log("TMDB details error body:", bodyText);
    throw new Error(`TMDB details error: ${res.status}`);
  }

  const data = await res.json();
  return { ...data, media_type: type };
}

export function posterUrl(
  path?: string | null,
  size: "w185" | "w342" | "w500" = "w342"
) {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
