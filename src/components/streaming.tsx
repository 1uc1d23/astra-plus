import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Play, Info, Star, ArrowLeft, ArrowRight, X, Plus } from "react-feather";
import { Drawer } from "vaul";
import { IMG, api, embedUrl, englishLogo, isTV, title, year, getContinueWatchingList, type Media, type Episode } from "@/lib/tmdb";
import { useQuery } from "@tanstack/react-query";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, Library } from "lucide-react";

/* ============ Player ============ */
export function Player({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-black/60 backdrop-blur-md text-white transition hover:bg-white hover:text-black"
        aria-label="Close player"
      >
        <X size={20} />
      </button>
      <iframe
        src={url}
        title="Player"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="no-referrer"
        style={{ width: "100%", height: "100%", position: "fixed", inset: 0, border: 0 }}
      />
    </div>
  );
}

/* ============ Rating ============ */
export function Rating({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 text-mono text-xs text-muted-foreground">
      <Star size={12} className="fill-accent stroke-accent" />
      {value.toFixed(1)}
    </span>
  );
}

/* ============ Card ============ */
export function MovieCard({ media, onOpen, size = "md" }: { media: Media & { _lastSeason?: number; _lastEpisode?: number }; onOpen: (m: Media) => void; size?: "md" | "lg" }) {
  const w = "w-40 md:w-44";
  const tv = isTV(media);

  return (
    <button
      onClick={() => onOpen(media)}
      className={`group relative shrink-0 ${w} text-left focus:outline-none`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface transition duration-500 group-hover:ring-white/40 group-hover:-translate-y-1 group-hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
        {media.poster_path ? (
          <img
            src={IMG(media.poster_path, "w500")}
            alt={title(media)}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">No image</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-70 transition group-hover:opacity-90" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 opacity-0 translate-y-2 transition duration-500 group-hover:opacity-100 group-hover:translate-y-0">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-black">
              <Play size={14} className="fill-black ml-0.5" />
            </div>
            <Rating value={media.vote_average} />
          </div>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <div className="line-clamp-1 text-sm font-medium">{title(media)}</div>
        <div className="text-mono text-[11px] text-muted-foreground truncate">
          {media._lastSeason && media._lastEpisode ? (
            <span className="text-accent font-semibold">S{media._lastSeason} E{media._lastEpisode}</span>
          ) : (
            <>{year(media) || "—"} · {tv ? "Series" : "Movie"}</>
          )}
        </div>
      </div>
    </button>
  );
}

/* ============ Row ============ */
export function Row({ label, items, onOpen, size }: { label: string; items: Media[] | undefined; onOpen: (m: Media) => void; size?: "md" | "lg" }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };
  return (
    <section className="fade-up group/row relative py-6">
      <div className="mb-3 flex items-end justify-between px-6 md:px-12">
        <h2 className="text-lg md:text-xl font-semibold tracking-tight">{label}</h2>
        <div className="text-mono text-[11px] text-muted-foreground uppercase tracking-widest">
          {items?.length ?? "…"} titles
        </div>
      </div>
      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 md:grid h-10 w-10 place-items-center border border-border rounded-full bg-black/60 backdrop-blur-md opacity-0 transition group-hover/row:opacity-100 hover:bg-white hover:border-white/0 hover:text-black"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={() => scroll(1)}
          className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 md:grid h-10 w-10 place-items-center border border-border rounded-full bg-black/60 backdrop-blur-md opacity-0 transition group-hover/row:opacity-100 hover:bg-white hover:border-white/0 hover:text-black"
        >
          <ArrowRight size={18} />
        </button>
        <div ref={ref} className="scroll-row flex gap-3 md:gap-4 overflow-x-auto px-6 md:px-12 py-4 -my-2">
          {items
            ? items.map((m) => <MovieCard key={`${m.media_type ?? ""}${m.id}`} media={m} onOpen={onOpen} size={size} />)
            : Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={`shrink-0 ${size === "lg" ? "w-52 md:w-60" : "w-40 md:w-44"} aspect-[2/3] rounded-xl skeleton`} />
            ))}
        </div>
      </div>
    </section>
  );
}

/* ============ Hero showcase ============ */
export function Hero({ items, onOpen, onPlay }: { items: Media[]; onOpen: (m: Media) => void; onPlay: (m: Media) => void }) {
  const [idx, setIdx] = useState(0);
  const list = items.slice(0, 5);
  useEffect(() => {
    if (!list.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), 8000);
    return () => clearInterval(t);
  }, [list.length]);
  const active = list[idx];
  const { data: detail } = useQuery({
    queryKey: ["hero-detail", active?.id, active?.media_type],
    queryFn: () => (active?.media_type === "tv" ? api.tv(active.id) : api.movie(active!.id)),
    enabled: !!active,
  });
  if (!active) return <div className="h-[85vh] skeleton" />;
  const logo = englishLogo(detail || active);
  return (
    <section className="relative h-[92vh] min-h-[560px] w-full overflow-hidden">
      {list.map((m, i) => (
        <div
          key={m.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === idx ? "opacity-100" : "opacity-0"}`}
        >
          <img
            src={IMG(m.backdrop_path, "original")}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="relative z-10 flex h-full items-end md:items-center">
        <div key={active.id} className="fade-up max-w-2xl px-6 md:px-12 pb-16 md:pb-0">
          <div className="text-mono text-[11px] uppercase tracking-[0.25em] text-accent mb-4">
            {isTV(active) ? "Featured Series" : "Featured Film"}
          </div>
          {!detail ? (
            <div className="mb-6 h-16 md:h-24 w-64 md:w-96 rounded-2xl skeleton" />
          ) : logo ? (
            <img
              src={IMG(logo.file_path, "w500")}
              alt={title(active)}
              className="mb-6 max-h-28 md:max-h-28 w-auto drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)]"
            />
          ) : (
            <h1 className="mb-6 text-4xl md:text-6xl font-bold tracking-tight">{title(active)}</h1>
          )}
          <div className="mb-4 flex items-center gap-3 text-mono text-xs text-muted-foreground">
            <Rating value={active.vote_average} />
            <span>·</span>
            <span>{year(active)}</span>
            {detail?.runtime ? (<><span>·</span><span>{detail.runtime}m</span></>) : null}
            {detail?.number_of_seasons ? (<><span>·</span><span>{detail.number_of_seasons} Seasons</span></>) : null}
          </div>
          <p className="mb-8 line-clamp-2 max-w-xl text-sm md:text-base leading-relaxed text-muted-foreground">
            {active.overview}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onPlay(active)}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-accent hover:text-accent-foreground hover:scale-105"
            >
              <Play size={16} className="fill-current" />
              Play
            </button>
            <button
              onClick={() => onOpen(active)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-6 py-3 text-sm font-medium transition hover:bg-white/20 hover:scale-105"
            >
              <Info size={16} />
              More info
            </button>
          </div>
          <div className="mt-12 flex gap-2">
            {list.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1 rounded-full transition-all ${i === idx ? "w-10 bg-white" : "w-4 bg-white/30 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DrawerScrollContainer({
  media,
  onPlay,
  onOpen,
}: {
  media: Media | null;
  onPlay: (m: Media, s?: number, e?: number) => void;
  onOpen: (m: Media) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (media && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [media?.id]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {media && <DrawerBody media={media} onPlay={onPlay} onOpen={onOpen} />}
    </div>
  );
}

/* ============ Drawer for details ============ */
export function DetailDrawer({
  media,
  open,
  onOpenChange,
  onPlay,
  onOpen,
}: {
  media: Media | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPlay: (m: Media, s?: number, e?: number) => void;
  onOpen: (m: Media) => void;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 overflow-hidden z-50 mx-auto mt-24 flex h-[90vh] max-w-[1000px] w-full flex-col rounded-t-3xl bg-background outline-none">
          <Drawer.Title className="sr-only">{media ? title(media) : "Details"}</Drawer.Title>
          <Drawer.Description className="sr-only">{media?.overview ?? ""}</Drawer.Description>

          <div className="absolute left-1/2 -translate-x-1/2 top-0 mt-3 z-50 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/40" />

          {/* THIS DIV IS WHAT SCROLLS AND HIDES THE SCROLLBAR */}
          <DrawerScrollContainer media={media} onPlay={onPlay} onOpen={onOpen} />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function DrawerBody({ media, onPlay, onOpen }: { media: Media & { _lastSeason?: number; _lastEpisode?: number }; onPlay: (m: Media, s?: number, e?: number) => void; onOpen: (m: Media) => void }) {
  const tv = isTV(media);
  const { data: detail } = useQuery({
    queryKey: ["detail", tv ? "tv" : "movie", media.id],
    queryFn: () => (tv ? api.tv(media.id) : api.movie(media.id)),
  });
  const m = (detail ?? media) as Media & { _lastSeason?: number; _lastEpisode?: number };
  const recommendationsList = m.recommendations?.results ?? [];
  const logo = englishLogo(m);

  // Check saved episode progress
  const history = typeof window !== "undefined" ? getContinueWatchingList() : [];
  const savedProgress = history.find((i) => i.id === m.id);

  const initialSeason = m._lastSeason ?? savedProgress?.season ?? 1;
  const initialEpisode = m._lastEpisode ?? savedProgress?.episode ?? 1;

  const [season, setSeason] = useState(initialSeason);

  // --- My List LocalStorage Hook ---
  const [myList, setMyList] = useState<Media[]>(() => {
    try {
      const saved = localStorage.getItem("astra_my_list");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isInList = myList.some((item) => item.id === m.id);

  const toggleMyList = () => {
    const updated = isInList
      ? myList.filter((item) => item.id !== m.id)
      : [...myList, m];

    setMyList(updated);
    localStorage.setItem("astra_my_list", JSON.stringify(updated));
  };

  const { data: seasonData } = useQuery({
    queryKey: ["season", media.id, season],
    queryFn: () => api.season(media.id, season),
    enabled: tv,
  });

  // Calculate button label & state
  const releaseDateStr = m.release_date || m.first_air_date;
  const isUnreleased = releaseDateStr ? new Date(releaseDateStr) > new Date() : false;

  let playButtonLabel = "Play";
  if (isUnreleased) {
    playButtonLabel = "Coming Soon";
  } else if (tv && (m._lastSeason || savedProgress?.season)) {
    const activeS = m._lastSeason ?? savedProgress?.season;
    const activeE = m._lastEpisode ?? savedProgress?.episode;
    playButtonLabel = `Continue S${activeS} E${activeE}`;
  } else if (savedProgress || m._lastSeason) {
    playButtonLabel = "Continue";
  }

  const handlePlayAction = () => {
    if (tv) {
      onPlay(m, initialSeason, initialEpisode);
    } else {
      onPlay(m);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="relative h-64 md:h-96 w-full">
        {m.backdrop_path && (
          <img
            src={IMG(m.backdrop_path, "w1280")}
            alt=""
            className="h-full w-full object-cover [mask-image:linear-gradient(to_top,transparent,black_100%)]"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
          {!detail ? (
            <div className="h-12 md:h-35 w-50 md:w-100 rounded-3xl skeleton" />
          ) : logo ? (
            <img src={IMG(logo.file_path, "w500")} alt={title(m)} className="max-h-20 md:max-h-28 w-auto" />
          ) : (
            <h2 className="text-3xl md:text-5xl font-bold">{title(m)}</h2>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 md:px-10 py-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <button
            onClick={handlePlayAction}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-accent hover:text-accent-foreground hover:scale-105 cursor-pointer"
          >
            <Play size={16} className="fill-current" />
            {playButtonLabel}
          </button>
          <button
            onClick={toggleMyList}
            className={`inline-flex items-center gap-2 rounded-full border border-border px-4 py-3 text-sm transition ${isInList
                ? "bg-accent/20 border-accent/40 text-accent hover:bg-accent/30"
                : "bg-surface hover:bg-surface-2"
              }`}
          >
            {isInList ? (
              <>
                <Check size={16} /> Added to list
              </>
            ) : (
              <>
                <Plus size={16} /> My list
              </>
            )}
          </button>
          <div className="flex items-center gap-3 text-mono text-xs text-muted-foreground ml-auto">
            <Rating value={m.vote_average} />
            <span>·</span>
            <span>{year(m)}</span>
            {m.runtime ? (<><span>·</span><span>{m.runtime}m</span></>) : null}
            {m.number_of_seasons ? (<><span>·</span><span>{m.number_of_seasons} Seasons</span></>) : null}
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            {m.tagline && <div className="text-mono text-xs uppercase tracking-widest text-accent mb-2">{m.tagline}</div>}
            <p className="text-sm md:text-base leading-relaxed text-foreground/90">{m.overview}</p>
            {m.credits?.cast?.length ? (
              <div className="mt-6">
                <div className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Cast</div>
                <div className="text-sm text-foreground/80">
                  {m.credits.cast.slice(0, 8).map(c => c.name).join(", ")}
                </div>
              </div>
            ) : null}
          </div>
          <div className="space-y-3">
            {m.genres?.length ? (
              <div>
                <div className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Genres</div>
                <div className="flex flex-wrap gap-1.5">
                  {m.genres.map(g => (
                    <span key={g.id} className="rounded-full border border-border bg-surface px-3 py-1 text-xs">{g.name}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {tv && m.seasons?.length ? (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Episodes</h3>
              <Select.Root
                value={String(season)}
                onValueChange={(val) => setSeason(Number(val))}
              >
                <Select.Trigger className="inline-flex items-center justify-between gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-mono focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer min-w-[140px]">
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Select.Icon>
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content
                    className="z-[100] min-w-[8rem] overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-2xl p-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                  >
                    <Select.Viewport>
                      {m.seasons.filter(s => s.season_number > 0).map((s) => (
                        <Select.Item
                          key={s.id}
                          value={String(s.season_number)}
                          className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-4 text-sm outline-none hover:bg-surface-2 focus:bg-surface-2 focus:text-accent cursor-pointer transition-colors"
                        >
                          <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
                            <Select.ItemIndicator>
                              <Check className="h-4 w-4 text-accent" />
                            </Select.ItemIndicator>
                          </span>
                          <Select.ItemText>{s.name}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            <div className="overflow-hidden rounded-md border bg-muted/20">
              {seasonData?.episodes?.map((ep: Episode) => (
                <button
                  key={ep.id}
                  onClick={() => onPlay({ ...m, media_type: "tv" }, season, ep.episode_number)}
                  className="group flex w-full gap-4 border-b border-border/50 p-3 text-left transition hover:bg-surface-2 cursor-pointer"
                >
                  <div className="relative w-40 shrink-0 overflow-hidden rounded-lg aspect-video bg-background">
                    {ep.still_path ? (
                      <img src={IMG(ep.still_path, "w300")} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : null}
                    <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-black">
                        <Play size={16} className="fill-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-mono text-xs text-muted-foreground">E{ep.episode_number}</span>
                      <span className="font-medium truncate">{ep.name}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ep.overview}</p>
                    <div className="mt-1 text-mono text-[11px] text-muted-foreground">
                      {ep.air_date} {ep.runtime ? `· ${ep.runtime}m` : ""}
                    </div>
                  </div>
                </button>
              )) ?? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-xl skeleton" />)}
            </div>
          </div>
        ) : null}

        {m.belongs_to_collection && (
          <CollectionSection collectionId={m.belongs_to_collection.id} onOpen={onOpen} />
        )}

        {recommendationsList.length > 0 && (
          <div className="mt-12">
            <h3 className="mb-4 text-xl font-semibold">More like this</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {recommendationsList.slice(0, 10).map((s) => (
                <SimilarCard key={s.id} media={{ ...s, media_type: s.media_type || (tv ? "tv" : "movie") }} onOpen={onOpen} />
              ))}
            </div>
          </div>
        )}

        <div className="h-12" />
      </div>
    </div>
  );
}

function CollectionSection({ collectionId, onOpen }: { collectionId: number; onOpen: (m: Media) => void }) {
  const { data: collection } = useQuery({
    queryKey: ["collection", collectionId],
    queryFn: () => api.collection(collectionId),
    enabled: !!collectionId,
  });

  if (!collection?.parts?.length) return null;

  return (
    <div className="mt-12">
      <h3 className="mb-4 text-xl font-semibold flex items-center gap-2">
        <Library className="h-5 w-5 text-white" />
        {collection.name}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {collection.parts.map((part: Media) => (
          <SimilarCard
            key={part.id}
            media={{ ...part, media_type: "movie" }}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function SimilarCard({ media, onOpen }: { media: Media; onOpen: (m: Media) => void }) {
  return (
    <button onClick={() => onOpen(media)} className="group text-left">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface transition group-hover:ring-white/40 group-hover:-translate-y-1">
        {media.poster_path && (
          <img src={IMG(media.poster_path, "w500")} alt={title(media)} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60 group-hover:opacity-80 transition" />
      </div>
      <div className="mt-2 line-clamp-1 text-sm font-medium">{title(media)}</div>
      <div className="text-mono text-[11px] text-muted-foreground">{year(media)}</div>
    </button>
  );
}

/* ============ Layout wrappers ============ */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div vaul-drawer-wrapper="" className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}

export function Nav({ onSearchClick }: { onSearchClick?: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <nav className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-xl" : "bg-gradient-to-b from-black/60 to-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-8 px-6 md:px-12">
        <div className="flex-1">
          <Link to="/" className="inline-flex items-center">
            <img src="/logo.svg" className="h-5 w-auto object-contain" />
          </Link>
        </div>

        <div className="hidden md:flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Home</Link>
          <Link to="/browse" search={{ type: "movie" }} activeProps={{ className: "text-foreground" }} activeOptions={{ includeSearch: true }} className="hover:text-foreground transition">Movies</Link>
          <Link to="/browse" search={{ type: "tv" }} activeProps={{ className: "text-foreground" }} activeOptions={{ includeSearch: true }} className="hover:text-foreground transition">Series</Link>
          <Link to="/browse" search={{ type: "discover" }} activeProps={{ className: "text-foreground" }} activeOptions={{ includeSearch: true }} className="hover:text-foreground transition">Discover</Link>
          <Link to="/browse" search={{ type: "mylist" }} activeProps={{ className: "text-foreground" }} activeOptions={{ includeSearch: true }} className="hover:text-foreground transition">My List</Link>
        </div>

        <div className="flex-1 flex justify-end items-center gap-3">
          <Link
            to="/search"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm text-muted-foreground transition hover:bg-surface-2 hover:text-foreground hover:scale-105"
          >
            <SearchIcon /> <span className="hidden sm:inline text-mono text-xs">Search</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
