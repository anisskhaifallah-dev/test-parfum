import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Bootstrap 5.0.1's SCSS still uses Sass APIs (@import, color functions, slash
// division, global built-ins) that current Dart Sass flags as deprecated.
// Silenced here since they're warnings only, coming from the vendored
// Bootstrap source, not from this project's own styles.
export default defineConfig({
  server: {
    // Expose on the LAN so the dev server is reachable from a phone on the same WiFi.
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        forHer: resolve(__dirname, 'for-her.html'),
        forHim: resolve(__dirname, 'for-him.html'),
        packs: resolve(__dirname, 'packs.html'),
        product: resolve(__dirname, 'product.html'),
        search: resolve(__dirname, 'search.html'),
        cart: resolve(__dirname, 'cart.html'),
        wishlist: resolve(__dirname, 'wishlist.html'),
        staff: resolve(__dirname, 'staff.html'),
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import', 'color-functions', 'global-builtin', 'slash-div', 'if-function', 'function-units'],
      },
    },
  },
});
