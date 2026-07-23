import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api, getContinueWatchingList, embedUrl, type Media, type ContinueWatchingItem } from "@/lib/tmdb";
import { DetailDrawer, Hero, Nav, PageShell, Player, Row } from "@/components/streaming";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Astra+ — Stream Movies & Series" },
      { name: "description", content: "Trending, popular, and top rated movies & series. Watch instantly." },
    ],
  }),
});

const PROVIDERS = [
  { provider_id: 8, provider_name: "Netflix" },
  { provider_id: 9, provider_name: "Prime Video" },
  { provider_id: 337, provider_name: "Disney+" },
  { provider_id: 1899, provider_name: "HBO Max" },
  { provider_id: 15, provider_name: "Hulu" },
  { provider_id: 350, provider_name: "Apple TV+" },
  { provider_id: 531, provider_name: "Paramount+" },
];

function ProviderRow({
  type,
  onOpen,
}: {
  type: "movie" | "tv";
  onOpen: (m: Media) => void;
}) {
  const [provider, setProvider] = useState(PROVIDERS[0]);

  const { data } = useQuery({
    queryKey: ["provider-discover", type, provider.provider_id],
    queryFn: () =>
      api.discover(type, {
        with_watch_providers: provider.provider_id,
        watch_region: "US",
        sort_by: "popularity.desc",
      }),
  });

  const rawResults: Media[] = data?.results ?? [];
  const items = rawResults.map((m) => ({
    ...m,
    media_type: m.media_type ?? (type === "tv" ? ("tv" as const) : ("movie" as const)),
  }));

  const dropdownLabel = (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 text-lg md:text-xl font-semibold tracking-tight hover:opacity-80 transition focus:outline-none cursor-pointer">
          <span>{type === "movie" ? "Movies on" : "Series on"}</span>
          <span className="underline decoration-accent underline-offset-4 text-white">
            {provider.provider_name}
          </span>
          <ChevronDown className="h-5 w-5 text-white/20" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          className="z-[100] min-w-[10rem] overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-2xl p-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {PROVIDERS.map((p) => (
            <DropdownMenu.Item
              key={p.provider_id}
              onClick={() => setProvider(p)}
              className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-4 text-sm outline-none hover:bg-surface-2 focus:bg-surface-2 focus:text-white transition-colors"
            >
              {p.provider_id === provider.provider_id && (
                <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
                  <Check className="h-4 w-4 text-white/20" />
                </span>
              )}
              {p.provider_name}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  return (
    <Row label={dropdownLabel as any} items={items} onOpen={onOpen} />
  );
}

function ContinueWatchingRow({ onOpen }: { onOpen: (m: Media) => void }) {
  const [historyItems] = useState<ContinueWatchingItem[]>(() =>
    getContinueWatchingList()
  );

  const { data: mediaList, isLoading } = useQuery({
    queryKey: ["continue-watching-list", historyItems],
    queryFn: async () => {
      if (!historyItems.length) return [];
      const results = await Promise.all(
        historyItems.map(async (item) => {
          try {
            const data = item.media_type === "tv" ? await api.tv(item.id) : await api.movie(item.id);
            return {
              ...data,
              media_type: item.media_type, // Preserve exact TV / Movie flag
              _lastSeason: item.season,
              _lastEpisode: item.episode,
            };
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean) as Media[];
    },
    enabled: historyItems.length > 0,
  });

  if (!historyItems.length) return null;

  return (
    <Row
      label="Continue Watching"
      items={isLoading ? undefined : mediaList}
      onOpen={onOpen}
      size="lg"
    />
  );
}

function Home() {
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => api.trending("week") });
  const popularMovies = useQuery({ queryKey: ["popularMovies"], queryFn: api.popularMovies });
  const topRatedMovies = useQuery({ queryKey: ["topRatedMovies"], queryFn: api.topRatedMovies });
  const popularTV = useQuery({ queryKey: ["popularTV"], queryFn: api.popularTV });
  const nowPlaying = useQuery({ queryKey: ["nowPlaying"], queryFn: api.nowPlaying });
  const topRatedTV = useQuery({ queryKey: ["topRatedTV"], queryFn: api.topRatedTV });
  const upcoming = useQuery({ queryKey: ["upcoming"], queryFn: api.upcoming });

  const [selected, setSelected] = useState<Media | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openDetail = (m: Media) => { setSelected(m); setDrawerOpen(true); };

  const play = (m: Media & { _lastSeason?: number; _lastEpisode?: number }, s?: number, e?: number) => {
    // 1. Check if unreleased
    const releaseDateStr = m.release_date || m.first_air_date;
    if (releaseDateStr) {
      const releaseDate = new Date(releaseDateStr);
      if (releaseDate > new Date()) {
        triggerToast("Not released yet");
        return;
      }
    }

    // 2. Strict Media Type Check
    const isTvShow = m.media_type === "tv" || Boolean(m.first_air_date) || Boolean(m.number_of_seasons);
    const mediaType = isTvShow ? "tv" : "movie";

    // 3. Resolve Season & Episode correctly
    const targetSeason = s ?? m._lastSeason ?? (isTvShow ? 1 : undefined);
    const targetEpisode = e ?? m._lastEpisode ?? (isTvShow ? 1 : undefined);

    const targetUrl = embedUrl({ id: m.id, media_type: mediaType }, targetSeason, targetEpisode);

    setPlaying(targetUrl);
    if (typeof window !== "undefined") {
      window.location.href = targetUrl;
    }
  };

  const heroItems = (trending.data?.results ?? []).filter(m => m.backdrop_path).slice(0, 6);

  return (
    <PageShell>
      <Nav />
      {heroItems.length ? (
        <Hero items={heroItems} onOpen={openDetail} onPlay={(m) => play(m)} />
      ) : (
        <div className="h-[92vh] skeleton" />
      )}

      <div className="relative -mt-1 md:-mt-20 z-10">
        <ContinueWatchingRow onOpen={openDetail} />
        <Row label="Trending Now" items={trending.data?.results} onOpen={openDetail} size="lg" />
        <ProviderRow type="movie" onOpen={openDetail} />
        <ProviderRow type="tv" onOpen={openDetail} />
        <Row label="Top Rated Movies" items={topRatedMovies.data?.results} onOpen={openDetail} />
        <Row label="Now Playing" items={nowPlaying.data?.results} onOpen={openDetail} />
        <Row label="Top Rated Series" items={topRatedTV.data?.results?.map(m => ({ ...m, media_type: "tv" as const }))} onOpen={openDetail} />
        <Row label="Coming Soon" items={upcoming.data?.results} onOpen={openDetail} />
      </div>

      <footer className="mt-16 border-t border-border py-12 px-6 md:px-12 bg-background">
        <div className="mx-auto max-w-[1600px] flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex flex-col gap-2">
            <Link to="/" className="inline-flex items-center">
              <img src="/logo.svg" alt="Astra" className="h-7 w-auto object-contain" />
            </Link>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Astra+ does not host any media files. It only links to third-party providers. Any legal concerns should be directed to the respective hosts, as Astra+ is not responsible for their content.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Home</Link>
            <Link to="/browse" search={{ type: "movie" }} className="hover:text-foreground transition">Movies</Link>
            <Link to="/browse" search={{ type: "tv" }} className="hover:text-foreground transition">Series</Link>
            <Link to="/browse" search={{ type: "discover" }} className="hover:text-foreground transition">Discover</Link>
            <Link to="/browse" search={{ type: "mylist" }} className="hover:text-foreground transition">My List</Link>
          </div>

          <div className="text-left md:text-right text-xs text-muted-foreground flex flex-col gap-1">
            <div>© {new Date().getFullYear()} ASTRA. All rights reserved.</div>
            <div className="text-[11px] opacity-70">Data provided by TMDB · Not affiliated.</div>
          </div>
        </div>
      </footer>

      <DetailDrawer
        media={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onPlay={play}
        onOpen={(m) => { setSelected(m); }}
      />
      {playing && <Player url={playing} onClose={() => setPlaying(null)} />}

      {/* Bottom Toast for Unreleased Titles */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-surface-2 border border-border text-foreground text-sm px-5 py-2.5 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}
    </PageShell>
  );
}