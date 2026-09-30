import { defineConfig } from 'vite';

// --host (in package.json) lets you open the game on your phone over Wi-Fi
export default defineConfig({
  server: { port: 5173 },
  build: { target: 'es2020' },
});
