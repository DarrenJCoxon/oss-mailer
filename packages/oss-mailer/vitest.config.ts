import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
// Set the Vite root to the repo root so that relative imports from tests
// can cross into ../../src/api/... (the contract parity test).
const repoRoot = resolve(__dirname, '../..')

export default defineConfig({
  root: repoRoot,
  test: {
    include: [resolve(__dirname, 'src/**/*.test.ts')],
    environment: 'node',
  },
})
