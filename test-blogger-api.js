// Test script to verify Blogger API integration
const testBloggerAPI = async () => {
  try {
    console.log('Testing direct Blogger API...')
    
    // First try without label filter to see all posts
    const urlAll = 'https://tsonglyricsapp.blogspot.com/feeds/posts/default?alt=json'
    console.log('Fetching all posts...')
    
    const responseAll = await fetch(urlAll)
    console.log('All posts response status:', responseAll.status)
    
    if (responseAll.ok) {
      const dataAll = await responseAll.json()
      console.log('Feed title:', dataAll.feed?.title?.$t)
      console.log('Total number of entries:', dataAll.feed?.entry?.length || 0)
      
      if (dataAll.feed?.entry?.length > 0) {
        console.log('First post title:', dataAll.feed.entry[0].title?.$t)
        console.log('First post categories:', dataAll.feed.entry[0].category?.map(c => c.term))
        
        // Check all categories to see what labels exist
        const allCategories = new Set()
        dataAll.feed.entry.forEach(entry => {
          entry.category?.forEach(cat => {
            allCategories.add(cat.term)
          })
        })
        console.log('All available categories:', Array.from(allCategories))
      }
    }
    
    // Now try with the original label filter
    console.log('\nTesting with label filter...')
    const url = 'https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/~/?alt=json'
    const response = await fetch(url)
    
    console.log('Filtered response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('Filtered entries:', data.feed?.entry?.length || 0)
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testBloggerAPI()
