import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { api, type Media } from "@/lib/tmdb";

export function parseMediaParam(param?: string | null): { type: "movie" | "tv"; id: number } | null {
  if (!param) return null;
  const match = param.trim().match(/^(movie|tv)-(\d+)$/i);
  if (!match) return null;
  const type = match[1].toLowerCase() as "movie" | "tv";
  const id = parseInt(match[2], 10);
  if (isNaN(id) || id <= 0) return null;
  return { type, id };
}

export function formatMediaParam(media: { id: number; media_type?: string; first_air_date?: string; number_of_seasons?: number }): string {
  const isTvShow = media.media_type === "tv" || Boolean(media.first_air_date) || Boolean(media.number_of_seasons);
  const type = isTvShow ? "tv" : "movie";
  return `${type}-${media.id}`;
}

export function updateMediaUrlParam(mediaParam: string | null, push: boolean = true) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const currentParam = url.searchParams.get("media");

  if (mediaParam) {
    if (currentParam === mediaParam) return;
    url.searchParams.set("media", mediaParam);
    const newUrl = url.pathname + (url.search ? url.search : "") + url.hash;
    if (push) {
      window.history.pushState(window.history.state, "", newUrl);
    } else {
      window.history.replaceState(window.history.state, "", newUrl);
    }
  } else {
    if (!currentParam) return;
    url.searchParams.delete("media");
    const newUrl = url.pathname + (url.search ? url.search : "") + url.hash;
    window.history.replaceState(window.history.state, "", newUrl);
  }
}

export function useMediaDrawer() {
  const location = useLocation();
  const searchStr = location?.searchStr ?? (typeof window !== "undefined" ? window.location.search : "");

  const [selected, setSelectedState] = useState<Media | null>(null);
  const [drawerOpen, setDrawerOpenState] = useState(false);
  const [urlTarget, setUrlTarget] = useState<{ type: "movie" | "tv"; id: number } | null>(null);

  // Synchronize state when URL search string changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const mediaParam = params.get("media");
    const parsed = parseMediaParam(mediaParam);

    if (parsed) {
      setUrlTarget(parsed);
      setDrawerOpenState(true);
    } else {
      setUrlTarget(null);
      setDrawerOpenState(false);
      setSelectedState(null);
    }
  }, [searchStr]);

  // Listen to browser popstate (Back / Forward navigation)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const mediaParam = params.get("media");
      const parsed = parseMediaParam(mediaParam);
      if (parsed) {
        setUrlTarget(parsed);
        setDrawerOpenState(true);
      } else {
        setUrlTarget(null);
        setDrawerOpenState(false);
        setSelectedState(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Query TMDB data if URL points to a media item that isn't loaded into `selected` state yet
  const { data: fetchedMedia, isError } = useQuery({
    queryKey: ["media-drawer-url-fetch", urlTarget?.type, urlTarget?.id],
    queryFn: async () => {
      if (!urlTarget) return null;
      const res = urlTarget.type === "tv" ? await api.tv(urlTarget.id) : await api.movie(urlTarget.id);
      return { ...res, media_type: urlTarget.type } as Media;
    },
    enabled: !!urlTarget && (!selected || selected.id !== urlTarget.id),
  });

  // When fetched media arrives, update `selected` state
  useEffect(() => {
    if (urlTarget && fetchedMedia && fetchedMedia.id === urlTarget.id) {
      setSelectedState(fetchedMedia);
    }
  }, [urlTarget, fetchedMedia]);

  // Clean up if invalid media ID or fetch fails
  useEffect(() => {
    if (isError && urlTarget) {
      setDrawerOpenState(false);
      setUrlTarget(null);
      setSelectedState(null);
      updateMediaUrlParam(null, false);
    }
  }, [isError, urlTarget]);

  // Function to open drawer for a media object
  const openDetail = useCallback((m: Media, fallbackType?: "movie" | "tv") => {
    const isTvShow = m.media_type === "tv" || fallbackType === "tv" || Boolean(m.first_air_date) || Boolean(m.number_of_seasons);
    const mediaWithType: Media = {
      ...m,
      media_type: isTvShow ? "tv" : "movie",
    };
    const param = formatMediaParam(mediaWithType);
    setSelectedState(mediaWithType);
    setUrlTarget({ type: isTvShow ? "tv" : "movie", id: mediaWithType.id });
    setDrawerOpenState(true);
    updateMediaUrlParam(param, true);
  }, []);

  // Function to change or clear selected media
  const setSelected = useCallback((m: Media | null) => {
    if (m) {
      const isTvShow = m.media_type === "tv" || Boolean(m.first_air_date) || Boolean(m.number_of_seasons);
      const mediaWithType: Media = {
        ...m,
        media_type: isTvShow ? "tv" : "movie",
      };
      const param = formatMediaParam(mediaWithType);
      setSelectedState(mediaWithType);
      setUrlTarget({ type: isTvShow ? "tv" : "movie", id: mediaWithType.id });
      setDrawerOpenState(true);
      updateMediaUrlParam(param, true);
    } else {
      setSelectedState(null);
      setUrlTarget(null);
      setDrawerOpenState(false);
      updateMediaUrlParam(null, false);
    }
  }, []);

  // Function to set drawer open status
  const setDrawerOpen = useCallback((open: boolean) => {
    setDrawerOpenState(open);
    if (!open) {
      setUrlTarget(null);
      updateMediaUrlParam(null, false);
    }
  }, []);

  return {
    selected,
    drawerOpen,
    openDetail,
    setSelected,
    setDrawerOpen,
  };
}
