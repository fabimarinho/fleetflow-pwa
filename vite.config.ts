// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro,
//   componentTagger, VITE_* env injection, @ alias and React/TanStack dedupe.

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
  },
});
