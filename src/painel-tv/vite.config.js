import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

export default defineConfig({
  base: '/painel-tv/',
  plugins: [
    legacy({
      targets: ['chrome >= 49', 'safari >= 10', 'ie >= 11', 'defaults'],
    }),
  ],
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, '../../public/painel-tv'),
    emptyOutDir: true,
  },
});
