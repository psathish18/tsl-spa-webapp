/**
 * Extract lyrics from YouTube video using Gemini AI and post for review
 * Usage: node scripts/requestReview.js
 * 
 * Required environment variables:
 * - GEMINI_API_KEY: API key for Google Gemini
 * - YT_URL: YouTube video URL
 * - GITHUB_TOKEN: GitHub token for authentication
 * - ISSUE_NUMBER: GitHub issue number
 * - REPO_OWNER: Repository owner
 * - REPO_NAME: Repository name
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Octokit } = require("@octokit/rest");

async function run() {
  try {
    // Validate environment variables
    const requiredEnvVars = ['GEMINI_API_KEY', 'YT_URL', 'GITHUB_TOKEN', 'ISSUE_NUMBER', 'REPO_OWNER', 'REPO_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('🚀 Starting lyrics extraction...');
    console.log(`📺 YouTube URL: ${process.env.YT_URL}`);

    // Initialize AI and GitHub clients
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Create prompt for lyrics extraction
    const prompt = `
Extract the song lyrics from the following YouTube video URL: ${process.env.YT_URL}

Please analyze the video and extract:
1. Song title (in Tamil if available)
2. Movie/Album name
3. Singer(s) name
4. Music Director name
5. Lyricist name
6. Complete lyrics in Tamil (with proper formatting using <br/> tags for line breaks)

Output ONLY a valid JSON object (no markdown formatting, no code blocks) with this structure:
{
  "title": "Song Title - Movie Name",
  "content": "<h3>Song Title</h3><p><strong>Movie:</strong> Movie Name<br/><strong>Singer:</strong> Singer Name<br/><strong>Music:</strong> Music Director<br/><strong>Lyrics:</strong> Lyricist</p><p>[Tamil lyrics with <br/> tags for line breaks]</p>",
  "labels": ["Song Title", "Movie Name", "Singer Name", "Music Director"],
  "categories": ["Movie Name", "Singer Name", "Music Director", "Lyricist"]
}

Important:
- Use proper Tamil text encoding
- Format lyrics with <br/> tags for line breaks and <br/><br/> for stanza breaks
- Include all metadata in the content HTML
- Make sure the JSON is valid and parseable
- Do not include any markdown code blocks or formatting - just pure JSON
`;

    console.log('🤖 Calling Gemini AI to extract lyrics...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log('📝 Raw AI response:', responseText.substring(0, 200) + '...');

    // Parse the JSON response, removing any markdown code blocks if present
    let data;
    try {
      // More precise regex to only match code blocks at start and end
      const cleanedResponse = responseText
        .replace(/^```json\s*/m, '')  // Remove starting code block
        .replace(/\s*```$/m, '')      // Remove ending code block
        .trim();
      data = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON');
      console.error('Response text:', responseText);
      throw new Error(`JSON parse error: ${parseError.message}`);
    }

    // Validate the response structure
    if (!data.title || !data.content) {
      throw new Error('AI response missing required fields (title or content)');
    }

    console.log('✅ Successfully extracted lyrics');
    console.log(`📌 Title: ${data.title}`);

    // Format the comment body for review
    const commentBody = `### 🎵 PROPOSED_POST

**TITLE:** ${data.title}

**CATEGORIES:** ${data.categories ? data.categories.join(', ') : 'Not specified'}

**LABELS:** ${data.labels ? data.labels.join(', ') : 'Not specified'}

**CONTENT:**
${data.content}

---
**Instructions:**
1. Click "Edit" on this comment to review and fix any errors
2. Save your changes
3. Reply with \`/approve\` to publish to Blogger

⚠️ Note: The content above will be posted exactly as written after approval.
`;

    // Post the result as a comment so it can be edited on mobile
    console.log('📤 Posting to GitHub issue for review...');
    const comment = await octokit.issues.createComment({
      owner: process.env.REPO_OWNER,
      repo: process.env.REPO_NAME,
      issue_number: parseInt(process.env.ISSUE_NUMBER),
      body: commentBody
    });

    console.log('✅ Posted comment for review');
    console.log(`🔗 Comment URL: ${comment.data.html_url}`);
    console.log('\n✅ Stage 1 Complete! Review the lyrics and comment /approve to publish.');

  } catch (error) {
    console.error('❌ Error in requestReview:', error);
    console.error('Error details:', error.message);
    
    // Try to post error to GitHub issue if possible
    if (process.env.GITHUB_TOKEN && process.env.ISSUE_NUMBER) {
      try {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        // Sanitize error message to avoid exposing sensitive information
        const sanitizedError = error.message.replace(/key|token|secret/gi, '[REDACTED]');
        await octokit.issues.createComment({
          owner: process.env.REPO_OWNER,
          repo: process.env.REPO_NAME,
          issue_number: parseInt(process.env.ISSUE_NUMBER),
          body: `### ❌ Error Extracting Lyrics\n\nFailed to extract lyrics from the video.\n\n**Error:** ${sanitizedError}\n\nPlease check:\n1. The YouTube URL is valid and accessible\n2. The video contains Tamil song lyrics\n3. API keys are configured correctly`
        });
      } catch (commentError) {
        console.error('Failed to post error comment:', commentError);
      }
    }
    
    process.exit(1);
  }
}

// Run the script
run();
