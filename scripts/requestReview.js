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
Extract the lyrics for the song from the following YouTube video URL: ${process.env.YT_URL}

Please provide the final output strictly as a single JSON object using the following keys and formatting rules:

"title": The song name and movie/album name.

"tags": A comma-separated string in this format: Song:<song name>, Movie:<movie name>, Singer:<singer 1, singer 2>, music:<music director>, lyrics:<lyricist>.

"tamil": The full lyrics in Tamil script. Use <br> for line breaks and double <br><br> to separate stanzas. Do not include labels like 'Pallavi' or 'Charanam'.

"thanglish": The transliterated Tamil lyrics (Roman script). Use <br> for line breaks and double <br><br> to separate stanzas.

"translation": This section must interleave Thanglish and English. For every stanza:
- Provide the Thanglish lines first followed by a <br>.
- Immediately follow with the English translation wrapped in this specific tag: <p style='text-align: right; border: 1px solid #ddd; padding: 2px;'>[English Translation Here]</p>.
- Separate these combined blocks with a <br>.

SEO Metadata Requirement: Inside the JSON, ensure the metadata is optimized. The title should be the song name. Provide a 2-3 line description for SEO purposes including the artists' names.

Constraint: Output only the JSON. Do not include any conversational prose before or after the JSON code block.
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
    if (!data.title || !data.tamil) {
      throw new Error('AI response missing required fields (title or tamil)');
    }

    console.log('✅ Successfully extracted lyrics');
    console.log(`📌 Title: ${data.title}`);

    // Format the comment body for review
    const commentBody = `### 🎵 PROPOSED_POST

**TITLE:** ${data.title}

**TAGS:** ${data.tags || 'Not specified'}

**TAMIL:**
${data.tamil || 'Not specified'}

**THANGLISH:**
${data.thanglish || 'Not specified'}

**TRANSLATION:**
${data.translation || 'Not specified'}

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
