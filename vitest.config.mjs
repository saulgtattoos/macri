// Test runner for every automated test (logic, database rules and rendered screens).
// Separate from vite.config.js so its test project safety check stays as it is, and so tests
// read no .env files at all (screen tests replace the database client with a fake).
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envDir: false,
  test: {
    include: ['tests/**/*.test.{mjs,jsx}'],
    environment: 'node',
  },
})
