'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const LAST_POST_COOKIE = 'last-post-id'
const LAST_REVALIDATION_COOKIE = 'last-revalidation'
const REVALIDATION_COOLDOWN = 5 * 60 * 1000 // 5 minutes cooldown

interface BloggerPost {
  id: { $t: string }
  published: { $t: string }
  title?: { $t: string }
}

interface RevalidationResult {
  revalidated: boolean
  reason?: string
  newPostId?: string
  newPostTitle?: string
  timestamp?: string
  cooldownRemaining?: number
  error?: string
}

/**
 * Automatically detect new posts and revalidate sitemap
 * Called from home page after fetching latest songs
 * 
 * @param latestPosts - Array of latest blog posts from Blogger API
 * @returns RevalidationResult with status and details
 */
export async function checkAndRevalidateSitemap(
  latestPosts: BloggerPost[]
): Promise<RevalidationResult> {
  try {
    if (!latestPosts || latestPosts.length === 0) {
      return { revalidated: false, reason: 'No posts found' }
    }

    const latestPost = latestPosts[0]
    const latestPostId = latestPost.id.$t
    const latestPostTitle = latestPost.title?.$t || 'Unknown Song'

    // Get last known post from cookie
    const cookieStore = await cookies()
    const lastKnownPostId = cookieStore.get(LAST_POST_COOKIE)?.value
    const lastRevalidationTime = cookieStore.get(LAST_REVALIDATION_COOKIE)?.value

    // Check if this is a new post
    const isNewPost = lastKnownPostId !== latestPostId

    if (!isNewPost) {
      return { revalidated: false, reason: 'No new posts detected' }
    }

    // Check cooldown to prevent excessive revalidations
    if (lastRevalidationTime) {
      const timeSinceLastRevalidation = Date.now() - parseInt(lastRevalidationTime)
      if (timeSinceLastRevalidation < REVALIDATION_COOLDOWN) {
        const cooldownRemaining = Math.ceil(
          (REVALIDATION_COOLDOWN - timeSinceLastRevalidation) / 1000
        )
        return {
          revalidated: false,
          reason: 'Cooldown period active',
          cooldownRemaining,
        }
      }
    }

    // New post detected! Trigger revalidation
    console.log('🎵 New song detected! Auto-revalidating sitemap...')
    console.log(`   Previous post: ${lastKnownPostId || 'None'}`)
    console.log(`   New post: ${latestPostId}`)
    console.log(`   Title: ${latestPostTitle}`)

    // Revalidate sitemap index
    revalidatePath('/sitemap.xml')

    // Revalidate all paginated sitemaps
    for (let i = 0; i <= 3; i++) {
      revalidatePath(`/sitemap/${i}.xml`)
    }

    // Revalidate home page to show latest songs
    revalidatePath('/')

    // Update tracking cookies
    cookieStore.set(LAST_POST_COOKIE, latestPostId, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
      sameSite: 'lax',
    })
    cookieStore.set(LAST_REVALIDATION_COOKIE, Date.now().toString(), {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })

    console.log('✅ Sitemap auto-revalidation completed successfully')

    return {
      revalidated: true,
      newPostId: latestPostId,
      newPostTitle: latestPostTitle,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('❌ Auto-revalidation failed:', error)
    return {
      revalidated: false,
      reason: 'Revalidation error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Manually reset tracking (useful for testing)
 */
export async function resetSitemapTracking(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(LAST_POST_COOKIE)
  cookieStore.delete(LAST_REVALIDATION_COOKIE)
  console.log('🔄 Sitemap tracking reset')
}
