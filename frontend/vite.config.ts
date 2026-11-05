import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 프록시 없음. API origin은 .env의 VITE_API_URL (NFR-06 (6))
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
