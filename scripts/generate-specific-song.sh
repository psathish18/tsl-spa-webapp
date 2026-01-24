#!/bin/bash
# Helper script to generate JSON for a specific song category
# Usage: ./scripts/generate-specific-song.sh "Song:Yetho Yetho - Gandhi Talks"

if [ -z "$1" ]; then
  echo "❌ Error: Song category is required"
  echo ""
  echo "Usage: ./scripts/generate-specific-song.sh \"Song:Song Name - Movie Name\""
  echo ""
  echo "Example:"
  echo "  ./scripts/generate-specific-song.sh \"Song:Yetho Yetho - Gandhi Talks\""
  echo ""
  exit 1
fi

CATEGORY="$1"

echo "🎵 Generating JSON for category: $CATEGORY"
echo ""

# Run the generation script
npm run generate-song-json -- --category="$CATEGORY"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ JSON generation complete!"
  echo ""
  echo "📁 Check the blob-data/ directory for the generated file"
  echo ""
  echo "Next steps:"
  echo "  1. Verify the generated file: ls -lh blob-data/*.json | tail -5"
  echo "  2. Upload to Vercel Blob: npm run upload-to-blob"
  echo "  3. Commit and push: git add blob-data/ && git commit -m \"Add JSON for $CATEGORY\" && git push"
else
  echo ""
  echo "❌ JSON generation failed!"
  echo ""
  echo "Please check:"
  echo "  - Internet connection is available"
  echo "  - The song exists in Blogger with category: $CATEGORY"
  echo "  - Dependencies are installed: npm install"
fi
