/**
 * @jest-environment node
 */

/**
 * Test suite for Revalidate API Route
 * Tests the cache revalidation functionality for GET and POST endpoints
 */

// Mock Next.js cache functions BEFORE any imports
jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { revalidateTag, revalidatePath } from 'next/cache'

describe('Revalidate API Route', () => {
  const mockSecret = process.env.REVALIDATE_SECRET || '9cQqqaV6l6OPYhslilv1RCXhsVRZ4CVQ3wTYV3Vcck5axiU4BPcCApHV9aT0yUhO'

  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('POST /api/revalidate', () => {
    describe('Authentication', () => {
      it('should return 401 for invalid secret', async () => {
        const request = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({
            secret: 'invalid-secret',
            clearAll: true,
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Invalid secret')
      })

      it('should return 401 for missing secret', async () => {
        const request = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({
            clearAll: true,
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Invalid secret')
      })
    })

    describe('Clear All Functionality', () => {
      it('should clear all caches successfully', async () => {
        const request = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({
            secret: mockSecret,
            clearAll: true,
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.revalidated).toBe(true)
        expect(data.type).toBe('all')
        expect(data.message).toBe('All Next.js caches cleared')

        // Verify cache functions were called
        expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
        expect(revalidateTag).toHaveBeenCalledWith('songs-latest')
        expect(revalidateTag).toHaveBeenCalledWith('homepage')
        expect(revalidateTag).toHaveBeenCalledWith('trending-api')
      })
    })

    describe('Revalidate by Tag', () => {
      it('should revalidate a specific tag', async () => {
        const testTag = 'song-test-slug'
        const request = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({
            secret: mockSecret,
            tag: testTag,
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.revalidated).toBe(true)
        expect(data.type).toBe('tag')
        expect(data.tag).toBe(testTag)

        expect(revalidateTag).toHaveBeenCalledWith(testTag)
      })
    })

    describe('Revalidate by Path', () => {
      it('should clear homepage cache', async () => {
        const request = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({
            secret: mockSecret,
            path: '/',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.revalidated).toBe(true)
        expect(data.path).toBe('/')
        expect(data.results).toContain('Cleared homepage (data + page render)')

        expect(revalidateTag).toHaveBeenCalledWith('songs-latest')
        expect(revalidateTag).toHaveBeenCalledWith('homepage')
        expect(revalidatePath).toHaveBeenCalledWith('/')
      })

      it('should clear search page cache', async () => {
        const request = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({
            secret: mockSecret,
            path: '/search',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.revalidated).toBe(true)
        expect(data.path).toBe('/search')
        expect(data.results).toContain('Cleared trending API cache (Next.js + CDN)')

        expect(revalidateTag).toHaveBeenCalledWith('trending-api')
      })

      it('should clear trending API cache', async () => {
        const request = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({
            secret: mockSecret,
            path: '/api/trending',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.revalidated).toBe(true)
        expect(revalidateTag).toHaveBeenCalledWith('trending-api')
      })

      it('should clear specific song page cache', async () => {
        const songPath = '/test-song-lyrics.html'
        const request = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({
            secret: mockSecret,
            path: songPath,
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.revalidated).toBe(true)
        expect(data.path).toBe(songPath)

        // Should clear all three types: page, cdn, api
        expect(revalidateTag).toHaveBeenCalledWith('song-test-song-lyrics')
        expect(revalidateTag).toHaveBeenCalledWith('cdn-test-song-lyrics')
        expect(revalidateTag).toHaveBeenCalledWith('api-test-song-lyrics')
        expect(revalidatePath).toHaveBeenCalledWith(songPath)
        expect(revalidatePath).toHaveBeenCalledWith('/songs/test-song-lyrics.json')
        expect(revalidatePath).toHaveBeenCalledWith('/api/songs/test-song-lyrics')
      })

      it('should clear specific cache type for song', async () => {
        const songPath = '/test-song-lyrics.html'
        const request = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({
            secret: mockSecret,
            path: songPath,
            type: 'page',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.type).toBe('page')

        // Should only clear page type
        expect(revalidateTag).toHaveBeenCalledWith('song-test-song-lyrics')
        expect(revalidatePath).toHaveBeenCalledWith(songPath)
        expect(revalidateTag).not.toHaveBeenCalledWith('cdn-test-song-lyrics')
        expect(revalidateTag).not.toHaveBeenCalledWith('api-test-song-lyrics')
      })
    })

    describe('Error Cases', () => {
      it('should return 400 when no parameters provided', async () => {
        const request = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({
            secret: mockSecret,
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Missing tag, path, or clearAll parameter')
      })
    })
  })

  describe('GET /api/revalidate', () => {
    describe('Authentication', () => {
      it('should return 401 for invalid secret', async () => {
        const request = new NextRequest('http://localhost:3000/api/revalidate?secret=invalid&clearAll=true')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Invalid or missing secret')
        expect(data.usage).toBeDefined()
      })

      it('should return 401 for missing secret', async () => {
        const request = new NextRequest('http://localhost:3000/api/revalidate?clearAll=true')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Invalid or missing secret')
      })
    })

    describe('Clear All Functionality', () => {
      it('should clear all caches via GET', async () => {
        const request = new NextRequest(`http://localhost:3000/api/revalidate?secret=${mockSecret}&clearAll=true`)

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.revalidated).toBe(true)
        expect(data.type).toBe('all')
        expect(data.message).toBe('All Next.js caches cleared (GET)')

        expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
        expect(revalidateTag).toHaveBeenCalledWith('songs-latest')
        expect(revalidateTag).toHaveBeenCalledWith('homepage')
        expect(revalidateTag).toHaveBeenCalledWith('trending-api')
      })
    })

    describe('Revalidate by Tag', () => {
      it('should revalidate a specific tag via GET', async () => {
        const testTag = 'song-test-slug'
        const request = new NextRequest(`http://localhost:3000/api/revalidate?secret=${mockSecret}&tag=${testTag}`)

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.revalidated).toBe(true)
        expect(data.type).toBe('tag')
        expect(data.tag).toBe(testTag)

        expect(revalidateTag).toHaveBeenCalledWith(testTag)
      })
    })

    describe('Revalidate by Path', () => {
      it('should clear homepage cache via GET', async () => {
        const request = new NextRequest(`http://localhost:3000/api/revalidate?secret=${mockSecret}&path=/`)

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.revalidated).toBe(true)
        expect(data.path).toBe('/')

        expect(revalidateTag).toHaveBeenCalledWith('songs-latest')
        expect(revalidateTag).toHaveBeenCalledWith('homepage')
        expect(revalidatePath).toHaveBeenCalledWith('/')
      })

      it('should clear specific song page via GET', async () => {
        const songPath = '/test-song-lyrics.html'
        const request = new NextRequest(`http://localhost:3000/api/revalidate?secret=${mockSecret}&path=${encodeURIComponent(songPath)}`)

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.revalidated).toBe(true)
        expect(data.path).toBe(songPath)

        expect(revalidateTag).toHaveBeenCalledWith('song-test-song-lyrics')
        expect(revalidateTag).toHaveBeenCalledWith('cdn-test-song-lyrics')
        expect(revalidateTag).toHaveBeenCalledWith('api-test-song-lyrics')
      })

      it('should support type parameter via GET', async () => {
        const songPath = '/test-song-lyrics.html'
        const request = new NextRequest(`http://localhost:3000/api/revalidate?secret=${mockSecret}&path=${encodeURIComponent(songPath)}&type=cdn`)

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.type).toBe('cdn')

        // Should only clear CDN type
        expect(revalidateTag).toHaveBeenCalledWith('cdn-test-song-lyrics')
        expect(revalidatePath).toHaveBeenCalledWith('/songs/test-song-lyrics.json')
        expect(revalidateTag).not.toHaveBeenCalledWith('song-test-song-lyrics')
        expect(revalidateTag).not.toHaveBeenCalledWith('api-test-song-lyrics')
      })
    })

    describe('Error Cases', () => {
      it('should return 400 when no parameters provided', async () => {
        const request = new NextRequest(`http://localhost:3000/api/revalidate?secret=${mockSecret}`)

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Missing parameter')
        expect(data.usage).toBeDefined()
      })
    })
  })

  describe('Response Headers', () => {
    it('should include no-cache headers in response', async () => {
      const request = new NextRequest(`http://localhost:3000/api/revalidate?secret=${mockSecret}&clearAll=true`)

      const response = await GET(request)

      expect(response.headers.get('Cache-Control')).toContain('no-store')
      expect(response.headers.get('Cache-Control')).toContain('no-cache')
      expect(response.headers.get('Pragma')).toBe('no-cache')
      expect(response.headers.get('CDN-Cache-Control')).toBe('no-store')
    })
  })
})
