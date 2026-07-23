import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, embedUrl, type Media } from "@/lib/tmdb";
import { DetailDrawer, MovieCard, Nav, PageShell, Player } from "@/components/streaming";
import { Search as SearchIcon } from "react-feather";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  head: () => ({ meta: [{ title: "Search — Astra+" }] }),
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const search = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => api.search(debounced),
    enabled: debounced.length > 1,
  });
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => api.trending("day") });

  const [selected, setSelected] = useState<Media | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const openDetail = (m: Media) => { setSelected(m); setDrawerOpen(true); };
  const play = (m: Media, s?: number, e?: number) => {
    const type = m.media_type ?? (m.first_air_date ? "tv" : "movie");
    const url = embedUrl({ id: m.id, media_type: type }, s, e);
    setPlaying(url);
    if (typeof window !== "undefined") window.location.href = url;
  };

  const results = (search.data?.results ?? []).filter(m => (m.media_type === "movie" || m.media_type === "tv") && m.poster_path);

  return (
    <PageShell>
      <Nav />
      <div className="pt-28 px-6 md:px-12 max-w-[1600px] mx-auto">
        <div className="mb-8 fade-up">
          <div className="text-mono text-xs uppercase tracking-[0.25em] text-accent mb-2">Search</div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Find something to watch</h1>
          <label className="relative flex items-center">
            <SearchIcon size={18} className="absolute left-5 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search movies, series…"
              className="w-full h-14 rounded-full border border-border bg-surface pl-14 pr-6 text-base outline-none transition focus:border-white/40 focus:bg-surface-2"
            />
          </label>
        </div>

        {debounced.length > 1 ? (
          <>
            <div className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
              {search.isFetching ? "Searching…" : `${results.length} results for "${debounced}"`}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-16">
              {search.isLoading || search.isFetching
                ? Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)
                : results.map((m) => (
                    <div key={`${m.media_type}${m.id}`} className="[&>button]:w-full">
                      <MovieCard media={m} onOpen={openDetail} />
                    </div>
                  ))}
              {!results.length && !search.isFetching && !search.isLoading && (
                <div className="col-span-full text-center text-muted-foreground py-16">No results.</div>
              )}
            </div>
          </>
        ) : (
          <div>
            <div className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Trending today</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-16">
              {trending.isLoading
                ? Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)
                : (trending.data?.results ?? []).slice(0, 18).map((m) => (
                    <div key={m.id} className="[&>button]:w-full">
                      <MovieCard media={m} onOpen={openDetail} />
                    </div>
                  ))}
            </div>
          </div>
        )}
      </div>

      <DetailDrawer media={selected} open={drawerOpen} onOpenChange={setDrawerOpen} onPlay={play} onOpen={(m) => setSelected(m)} />
      {playing && <Player url={playing} onClose={() => setPlaying(null)} />}
    </PageShell>
  );
}

function CardSkeleton() {
  return (
    <div className="w-full">
      <div className="aspect-[2/3] w-full rounded-xl skeleton" />
      <div className="mt-2 space-y-1 px-0.5">
        <div className="h-4 w-3/4 rounded skeleton" />
        <div className="h-3 w-1/2 rounded skeleton" />
      </div>
    </div>
  );
}
