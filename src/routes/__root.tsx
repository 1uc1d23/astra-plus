import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { House, Film, Tv, BookSearch, List } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Lost in space</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The title you're looking for isn't here.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:scale-105">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again or head home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:scale-105"
          >
            Try again
          </button>
          <a href="/" className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium transition hover:bg-surface-2">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Astra+ — Stream Movies & Series" },
      { name: "description", content: "Discover, browse and stream movies and series in a clean, minimalist experience." },
      { name: "theme-color", content: "#232323" },
      { property: "og:title", content: "Astra+ — Stream Movies & Series" },
      { property: "og:description", content: "Discover, browse and stream movies and series." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500"
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function TopLoadingBar() {
  const isLoading = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading,
  });

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    if (isLoading) {
      setVisible(true);
      setProgress(20);

      // Smoothly trickle forward in larger increments
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) return 85;
          return prev + Math.floor(Math.random() * 8) + 4;
        });
      }, 200);
    } else {
      // Complete bar to 100%
      setProgress(100);

      // Keep it visible at 100% briefly before disappearing
      timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isLoading]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-0.25 w-full bg-transparent">
      <div
        className="h-full bg-accent"
        style={{
          width: `${progress}%`,
          // Inline transition ensures a buttery-smooth slide every time width increases
          transition: progress === 100 ? "width 200ms ease-out, opacity 300ms ease-in 100ms" : "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

function MobileBottomNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const search = (location.search ?? {}) as { type?: string };

  // Don't light up any icon when on Search page
  const isSearchPage = pathname.startsWith("/search");

  const navItems = [
    {
      id: "home",
      label: "Home",
      to: "/",
      search: undefined,
      icon: House,
      isActive: !isSearchPage && pathname === "/",
    },
    {
      id: "movies",
      label: "Movies",
      to: "/browse",
      search: { type: "movie" },
      icon: Film,
      isActive: !isSearchPage && pathname === "/browse" && search.type === "movie",
    },
    {
      id: "series",
      label: "Series",
      to: "/browse",
      search: { type: "tv" },
      icon: Tv,
      isActive: !isSearchPage && pathname === "/browse" && search.type === "tv",
    },
    {
      id: "discover",
      label: "Discover",
      to: "/browse",
      search: { type: "discover" },
      icon: BookSearch,
      isActive: !isSearchPage && pathname === "/browse" && search.type === "discover",
    },
    {
      id: "mylist",
      label: "My List",
      to: "/browse",
      search: { type: "mylist" },
      icon: List,
      isActive: !isSearchPage && pathname === "/browse" && search.type === "mylist",
    },
  ];

  const activeIndex = navItems.findIndex((item) => item.isActive);

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 block md:hidden w-[calc(100vw-2rem)] max-w-[400px] rounded-full border border-border/40 bg-background/60 backdrop-blur-xl px-2 py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] shadow-lg">
      <div className="relative flex items-center justify-between max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.to}
              search={item.search}
              aria-label={item.label}
              className="relative flex flex-1 flex-col items-center justify-center py-2.5 focus:outline-none"
            >
              <Icon
                className={`h-[18px] w-[18px] transition-opacity duration-200 ${item.isActive ? "opacity-100 text-white" : "opacity-50 text-white hover:opacity-70"
                  }`}
              />
            </Link>
          );
        })}

        {/* Animated bounce underline indicator */}
        {activeIndex !== -1 && (
          <div
            className="absolute bottom-1 h-[2px] w-5 rounded-full bg-accent transition-all duration-300"
            style={{
              left: `calc(${activeIndex * 20}% + 10% - 10px)`,
              transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        )}
      </div>
    </nav>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <Tooltip.Provider delayDuration={250} skipDelayDuration={100}>
      <QueryClientProvider client={queryClient}>
        <TopLoadingBar />
        <div className="pb-16 md:pb-0">
          <Outlet />
        </div>
        <MobileBottomNav />
      </QueryClientProvider>
    </Tooltip.Provider>
  );
}
