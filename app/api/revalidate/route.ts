import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'

// Set a secret token for security (change this to a strong value and keep it secret)
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || '9cQqqaV6l6OPYhslilv1RCXhsVRZ4CVQ3wTYV3Vcck5axiU4BPcCApHV9aT0yUhO'

export async function POST(req: NextRequest) {
  const { tag, path, secret } = await req.json()

  if (secret !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  // Revalidate by tag (for song pages)
  if (tag) {
    try {
      console.log(`Revalidating tag: ${tag}`)
      await revalidateTag(tag)
      return NextResponse.json({ revalidated: true, type: 'tag', tag, now: Date.now() })
    } catch (err) {
      console.error('Tag revalidation error:', err)
      return NextResponse.json({ error: 'Failed to revalidate tag', details: String(err) }, { status: 500 })
    }
  }

  // Revalidate by path (for home page and other pages)
  if (path) {
    try {
      console.log(`Revalidating path: ${path}`)
      revalidatePath(path, 'page')
      return NextResponse.json({ revalidated: true, type: 'path', path, now: Date.now() })
    } catch (err) {
      console.error('Path revalidation error:', err)
      return NextResponse.json({ error: 'Failed to revalidate path', details: String(err) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Missing tag or path parameter' }, { status: 400 })
}

export const dynamic = 'force-dynamic' // Ensure this route is always dynamic
