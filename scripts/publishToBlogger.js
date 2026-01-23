/**
 * Publish approved lyrics to Blogger
 * Usage: node scripts/publishToBlogger.js
 * 
 * Required environment variables:
 * - BLOGGER_API_KEY: API key for Blogger API
 * - BLOG_ID: Blogger blog ID
 * - GITHUB_TOKEN: GitHub token for authentication
 * - ISSUE_NUMBER: GitHub issue number
 * - REPO_OWNER: Repository owner
 * - REPO_NAME: Repository name
 */

const axios = require("axios");
const { Octokit } = require("@octokit/rest");

async function run() {
  try {
    // Validate environment variables
    const requiredEnvVars = ['BLOGGER_API_KEY', 'BLOG_ID', 'GITHUB_TOKEN', 'ISSUE_NUMBER', 'REPO_OWNER', 'REPO_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('🚀 Starting Blogger publishing process...');

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    
    // Get all comments to find the AI's proposed post
    console.log('📥 Fetching issue comments...');
    const comments = await octokit.issues.listComments({
      owner: process.env.REPO_OWNER,
      repo: process.env.REPO_NAME,
      issue_number: parseInt(process.env.ISSUE_NUMBER)
    });

    console.log(`📝 Found ${comments.data.length} comments`);

    // Find the review comment (the one with PROPOSED_POST)
    const reviewComment = comments.data.find(c => c.body.includes("### 🎵 PROPOSED_POST") || c.body.includes("PROPOSED_POST"));
    
    if (!reviewComment) {
      throw new Error('Could not find the proposed post comment. Make sure the extraction step completed successfully.');
    }

    console.log('✅ Found proposed post comment');

    // Parse the comment to extract title, tags, tamil, thanglish, and translation
    const commentBody = reviewComment.body;
    
    // Extract title using a more robust approach
    const titleMatch = commentBody.match(/\*\*TITLE:\*\*\s*(.+?)(?:\n|$)/);
    if (!titleMatch) {
      throw new Error('Could not extract title from comment');
    }
    const title = titleMatch[1].trim();

    // Extract tags
    const tagsSection = commentBody.split('**TAGS:**')[1];
    const tags = tagsSection
      ? tagsSection.split('\n')[0].trim()
      : '';

    // Extract tamil lyrics
    const tamilSection = commentBody.split('**TAMIL:**')[1];
    let tamil = '';
    if (tamilSection) {
      const tamilMatch = tamilSection.split(/\n\*\*THANGLISH:/)[0];
      tamil = tamilMatch.trim();
    }

    // Extract thanglish lyrics
    const thanglishSection = commentBody.split('**THANGLISH:**')[1];
    let thanglish = '';
    if (thanglishSection) {
      const thanglishMatch = thanglishSection.split(/\n\*\*TRANSLATION:/)[0];
      thanglish = thanglishMatch.trim();
    }

    // Extract translation
    const translationSection = commentBody.split('**TRANSLATION:**')[1];
    let translation = '';
    if (translationSection) {
      const translationMatch = translationSection.split(/\n---|\n###|\n\*\*Instructions/)[0];
      translation = translationMatch.trim();
    }

    // Build HTML content for Blogger
    const content = `
<div class="lyrics-container">
  <h2>${title}</h2>
  <div class="tags">${tags}</div>
  
  <h3>Tamil Lyrics</h3>
  <div class="tamil-lyrics">
    ${tamil}
  </div>
  
  <h3>Thanglish Lyrics</h3>
  <div class="thanglish-lyrics">
    ${thanglish}
  </div>
  
  <h3>English Translation</h3>
  <div class="translation">
    ${translation}
  </div>
</div>
`;

    // Parse tags to extract labels for Blogger
    const labels = [];
    if (tags) {
      // Extract individual components from tags
      const tagParts = tags.split(',').map(t => t.trim());
      tagParts.forEach(part => {
        const colonIndex = part.indexOf(':');
        if (colonIndex > -1) {
          const value = part.substring(colonIndex + 1).trim();
          if (value && value !== 'Not specified') {
            // Split multiple values (e.g., "Singer1, Singer2")
            value.split(',').forEach(v => {
              const trimmed = v.trim();
              if (trimmed) {
                labels.push(trimmed);
              }
            });
          }
        }
      });
    }

    console.log('📌 Extracted data:');
    console.log(`   Title: ${title}`);
    console.log(`   Tags: ${tags}`);
    console.log(`   Labels: ${labels.join(', ')}`);
    console.log(`   Tamil length: ${tamil.length} characters`);
    console.log(`   Thanglish length: ${thanglish.length} characters`);
    console.log(`   Translation length: ${translation.length} characters`);

    // Prepare the Blogger post data
    const postData = {
      kind: "blogger#post",
      title: title,
      content: content,
      labels: [...new Set(labels)].filter(l => l) // Deduplicate and filter empty
    };

    console.log('📤 Publishing to Blogger...');
    
    // Post to Blogger API
    const response = await axios.post(
      `https://www.googleapis.com/blogger/v3/blogs/${process.env.BLOG_ID}/posts/`,
      postData,
      {
        params: { 
          key: process.env.BLOGGER_API_KEY 
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Successfully published to Blogger!');
    console.log(`🔗 Post URL: ${response.data.url}`);
    console.log(`📝 Post ID: ${response.data.id}`);

    // Post success comment back to the issue
    const successComment = `### ✅ Published Successfully!

**Post Title:** ${title}

**Blogger URL:** ${response.data.url}

**Post ID:** ${response.data.id}

**Next Steps:**
1. ✅ Post published to Blogger
2. 🔄 Generate song JSON (in progress)
3. ☁️ Upload to blob storage (in progress)

The workflow will now automatically:
- Generate JSON files from the new Blogger post
- Upload the files to Vercel Blob Storage
`;

    await octokit.issues.createComment({
      owner: process.env.REPO_OWNER,
      repo: process.env.REPO_NAME,
      issue_number: parseInt(process.env.ISSUE_NUMBER),
      body: successComment
    });

    // Close the issue as completed
    await octokit.issues.update({
      owner: process.env.REPO_OWNER,
      repo: process.env.REPO_NAME,
      issue_number: parseInt(process.env.ISSUE_NUMBER),
      state: 'closed',
      labels: ['published']
    });

    console.log('✅ Issue updated and closed');
    console.log('\n🎉 Stage 2 Complete! Post is live on Blogger.');

  } catch (error) {
    console.error('❌ Error in publishToBlogger:', error);
    
    // Try to post error to GitHub issue
    if (process.env.GITHUB_TOKEN && process.env.ISSUE_NUMBER) {
      try {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        // Sanitize error message to avoid exposing sensitive API details
        const sanitizedError = error.message.replace(/key|token|secret/gi, '[REDACTED]');
        let errorDetails = `**Error:** ${sanitizedError}\n\n`;
        
        // Only include safe, non-sensitive error information
        if (error.response?.status) {
          errorDetails += `**Status Code:** ${error.response.status}\n`;
        }
        
        await octokit.issues.createComment({
          owner: process.env.REPO_OWNER,
          repo: process.env.REPO_NAME,
          issue_number: parseInt(process.env.ISSUE_NUMBER),
          body: `### ❌ Error Publishing to Blogger\n\n${errorDetails}\nPlease check:\n1. Blogger API key is valid\n2. Blog ID is correct\n3. API has necessary permissions`
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
