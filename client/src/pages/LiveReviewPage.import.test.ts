import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve('src/pages/LiveReviewPage.vue'), 'utf8')

assert.equal(
  source.includes('liveReviewsAPI'),
  false,
  'LiveReviewPage must not depend on the newly added liveReviewsAPI named export because stale Vite modules can break route navigation',
)

console.log('live review page import test passed')
