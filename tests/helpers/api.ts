import _request from 'supertest'
import type { Express } from 'express'

export const TEST_API_KEY = 'test-internal-api-key'

const HEADER = 'x-internal-api-key'

export function request(app: Express) {
  const agent = _request(app)
  return {
    get: (url: string) => agent.get(url).set(HEADER, TEST_API_KEY),
    post: (url: string) => agent.post(url).set(HEADER, TEST_API_KEY),
    put: (url: string) => agent.put(url).set(HEADER, TEST_API_KEY),
    patch: (url: string) => agent.patch(url).set(HEADER, TEST_API_KEY),
    delete: (url: string) => agent.delete(url).set(HEADER, TEST_API_KEY),
  }
}
