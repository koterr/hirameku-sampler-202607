import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/hirameku-sampler-202607/' : '/',
  plugins: [mkcert()],
  build: {
    assetsInlineLimit: 0,
  },
}));
