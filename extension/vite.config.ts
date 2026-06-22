import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      // Map aliases to absolute paths with explicit extensions handled by Vite
      "@lib": resolve(__dirname, "src/lib"),
      "@types-ext": resolve(__dirname, "src/types"),
      "@hooks": resolve(__dirname, "src/hooks"),
      "@components": resolve(__dirname, "src/components"),
    },
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
