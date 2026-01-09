/**
 * Upload song JSON files to Vercel Blob Storage
 * Usage: BLOB_READ_WRITE_TOKEN=xxx ts-node scripts/upload-to-blob.ts [--dry-run]
 */

import { put, list, del } from '@vercel/blob'
import fs = require('fs/promises')
import path = require('path')

const BLOB_DIR = path.join(__dirname, '../blob-data')
const BLOB_PREFIX = 'songs/' // All songs stored under songs/ prefix

interface UploadStats {
  total: number
  uploaded: number
  skipped: number
  failed: number
  totalSize: number
}

/**
 * Check if BLOB_READ_WRITE_TOKEN is set
 */
function checkToken(): boolean {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ Error: BLOB_READ_WRITE_TOKEN environment variable not set')
    console.error('   Get your token from: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk#generate-a-blob-read-write-token')
    console.error('   Usage: BLOB_READ_WRITE_TOKEN=xxx npm run upload-to-blob')
    return false
  }
  return true
}

/**
 * Get list of existing blobs
 */
async function getExistingBlobs(): Promise<Set<string>> {
  try {
    const { blobs } = await list({
      prefix: BLOB_PREFIX,
      token: process.env.BLOB_READ_WRITE_TOKEN!
    })
    
    return new Set(blobs.map(blob => blob.pathname))
  } catch (error) {
    console.warn('⚠️  Could not fetch existing blobs (might be first upload):', error)
    return new Set()
  }
}

/**
 * Upload a single JSON file to blob storage
 */
async function uploadFile(
  filePath: string,
  filename: string,
  dryRun: boolean
): Promise<{ success: boolean; size: number }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const size = Buffer.byteLength(content, 'utf-8')
    const blobPath = `${BLOB_PREFIX}${filename}`
    
    if (dryRun) {
      console.log(`   [DRY RUN] Would upload: ${filename} (${(size / 1024).toFixed(2)} KB)`)
      return { success: true, size }
    }
    
    const blob = await put(blobPath, content, {
      access: 'public',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN!,
      contentType: 'application/json',
    })
    
    console.log(`   ✅ Uploaded: ${filename} (${(size / 1024).toFixed(2)} KB)`)
    console.log(`      URL: ${blob.url}`)
    
    return { success: true, size }
  } catch (error) {
    console.error(`   ❌ Failed: ${filename}`, error)
    return { success: false, size: 0 }
  }
}

/**
 * Main upload function
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')
  
  console.log('🚀 Starting Vercel Blob upload...\n')
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be uploaded\n')
  }
  
  // Check token
  if (!dryRun && !checkToken()) {
    process.exit(1)
  }
  
  // Check if blob-data directory exists
  try {
    await fs.access(BLOB_DIR)
  } catch {
    console.error(`❌ Error: Directory not found: ${BLOB_DIR}`)
    console.error('   Run: npm run generate-song-json first')
    process.exit(1)
  }
  
  // Get list of JSON files to upload
  const files = await fs.readdir(BLOB_DIR)
  const jsonFiles = files.filter(f => f.endsWith('.json'))
  
  if (jsonFiles.length === 0) {
    console.error('❌ Error: No JSON files found in blob-data/')
    console.error('   Run: npm run generate-song-json first')
    process.exit(1)
  }
  
  console.log(`📦 Found ${jsonFiles.length} JSON files to upload\n`)
  
  // Get existing blobs to avoid re-uploading
  let existingBlobs = new Set<string>()
  if (!force && !dryRun) {
    console.log('🔍 Checking existing blobs...')
    existingBlobs = await getExistingBlobs()
    console.log(`   Found ${existingBlobs.size} existing blobs\n`)
  }
  
  // Upload stats
  const stats: UploadStats = {
    total: jsonFiles.length,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    totalSize: 0
  }
  
  // Upload each file
  console.log('📤 Uploading files...\n')
  
  for (let i = 0; i < jsonFiles.length; i++) {
    const filename = jsonFiles[i]
    const filePath = path.join(BLOB_DIR, filename)
    const blobPath = `${BLOB_PREFIX}${filename}`
    
    console.log(`[${i + 1}/${jsonFiles.length}] ${filename}`)
    
    // Skip if already exists (unless --force)
    if (!force && existingBlobs.has(blobPath)) {
      console.log(`   ⏭️  Skipped: Already exists (use --force to overwrite)`)
      stats.skipped++
      continue
    }
    
    const result = await uploadFile(filePath, filename, dryRun)
    
    if (result.success) {
      stats.uploaded++
      stats.totalSize += result.size
    } else {
      stats.failed++
    }
    
    // Small delay to avoid rate limits
    if (!dryRun && i < jsonFiles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  // Print summary
  console.log('\n' + '═'.repeat(60))
  console.log('📊 Upload Summary')
  console.log('═'.repeat(60))
  console.log(`Total files:    ${stats.total}`)
  console.log(`Uploaded:       ${stats.uploaded} ✅`)
  console.log(`Skipped:        ${stats.skipped} ⏭️`)
  console.log(`Failed:         ${stats.failed} ${stats.failed > 0 ? '❌' : ''}`)
  console.log(`Total size:     ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`)
  console.log('═'.repeat(60))
  
  if (dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to actually upload.')
  } else {
    console.log('\n✨ Upload complete!')
    
    // Show next steps
    if (stats.uploaded > 0) {
      console.log('\n📝 Next steps:')
      console.log('1. Go to Vercel dashboard: https://vercel.com/storage')
      console.log('2. Note your blob storage URL')
      console.log('3. Set environment variable in Vercel:')
      console.log('   NEXT_PUBLIC_BLOB_BASE_URL=https://[your-blob-url]/songs')
      console.log('4. Deploy and test!')
    }
  }
  
  process.exit(stats.failed > 0 ? 1 : 0)
}

// Run main function
main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
