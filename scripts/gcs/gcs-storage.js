// scripts/gcs-storage.js
// Google Cloud Storage utility for uploading OG images

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

/**
 * Configuration from environment variables
 * 
 * Required Environment Variables:
 * - GCS_BUCKET_NAME: Name of your GCS bucket (e.g., 'tsonglyrics-og-images')
 * - GCS_PROJECT_ID: Your Google Cloud project ID
 * - GCS_SERVICE_ACCOUNT_KEY: Base64 encoded service account JSON key
 *   OR
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON file (for local dev)
 */

class GCSStorage {
  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME;
    this.projectId = process.env.GCS_PROJECT_ID;
    
    if (!this.bucketName) {
      throw new Error('GCS_BUCKET_NAME environment variable is required');
    }

    if (!this.projectId) {
      throw new Error('GCS_PROJECT_ID environment variable is required');
    }

    // Initialize Storage client
    this.storage = this.initializeStorage();
    this.bucket = this.storage.bucket(this.bucketName);
  }

  /**
   * Initialize Google Cloud Storage client
   * Supports both base64-encoded credentials (CI/GitHub Actions) and file path (local)
   */
  initializeStorage() {
    // Option 1: Use base64-encoded service account key (for CI/GitHub Actions)
    if (process.env.GCS_SERVICE_ACCOUNT_KEY) {
      try {
        const credentials = JSON.parse(
          Buffer.from(process.env.GCS_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8')
        );
        
        return new Storage({
          projectId: this.projectId,
          credentials: credentials
        });
      } catch (error) {
        throw new Error(`Failed to parse GCS_SERVICE_ACCOUNT_KEY: ${error.message}`);
      }
    }
    
    // Option 2: Use GOOGLE_APPLICATION_CREDENTIALS path (for local development)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        throw new Error(`Service account file not found: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
      }
      
      return new Storage({
        projectId: this.projectId,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
    }

    // Option 3: Default credentials (for Cloud Run, App Engine, etc.)
    return new Storage({
      projectId: this.projectId
    });
  }

  /**
   * Check if GCS is properly configured
   */
  static isConfigured() {
    return !!(
      process.env.GCS_BUCKET_NAME && 
      process.env.GCS_PROJECT_ID &&
      (process.env.GCS_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS)
    );
  }

  /**
   * Upload buffer or file to GCS
   * @param {Buffer} buffer - File buffer to upload
   * @param {string} filename - Target filename (e.g., 'abc123.png')
   * @param {Object} options - Upload options
   * @returns {Promise<string>} Public URL of uploaded file
   */
  async uploadFile(buffer, filename, options = {}) {
    const {
      contentType = 'image/png',
      folder = 'og-images',
      makePublic = true,
      cacheControl = 'public, max-age=31536000' // 1 year cache
    } = options;

    // Construct file path in bucket
    const filePath = folder ? `${folder}/${filename}` : filename;
    const file = this.bucket.file(filePath);

    try {
      // Upload buffer to GCS
      await file.save(buffer, {
        contentType: contentType,
        metadata: {
          cacheControl: cacheControl,
        },
        resumable: false, // Faster for small files
      });

      console.log(`  ✅ Uploaded to GCS: ${filePath}`);

      // Make file public if requested
      // Note: If bucket has uniform bucket-level access enabled,
      // or if service account lacks IAM permissions, files are still accessible
      // via the public URL if bucket is configured for public access
      if (makePublic) {
        try {
          await file.makePublic();
          console.log(`  🌐 Made public: ${filePath}`);
        } catch (publicError) {
          // Gracefully handle permission errors - file might already be public
          // via bucket-level settings (uniform bucket-level access)
          if (publicError.message.includes('does not have storage.objects')) {
            console.log(`  ℹ️  Skipping makePublic (using bucket-level access): ${filePath}`);
          } else {
            console.warn(`  ⚠️  Could not make file public: ${publicError.message}`);
          }
        }
      }

      // Return public URL
      // This will work if:
      // 1. File was made public successfully, OR
      // 2. Bucket has uniform bucket-level access with public read, OR
      // 3. Bucket has fine-grained ACLs with allUsers read permission
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
      return publicUrl;
    } catch (error) {
      console.error(`  ❌ Failed to upload ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Upload local file to GCS
   * @param {string} localPath - Local file path
   * @param {string} filename - Target filename in GCS
   * @param {Object} options - Upload options
   * @returns {Promise<string>} Public URL
   */
  async uploadLocalFile(localPath, filename, options = {}) {
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local file not found: ${localPath}`);
    }

    const buffer = fs.readFileSync(localPath);
    return this.uploadFile(buffer, filename, options);
  }

  /**
   * Check if file exists in GCS
   * @param {string} filename - Filename to check
   * @param {string} folder - Folder path
   * @returns {Promise<boolean>}
   */
  async fileExists(filename, folder = 'og-images') {
    const filePath = folder ? `${folder}/${filename}` : filename;
    const file = this.bucket.file(filePath);
    
    try {
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      console.error(`Error checking file existence: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete file from GCS
   * @param {string} filename - Filename to delete
   * @param {string} folder - Folder path
   */
  async deleteFile(filename, folder = 'og-images') {
    const filePath = folder ? `${folder}/${filename}` : filename;
    const file = this.bucket.file(filePath);
    
    try {
      await file.delete();
      console.log(`  🗑️  Deleted from GCS: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`Error deleting file: ${error.message}`);
      return false;
    }
  }

  /**
   * Get public URL for a file (without uploading)
   * @param {string} filename - Filename
   * @param {string} folder - Folder path
   * @returns {string} Public URL
   */
  getPublicUrl(filename, folder = 'og-images') {
    const filePath = folder ? `${folder}/${filename}` : filename;
    return `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
  }

  /**
   * List files in bucket folder
   * @param {string} folder - Folder to list
   * @param {number} maxResults - Max results to return
   * @returns {Promise<Array>} List of filenames
   */
  async listFiles(folder = 'og-images', maxResults = 1000) {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: folder,
        maxResults: maxResults
      });
      
      return files.map(file => file.name);
    } catch (error) {
      console.error(`Error listing files: ${error.message}`);
      return [];
    }
  }
}

module.exports = GCSStorage;
