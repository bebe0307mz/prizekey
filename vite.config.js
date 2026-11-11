import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: process.env.GITHUB_PAGES === '1' ? '/prizekey/' : '/',
  plugins: [react(), nodePolyfills()],
  server: { port: 5175 },
});
