import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// `vite --mode test` must point at the synthetic test project, never the live one.
// .env.test.local has to set VITE_SUPABASE_URL and VITE_SUPABASE_TEST_PROJECT=true,
// and its URL must differ from the URL in .env.
function assertTestProject(mode) {
  if (mode !== 'test') return
  const testEnv = loadEnv('test', process.cwd(), 'VITE_')
  const liveEnv = loadEnv('production', process.cwd(), 'VITE_')
  if (testEnv.VITE_SUPABASE_TEST_PROJECT !== 'true' || !testEnv.VITE_SUPABASE_URL
    || testEnv.VITE_SUPABASE_URL === liveEnv.VITE_SUPABASE_URL) {
    throw new Error('Test mode needs .env.test.local with the TEST project VITE_SUPABASE_URL and VITE_SUPABASE_TEST_PROJECT=true')
  }
}

export default defineConfig(({ mode }) => {
  assertTestProject(mode)
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
