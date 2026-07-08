import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/ccbt-sound-design-workshop/' : '/',
  plugins: [mkcert()],
  build: {
    assetsInlineLimit: 0,
  },
}));
