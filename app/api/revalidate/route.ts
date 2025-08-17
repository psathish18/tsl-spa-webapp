import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

// Set a secret token for security (change this to a strong value and keep it secret)
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'changeme'

export async function POST(req: NextRequest) {
  const { tag, secret } = await req.json()

  if (secret !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }
  if (!tag) {
    return NextResponse.json({ error: 'Missing tag' }, { status: 400 })
  }

  try {
    await revalidateTag(tag)
    return NextResponse.json({ revalidated: true, tag })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to revalidate', details: String(err) }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic' // Ensure this route is always dynamic
