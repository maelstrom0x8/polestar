import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const mockData = (process.env.VITE_MOCK_DATA ?? env.VITE_MOCK_DATA) === 'true'
  if (mockData && mode === 'production') {
    console.warn('\n  VITE_MOCK_DATA=true: this build shows sample data, not the contract.\n')
  }
  return {
    plugins: [react()],
    // A compile-time constant, so a build without sample data drops the
    // mock modules entirely instead of shipping them unused.
    define: { __MOCK_DATA__: JSON.stringify(mockData) },
  }
})
