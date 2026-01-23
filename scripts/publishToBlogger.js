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

    // Parse the comment to extract title, content, categories, and labels
    const commentBody = reviewComment.body;
    
    // Extract title
    const titleMatch = commentBody.match(/\*\*TITLE:\*\*\s*(.+?)(?:\n|$)/);
    if (!titleMatch) {
      throw new Error('Could not extract title from comment');
    }
    const title = titleMatch[1].trim();

    // Extract categories
    const categoriesMatch = commentBody.match(/\*\*CATEGORIES:\*\*\s*(.+?)(?:\n|$)/);
    const categories = categoriesMatch 
      ? categoriesMatch[1].split(',').map(c => c.trim()).filter(c => c && c !== 'Not specified')
      : [];

    // Extract labels
    const labelsMatch = commentBody.match(/\*\*LABELS:\*\*\s*(.+?)(?:\n|$)/);
    const labels = labelsMatch 
      ? labelsMatch[1].split(',').map(l => l.trim()).filter(l => l && l !== 'Not specified')
      : [];

    // Extract content (everything after "**CONTENT:**" until "---")
    const contentMatch = commentBody.match(/\*\*CONTENT:\*\*\s*\n([\s\S]+?)(?:\n---|\n###|\n\*\*Instructions|$)/);
    if (!contentMatch) {
      throw new Error('Could not extract content from comment');
    }
    const content = contentMatch[1].trim();

    console.log('📌 Extracted data:');
    console.log(`   Title: ${title}`);
    console.log(`   Categories: ${categories.join(', ')}`);
    console.log(`   Labels: ${labels.join(', ')}`);
    console.log(`   Content length: ${content.length} characters`);

    // Prepare the Blogger post data
    const postData = {
      kind: "blogger#post",
      title: title,
      content: content,
      labels: [...new Set([...categories, ...labels])].filter(l => l) // Combine and deduplicate
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
        await octokit.issues.createComment({
          owner: process.env.REPO_OWNER,
          repo: process.env.REPO_NAME,
          issue_number: parseInt(process.env.ISSUE_NUMBER),
          body: `### ❌ Error Publishing to Blogger\n\n**Error:** ${error.message}\n\n${error.response?.data ? `**API Response:** \`\`\`json\n${JSON.stringify(error.response.data, null, 2)}\n\`\`\`` : ''}\n\nPlease check:\n1. Blogger API key is valid\n2. Blog ID is correct\n3. API has necessary permissions`
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
