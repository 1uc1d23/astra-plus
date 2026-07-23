import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, embedUrl, type Media } from "@/lib/tmdb";
import { DetailDrawer, MovieCard, Nav, PageShell, Player } from "@/components/streaming";
import { z } from "zod";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, Filter, Globe, Shuffle, Check, RotateCcw } from "lucide-react";

interface DiscoverBarProps {
  genres: { id: number; name: string }[];
  providers: { provider_id: number; provider_name: string }[];
  countries: { iso_3166_1: string; english_name: string }[];
  selectedGenre: string;
  setSelectedGenre: (v: string) => void;
  selectedProvider: string;
  setSelectedProvider: (v: string) => void;
  selectedSort: string;
  setSelectedSort: (v: string) => void;
  selectedMediaType: string;
  setSelectedMediaType: (v: string) => void;
  selectedCountry: string;
  setSelectedCountry: (v: string) => void;
  onSurpriseMe: () => void;
  onReset: () => void;
}

export function DiscoverBar({
  genres,
  providers,
  countries,
  selectedGenre,
  setSelectedGenre,
  selectedProvider,
  setSelectedProvider,
  selectedSort,
  setSelectedSort,
  selectedMediaType,
  setSelectedMediaType,
  selectedCountry,
  setSelectedCountry,
  onSurpriseMe,
  onReset,
}: DiscoverBarProps) {
  const isFiltered = Boolean(
    selectedGenre ||
    selectedProvider ||
    selectedCountry ||
    selectedMediaType !== "all" ||
    selectedSort !== "popularity.desc"
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-8 w-full">
      {/* Left Group: Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5">

        {/* Type Dropdown */}
        <SelectDropdown
          value={selectedMediaType}
          onChange={setSelectedMediaType}
          options={[
            { value: "all", label: "All Types" },
            { value: "movie", label: "Movies" },
            { value: "tv", label: "Series" },
          ]}
        />

        {/* Genres Dropdown (Filter Icon on Left) */}
        <SelectDropdown
          value={selectedGenre}
          onChange={setSelectedGenre}
          leftIcon={<Filter className="h-3.5 w-3.5 opacity-60 mr-1" />}
          placeholder="All Genres"
          options={[
            { value: "", label: "All Genres" },
            ...genres.map((g) => ({ value: String(g.id), label: g.name })),
          ]}
        />

        {/* Providers Dropdown */}
        <SelectDropdown
          value={selectedProvider}
          onChange={setSelectedProvider}
          placeholder="All Providers"
          options={[
            { value: "", label: "All Providers" },
            ...providers.map((p) => ({ value: String(p.provider_id), label: p.provider_name })),
          ]}
        />

        {/* Sort By Dropdown */}
        <SelectDropdown
          value={selectedSort}
          onChange={setSelectedSort}
          options={[
            { value: "popularity.desc", label: "Trending" },
            { value: "vote_average.desc", label: "Top Rated" },
            { value: "primary_release_date.desc", label: "New Releases" },
            { value: "revenue.desc", label: "Best Earning" },
          ]}
        />

        {/* Countries Dropdown (Globe Icon on Left) */}
        <SelectDropdown
          value={selectedCountry}
          onChange={setSelectedCountry}
          leftIcon={<Globe className="h-3.5 w-3.5 opacity-60 mr-1" />}
          placeholder="All Countries"
          options={[
            { value: "", label: "All Countries" },
            ...countries.map((c) => ({ value: c.iso_3166_1, label: c.english_name })),
          ]}
        />

        {/* Reset Button (Only shows when filters are active) */}
        {isFiltered && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition rounded-full border border-transparent cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Right Group: Surprise Me Button (Shuffle Icon on Left) */}
      <button
        onClick={onSurpriseMe}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer ml-auto"
      >
        <Shuffle className="h-4 w-4" />
        <span>Surprise Me</span>
      </button>
    </div>
  );
}

// Helper Reusable Select Component
function SelectDropdown({
  value,
  onChange,
  options,
  placeholder,
  leftIcon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  leftIcon?: React.ReactNode;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="inline-flex items-center justify-between gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer min-w-[130px]">
        <div className="flex items-center gap-1.5 truncate">
          {leftIcon}
          <Select.Value placeholder={placeholder} />
        </div>
        <Select.Icon>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-[100] max-h-[48vh] w-[var(--radix-select-trigger-width)] min-w-[160px] overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-2xl p-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Select.Viewport className="p-1 overflow-y-auto">
            {options.map((opt) => (
              <Select.Item
                key={opt.value || "all"}
                value={opt.value}
                className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-4 text-sm outline-none hover:bg-surface-2 focus:bg-surface-2 focus:text-accent cursor-pointer transition-colors"
              >
                <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
                  <Select.ItemIndicator>
                    <Check className="h-4 w-4 text-accent" />
                  </Select.ItemIndicator>
                </span>
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

const searchSchema = z.object({
  type: z.enum(["movie", "tv", "mylist", "discover"]).catch("movie"),
  genre: z.string().optional(),
  provider: z.string().optional(),
  sort: z.string().catch("popularity.desc"),
  mediaType: z.enum(["all", "movie", "tv"]).catch("all"),
  country: z.string().optional(),
}).catch({ type: "movie", sort: "popularity.desc", mediaType: "all" });

export const Route = createFileRoute("/browse")({
  component: BrowsePage,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Browse — Astra+" }] }),
});

function BrowsePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { type } = search;

  // Sync filter values directly with URL query parameters
  const selectedGenre = search.genre || "";
  const selectedProvider = search.provider || "";
  const selectedSort = search.sort || "popularity.desc";
  const selectedMediaType = search.mediaType || "all";
  const selectedCountry = search.country || "";

  // Helper to update URL search params on dropdown changes
  const updateSearch = (newParams: Record<string, string>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...newParams,
      }),
      replace: true,
    });
  };

  const setSelectedGenre = (v: string) => updateSearch({ genre: v });
  const setSelectedProvider = (v: string) => updateSearch({ provider: v });
  const setSelectedSort = (v: string) => updateSearch({ sort: v });
  const setSelectedMediaType = (v: string) => updateSearch({ mediaType: v });
  const setSelectedCountry = (v: string) => updateSearch({ country: v });

  const handleResetFilters = () => {
    updateSearch({
      genre: "",
      provider: "",
      sort: "popularity.desc",
      mediaType: "all",
      country: "",
    });
  };

  const q = useQuery({
    queryKey: ["browse", type],
    queryFn: () => (type === "tv" ? api.popularTV() : api.popularMovies()),
  });
  const top = useQuery({
    queryKey: ["browse-top", type],
    queryFn: () => (type === "tv" ? api.topRatedTV() : api.topRatedMovies()),
  });

  const [selected, setSelected] = useState<Media | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const openDetail = (m: Media) => { setSelected({ ...m, media_type: type }); setDrawerOpen(true); };
  const play = (m: Media, s?: number, e?: number) => {
    const url = embedUrl({ id: m.id, media_type: type }, s, e);
    setPlaying(url);
    if (typeof window !== "undefined") window.location.href = url;
  };

  // Queries for discover filter options
  const { data: movieGenres } = useQuery({ queryKey: ["genres-movie"], queryFn: api.genresMovie });
  const { data: tvGenres } = useQuery({ queryKey: ["genres-tv"], queryFn: api.genresTV });

  // Discover Query with full TMDB dynamic parameter matching
  const discoverQuery = useQuery({
    queryKey: ["discover", selectedMediaType, selectedGenre, selectedProvider, selectedSort, selectedCountry],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        sort_by: selectedSort,
        include_adult: "false",
        page: 1,
      };

      if (selectedGenre) params.with_genres = selectedGenre;
      if (selectedProvider) {
        params.with_watch_providers = selectedProvider;
        params.watch_region = selectedCountry || "US"; // Required by TMDB when provider is selected
      }
      if (selectedCountry) params.with_origin_country = selectedCountry;

      // Fetch movies, series, or both depending on selected type
      if (selectedMediaType === "all") {
        const [movies, tv] = await Promise.all([
          api.discover("movie", params),
          api.discover("tv", params),
        ]);

        // Combine and sort by chosen metric
        const combined = [
          ...(movies.results || []).map(item => ({ ...item, media_type: "movie" as const })),
          ...(tv.results || []).map(item => ({ ...item, media_type: "tv" as const }))
        ];

        if (selectedSort.includes("vote_average")) {
          combined.sort((a, b) => b.vote_average - a.vote_average);
        } else {
          combined.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
        }

        return { results: combined };
      }

      const res = await api.discover(selectedMediaType as "movie" | "tv", params);
      return {
        results: (res.results || []).map(item => ({
          ...item,
          media_type: selectedMediaType as "movie" | "tv"
        }))
      };
    },
    enabled: type === "discover",
  });

  // Surprise Me Handler
  const handleSurpriseMe = () => {
    const currentItems = discoverQuery.data?.results || [];
    if (currentItems.length > 0) {
      const randomIndex = Math.floor(Math.random() * currentItems.length);
      openDetail(currentItems[randomIndex]);
    }
  };

  let savedList: Media[] = [];
  if (type === "mylist" && typeof window !== "undefined") {
    try {
      savedList = JSON.parse(localStorage.getItem("astra_my_list") || "[]");
    } catch {
      savedList = [];
    }
  }

  const items = type === "mylist"
    ? savedList
    : type === "discover"
      ? discoverQuery.data?.results ?? []
      : [...(q.data?.results ?? []), ...(top.data?.results ?? [])];

  const seen = new Set<number>();
  const unique = items.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));

  const title = type === "tv" ? "All Series" : type === "mylist" ? "My List" : type === "discover" ? "Discover" : "All Movies";

  return (
    <PageShell>
      <Nav />
      <div className="pt-28 px-6 md:px-12 max-w-[1600px] mx-auto">
        <div className="mb-8 fade-up">
          <div className="text-mono text-xs uppercase tracking-[0.25em] text-accent mb-2">Browse</div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{title}</h1>
        </div>
        {type === "discover" && (
          <DiscoverBar
            genres={[...(movieGenres?.genres || []), ...(tvGenres?.genres || [])].filter(
              (g, i, arr) => arr.findIndex((t) => t.id === g.id) === i
            )}
            providers={[
              { provider_id: 8, provider_name: "Netflix" },
              { provider_id: 9, provider_name: "Prime Video" },
              { provider_id: 337, provider_name: "Disney+" },
              { provider_id: 1899, provider_name: "HBO Max" },
              { provider_id: 15, provider_name: "Hulu" },
              { provider_id: 350, provider_name: "Apple TV+" },
              { provider_id: 531, provider_name: "Paramount+" },
            ]}
            countries={[
              { iso_3166_1: "AR", english_name: "Argentina" },
              { iso_3166_1: "AU", english_name: "Australia" },
              { iso_3166_1: "BR", english_name: "Brazil" },
              { iso_3166_1: "CA", english_name: "Canada" },
              { iso_3166_1: "CN", english_name: "China" },
              { iso_3166_1: "DK", english_name: "Denmark" },
              { iso_3166_1: "EG", english_name: "Egypt" },
              { iso_3166_1: "FR", english_name: "France" },
              { iso_3166_1: "DE", english_name: "Germany" },
              { iso_3166_1: "HK", english_name: "Hong Kong" },
              { iso_3166_1: "IN", english_name: "India" },
              { iso_3166_1: "ID", english_name: "Indonesia" },
              { iso_3166_1: "IE", english_name: "Ireland" },
              { iso_3166_1: "IT", english_name: "Italy" },
              { iso_3166_1: "JP", english_name: "Japan" },
              { iso_3166_1: "MY", english_name: "Malaysia" },
              { iso_3166_1: "MX", english_name: "Mexico" },
              { iso_3166_1: "NL", english_name: "Netherlands" },
              { iso_3166_1: "NZ", english_name: "New Zealand" },
              { iso_3166_1: "NO", english_name: "Norway" },
              { iso_3166_1: "PK", english_name: "Pakistan" },
              { iso_3166_1: "PH", english_name: "Philippines" },
              { iso_3166_1: "PL", english_name: "Poland" },
              { iso_3166_1: "RU", english_name: "Russia" },
              { iso_3166_1: "SA", english_name: "Saudi Arabia" },
              { iso_3166_1: "KR", english_name: "South Korea" },
              { iso_3166_1: "ES", english_name: "Spain" },
              { iso_3166_1: "SE", english_name: "Sweden" },
              { iso_3166_1: "TW", english_name: "Taiwan" },
              { iso_3166_1: "TH", english_name: "Thailand" },
              { iso_3166_1: "TR", english_name: "Turkey" },
              { iso_3166_1: "AE", english_name: "UAE" },
              { iso_3166_1: "GB", english_name: "UK" },
              { iso_3166_1: "US", english_name: "United States" },
            ]}
            selectedGenre={selectedGenre}
            setSelectedGenre={setSelectedGenre}
            selectedProvider={selectedProvider}
            setSelectedProvider={setSelectedProvider}
            selectedSort={selectedSort}
            setSelectedSort={setSelectedSort}
            selectedMediaType={selectedMediaType}
            setSelectedMediaType={setSelectedMediaType}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            onSurpriseMe={handleSurpriseMe}
            onReset={handleResetFilters}
          />
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-16">
          {unique.map(m => (
            <MovieCard key={m.id} media={{ ...m, media_type: m.media_type || type }} onOpen={openDetail} />
          ))}
          {!unique.length && type !== "mylist" && Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl skeleton" />
          ))}
          {!unique.length && type === "mylist" && (
            <div className="col-span-full py-12 text-center text-zinc-600 dark:text-zinc-400">
              Your list is currently empty.
            </div>
          )}
        </div>
      </div>
      <DetailDrawer media={selected} open={drawerOpen} onOpenChange={setDrawerOpen} onPlay={play} onOpen={(m) => setSelected(m)} />
      {playing && <Player url={playing} onClose={() => setPlaying(null)} />}
    </PageShell>
  );
}
