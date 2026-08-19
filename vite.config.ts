import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";
import path from "node:path";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },

  plugins: [
    {
      name: "watch-route",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const pathname = new URL(
            req.url ?? "/",
            "http://localhost",
          ).pathname;

          const isWatchPage =
            pathname === "/watch" ||
            pathname === "/watch/";

          if (!isWatchPage) {
            next();
            return;
          }

          const file = path.resolve(
            process.cwd(),
            "public/watch/index.html",
          );

          res.setHeader("Content-Type", "text/html");
          fs.createReadStream(file).pipe(res);
        });
      },
    },
  ],
});
