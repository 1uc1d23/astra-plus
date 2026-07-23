export const TMDB_KEY = "ea021b3b0775c8531592713ab727f254";
export const TMDB_BASE = "https://api.themoviedb.org/3";
export const IMG = (path: string | null | undefined, size: "w200" | "w300" | "w500" | "w780" | "w1280" | "original" = "w500") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : "";

export type Media = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: "movie" | "tv";
  genre_ids?: number[];
  runtime?: number;
  number_of_seasons?: number;
  tagline?: string;
  belongs_to_collection?: { id: number; name: string; poster_path: string | null; backdrop_path: string | null };
  images?: { logos: { file_path: string; iso_639_1: string }[] };
  genres?: { id: number; name: string }[];
  seasons?: { id: number; season_number: number; name: string; episode_count: number; poster_path: string | null; overview: string; air_date: string }[];
  credits?: { cast: { id: number; name: string; character: string; profile_path: string | null }[] };
  videos?: { results: { key: string; site: string; type: string }[] };
  recommendations?: { results: Media[] };
};

export type Episode = {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  episode_number: number;
  season_number: number;
  air_date: string;
  runtime: number | null;
  vote_average: number;
};

async function tmdb<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", TMDB_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("TMDB error " + res.status);
  return res.json();
}

export interface ContinueWatchingItem {
  id: number;
  media_type: "movie" | "tv";
  season?: number;
  episode?: number;
  progress: number; // in seconds
  updatedAt: number; // timestamp in ms
  key: string;
}

export function getContinueWatchingList(): ContinueWatchingItem[] {
  if (typeof window === "undefined") return [];

  const latestMap = new Map<number, ContinueWatchingItem>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const rawVal = localStorage.getItem(key);
    if (!rawVal) continue;

    // Support both new JSON format { progress, updatedAt } and legacy raw numbers
    let progress = 0;
    let updatedAt = 0;

    try {
      if (rawVal.startsWith("{")) {
        const parsed = JSON.parse(rawVal);
        progress = Number(parsed.progress) || 0;
        updatedAt = Number(parsed.updatedAt) || 0;
      } else {
        progress = Number(rawVal) || 0;
      }
    } catch {
      progress = Number(rawVal) || 0;
    }

    if (progress <= 5) continue;

    // TV format: resume_tv_{id}_{season}_{episode}
    if (key.startsWith("resume_tv_")) {
      const parts = key.split("_");
      if (parts.length === 5) {
        const id = Number(parts[2]);
        const season = Number(parts[3]);
        const episode = Number(parts[4]);

        if (id) {
          const newItem: ContinueWatchingItem = {
            id,
            media_type: "tv",
            season,
            episode,
            progress,
            updatedAt,
            key,
          };
          const existing = latestMap.get(id);

          if (!existing) {
            latestMap.set(id, newItem);
          } else {
            // Prefer the item with a more recent timestamp; fall back to higher episode count if equal
            const isNewer = newItem.updatedAt > existing.updatedAt;
            const isSameTimeHigherEp =
              newItem.updatedAt === existing.updatedAt &&
              (season > (existing.season ?? 0) ||
                (season === existing.season && episode > (existing.episode ?? 0)));

            if (isNewer || isSameTimeHigherEp) {
              localStorage.removeItem(existing.key);
              latestMap.set(id, newItem);
            } else {
              localStorage.removeItem(key);
            }
          }
        }
      }
    }
    // Movie format: resume_{id}
    else if (key.startsWith("resume_")) {
      const parts = key.split("_");
      if (parts.length === 2) {
        const id = Number(parts[1]);
        if (id) {
          latestMap.set(id, { id, media_type: "movie", progress, updatedAt, key });
        }
      }
    }
  }

  // Sort strictly by most recent timestamp first (newest watched on the left)
  return Array.from(latestMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const api = {
  trending: (window: "day" | "week" = "week") => tmdb<{ results: Media[] }>(`/trending/all/${window}`),
  trendingMovies: () => tmdb<{ results: Media[] }>(`/trending/movie/week`),
  trendingTV: () => tmdb<{ results: Media[] }>(`/trending/tv/week`),
  popularMovies: () => tmdb<{ results: Media[] }>(`/movie/popular`),
  topRatedMovies: () => tmdb<{ results: Media[] }>(`/movie/top_rated`),
  nowPlaying: () => tmdb<{ results: Media[] }>(`/movie/now_playing`),
  upcoming: () => tmdb<{ results: Media[] }>(`/movie/upcoming`),
  popularTV: () => tmdb<{ results: Media[] }>(`/tv/popular`),
  topRatedTV: () => tmdb<{ results: Media[] }>(`/tv/top_rated`),
  discoverMovies: (genre?: number) =>
    tmdb<{ results: Media[] }>(`/discover/movie`, genre ? { with_genres: genre, sort_by: "popularity.desc" } : { sort_by: "popularity.desc" }),
  movie: (id: number) => tmdb<Media>(`/movie/${id}`, { append_to_response: "images,credits,videos,recommendations", include_image_language: "en,null" }),
  tv: (id: number) => tmdb<Media>(`/tv/${id}`, { append_to_response: "images,credits,videos,recommendations", include_image_language: "en,null" }),
  season: (tvId: number, season: number) => tmdb<{ episodes: Episode[]; name: string; overview: string; poster_path: string | null }>(`/tv/${tvId}/season/${season}`),
  search: (q: string) => tmdb<{ results: Media[] }>(`/search/multi`, { query: q, include_adult: "false" }),
  genresMovie: () => tmdb<{ genres: { id: number; name: string }[] }>(`/genre/movie/list`),
  // Replace or add to api object in tmdb.ts:
  genresTV: () => tmdb<{ genres: { id: number; name: string }[] }>(`/genre/tv/list`),
  watchProviders: (type: "movie" | "tv") => tmdb<{ results: { provider_id: number; provider_name: string }[] }>(`/watch/providers/${type}`, { watch_region: "US" }),
  regions: () => tmdb<{ results: { iso_3166_1: string; english_name: string }[] }>(`/configuration/countries`),
  
  discover: (type: "movie" | "tv" | "all", params: Record<string, string | number> = {}) => {
    const endpoint = type === "all" ? "/discover/movie" : `/discover/${type}`;
    return tmdb<{ results: Media[] }>(endpoint, params);
  },
  collection: (id: number) => tmdb<{ id: number; name: string; overview: string; poster_path: string | null; backdrop_path: string | null; parts: Media[] }>(`/collection/${id}`),
};
export const embedUrl = (m: { id: number; media_type?: string }, season?: number, episode?: number) => {
  const isTV = m.media_type === "tv" || season !== undefined;
  if (isTV) return `/watch/index.html?id=${m.id}&s=${season ?? 1}&e=${episode ?? 1}`;
  return `/watch/index.html?id=${m.id}`;
};
export const title = (m: Media) => m.title || m.name || m.original_title || m.original_name || "Untitled";
export const year = (m: Media) => (m.release_date || m.first_air_date || "").slice(0, 4);
export const isTV = (m: Media) => (m.media_type === "tv") || Boolean(m.first_air_date) || Boolean(m.number_of_seasons);
export const englishLogo = (m: Media) => {
  const logos = m.images?.logos || [];
  return logos.find(l => l.iso_639_1 === "en") || logos[0];
};
