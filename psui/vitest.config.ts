import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: { __MOCK_DATA__: 'false' },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
  },
});
