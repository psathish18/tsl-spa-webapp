/**
 * Upload hotpost.json to Vercel Blob Storage and Edge Config
 * Usage: BLOB_READ_WRITE_TOKEN=xxx EDGE_CONFIG_TOKEN=yyy ts-node scripts/upload-hotpost.ts [--dry-run]
 */

import { put } from '@vercel/blob'
import { createClient } from '@vercel/edge-config'
import fs = require('fs/promises')
import path = require('path')

const HOTPOST_FILE = path.join(__dirname, '../hotpost.json')
const BLOB_KEY = 'hotpost.json'

/**
 * Check if required tokens are set
 */
function checkTokens(): boolean {
  const missing = []

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    missing.push('BLOB_READ_WRITE_TOKEN')
  }

  // EDGE_CONFIG is optional - only needed for reading from Edge Config
  // Writing to Edge Config must be done via Vercel CLI/dashboard

  if (missing.length > 0) {
    console.error('❌ Error: Missing required environment variables:')
    missing.forEach(token => {
      console.error(`   - ${token}`)
    })
    console.error('\nGet tokens from:')
    console.error('  BLOB_READ_WRITE_TOKEN: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk#generate-a-blob-read-write-token')
    console.error('\nUsage: BLOB_READ_WRITE_TOKEN=xxx npm run upload-hotpost')
    return false
  }

  return true
}

/**
 * Check if hotpost.json exists
 */
async function checkFile(): Promise<boolean> {
  try {
    await fs.access(HOTPOST_FILE)
    return true
  } catch {
    console.error(`❌ Error: ${HOTPOST_FILE} not found`)
    return false
  }
}

/**
 * Get file stats
 */
async function getFileStats(): Promise<{ size: number; modified: Date }> {
  const stats = await fs.stat(HOTPOST_FILE)
  return {
    size: stats.size,
    modified: stats.mtime
  }
}

/**
 * Check if blob already exists and compare
 */
async function shouldUpload(dryRun: boolean): Promise<boolean> {
  // Always upload for now - we can add more sophisticated checks later
  if (!dryRun) {
    console.log('📦 Will upload hotpost data')
  }
  return true
}

/**
 * Upload hotpost.json to both blob storage and edge config
 */
async function uploadHotpost(dryRun: boolean = false): Promise<void> {
  try {
    // Check prerequisites
    if (!checkTokens()) return
    if (!await checkFile()) return

    // Check if we should upload
    if (!await shouldUpload(dryRun)) return

    const fileStats = await getFileStats()
    const content = await fs.readFile(HOTPOST_FILE, 'utf-8')
    const data = JSON.parse(content)

    if (dryRun) {
      console.log(`🔍 DRY RUN: Would upload ${HOTPOST_FILE}`)
      console.log(`   Size: ${fileStats.size} bytes`)
      console.log(`   To: public/songs/hotpost.json and blob:${BLOB_KEY}`)
      console.log(`   Edge Config: Update manually via Vercel CLI`)
      console.log(`   Data:`, data)
      return
    }

    console.log(`📤 Uploading ${HOTPOST_FILE}...`)

    // Copy to public/songs directory for CDN serving
    console.log('📋 Copying to public/songs directory for CDN...')
    const publicDir = path.join(__dirname, '../public/songs')
    await fs.mkdir(publicDir, { recursive: true })
    await fs.copyFile(HOTPOST_FILE, path.join(publicDir, 'hotpost.json'))

    // Upload to Blob Storage
    console.log('⬆️  Uploading to Vercel Blob Storage...')
    const blob = await put(BLOB_KEY, content, {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN!
    })

    // Note: Edge Config updates need to be done via Vercel CLI or dashboard
    console.log('ℹ️  Edge Config: Update manually via Vercel CLI or dashboard')
    console.log('   Command: vercel env add EDGE_CONFIG')

    console.log('✅ Upload successful!')
    console.log(`   CDN Path: /songs/hotpost.json`)
    console.log(`   Blob URL: ${blob.url}`)
    console.log(`   Size: ${fileStats.size} bytes`)

  } catch (error) {
    console.error('❌ Upload failed:', error)
    process.exit(1)
  }
}

/**
 * Main function
 */
async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be uploaded')
  }

  await uploadHotpost(dryRun)
}

// Run if called directly
if (require.main === module) {
  main()
}

export { uploadHotpost }