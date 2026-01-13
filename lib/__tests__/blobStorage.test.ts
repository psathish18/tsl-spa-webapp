/**
 * Test suite for Blob Storage utility
 * Tests the blob storage fetch functionality and fallback behavior
 */

import { fetchFromBlob, isBlobStorageAvailable, normalizeBloggerSong } from '../blobStorage'
import type { SongBlobData } from '@/scripts/types/song-blob.types'

// Mock fetch globally
global.fetch = jest.fn()

describe('Blob Storage Utility', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_BLOB_BASE_URL
  })

  describe('isBlobStorageAvailable', () => {
    it('should always return true in hybrid mode', () => {
      expect(isBlobStorageAvailable()).toBe(true)
    })
  })

  describe('fetchFromBlob', () => {
    const mockBlobData: SongBlobData = {
      version: 1,
      slug: 'test-song-lyrics',
      id: 'test-id-123',
      title: 'Test Song Lyrics',
      movieName: 'Test Movie',
      singerName: 'Test Singer',
      lyricistName: 'Test Lyricist',
      musicName: 'Test Music',
      actorName: 'Test Actor',
      published: '2024-01-01T00:00:00.000Z',
      date: '2024-01-01T00:00:00.000Z',
      thumbnail: 'https://example.com/image.jpg',
      link: 'https://tsonglyricsapp.blogspot.com/test-song',
      stanzas: ['Line 1<br />\nLine 2', 'Line 3<br />\nLine 4'],
      hasTamilLyrics: true,
      tamilStanzas: ['தமிழ் வரி 1<br />\nதமிழ் வரி 2'],
      category: ['Actor:TestActor', 'Singer:TestSinger', 'Movie:TestMovie'],
      relatedSongs: [
        {
          id: 'related-1',
          title: 'Related Song 1',
          slug: 'related-song-1',
          movieName: 'Test Movie',
          singerName: 'Test Singer',
          published: '2024-01-01T00:00:00.000Z',
          thumbnail: 'https://example.com/related1.jpg'
        }
      ],
      seo: {
        title: 'Test Song Lyrics - Tamil Song Lyrics',
        description: 'Test song description',
        keywords: 'test, song, lyrics',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'MusicRecording',
          name: 'Test Song',
          description: 'Test description',
          inLanguage: 'ta',
          genre: 'Tamil Film Music',
          datePublished: '2024-01-01',
          byArtist: { '@type': 'Person', name: 'TestActor', url: 'https://example.com' },
          lyricist: { '@type': 'Person', name: 'TestLyricist', url: 'https://example.com' },
          inAlbum: { '@type': 'MusicAlbum', name: 'Test Movie', url: 'https://example.com' },
          publisher: { '@type': 'Organization', name: 'Tamil Song Lyrics', url: 'https://example.com' }
        }
      }
    }

    it('should fetch from CDN successfully with retry logic', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBlobData
      })

      const result = await fetchFromBlob('test-song-lyrics')
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/songs/test-song-lyrics.json',
        expect.objectContaining({
          next: expect.objectContaining({
            revalidate: 2592000,
            tags: ['cdn-test-song-lyrics']
          })
        })
      )
      expect(result).toEqual(mockBlobData)
    })

    it('should strip .html extension from slug', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBlobData
      })

      await fetchFromBlob('test-song-lyrics.html')
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/songs/test-song-lyrics.json',
        expect.any(Object)
      )
    })

    it('should return null when CDN returns 404', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const result = await fetchFromBlob('non-existent-song')
      expect(result).toBeNull()
    })

    it('should return null when CDN data is invalid (missing required fields)', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
      
      const invalidData = { slug: 'test' } // Missing title and stanzas
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => invalidData
      })

      const result = await fetchFromBlob('test-song-lyrics')
      expect(result).toBeNull()
    })

    it('should retry on network errors and eventually return null', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
      
      // Fail all retry attempts
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchFromBlob('test-song-lyrics')
      
      // Should have tried 3 times (1 initial + 2 retries)
      expect(fetch).toHaveBeenCalledTimes(3)
      expect(result).toBeNull()
    })

    it('should succeed on retry after initial failure', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
      
      // Fail first, succeed on retry
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockBlobData
        })

      const result = await fetchFromBlob('test-song-lyrics')
      
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockBlobData)
    })

    it('should handle non-404 HTTP errors', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const result = await fetchFromBlob('test-song-lyrics')
      expect(result).toBeNull()
    })

    it('should handle JSON parse errors gracefully', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      const result = await fetchFromBlob('test-song-lyrics')
      expect(result).toBeNull()
    })
  })

  describe('normalizeBloggerSong', () => {
    it('should normalize Blogger API response', () => {
      const bloggerSong = {
        id: { $t: 'blog-123' },
        title: { $t: 'Test Song Lyrics' },
        content: { $t: '<p>Lyrics content</p>' },
        published: { $t: '2024-01-01T00:00:00.000Z' },
        author: [{ name: { $t: 'Admin' } }],
        category: [
          { term: 'Song:Test Song' },
          { term: 'Actor:Test Actor' }
        ],
        media$thumbnail: { url: 'https://example.com/thumb.jpg' },
        songTitle: 'Test Song',
        movieName: 'Test Movie',
        singerName: 'Test Singer',
        lyricistName: 'Test Lyricist',
        extraField: 'should be included' // Extra fields should pass through
      }

      const normalized = normalizeBloggerSong(bloggerSong)

      expect(normalized).toEqual({
        id: bloggerSong.id,
        title: bloggerSong.title,
        content: bloggerSong.content,
        published: bloggerSong.published,
        author: bloggerSong.author,
        category: bloggerSong.category,
        media$thumbnail: bloggerSong.media$thumbnail,
        songTitle: bloggerSong.songTitle,
        movieName: bloggerSong.movieName,
        singerName: bloggerSong.singerName,
        lyricistName: bloggerSong.lyricistName,
      })
    })

    it('should handle missing optional fields', () => {
      const minimalSong = {
        id: { $t: 'blog-123' },
        title: { $t: 'Test Song' },
        content: { $t: 'Content' },
        published: { $t: '2024-01-01' },
        author: [{ name: { $t: 'Admin' } }],
      }

      const normalized = normalizeBloggerSong(minimalSong)

      expect(normalized.id).toEqual(minimalSong.id)
      expect(normalized.category).toBeUndefined()
      expect(normalized.songTitle).toBeUndefined()
    })
  })
})
