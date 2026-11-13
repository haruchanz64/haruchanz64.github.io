import { defineConfig } from "vite";
import { resolve } from "path";

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
      },
    },
  },
});
