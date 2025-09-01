import { defineConfig } from 'vite';

// Set `base` to the repository name used on GitHub Pages (e.g. '/http-sequencer/').
// If your repo lives at https://<user>.github.io/<repo>/, set base to '/<repo>/'
export default defineConfig({
  base: '/http-sequencer/',
  server: {
    host: true
  }
});
