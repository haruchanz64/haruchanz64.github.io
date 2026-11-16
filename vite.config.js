import { resolve } from "node:path";
import { defineConfig } from "vite";

function minifyHtmlPlugin() {
  return {
    name: "minify-html",
    transformIndexHtml(html) {
      return html
        .replace(/<!--(?!\[if)[\s\S]*?-->/g, "")
        .replace(/>\s+</g, "><")
        .replace(/\s{2,}/g, " ")
        .trim();
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [minifyHtmlPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        notFound: resolve(__dirname, "404.html"),
      },
    },
  },
});
