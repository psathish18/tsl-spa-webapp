/**
 * Manual test script for SEO utilities
 * Run with: npx ts-node test-seo-utils.ts
 */

import {
  extractSnippet,
  cleanCategoryLabel,
  getMeaningfulLabels,
  generateSongDescription,
  generateCategoryDescription,
  formatSEOTitle
} from './lib/seoUtils'

console.log('=== Testing SEO Utilities ===\n')

// Test 1: extractSnippet
console.log('1. Testing extractSnippet:')
const htmlContent = `<p>Kalangathe kanne enbayae<br/>en uyirin aadhi<br/><br/>indreno maunam kondaye<br/>en peyarin paadhi</p><p>More lyrics here with a long paragraph that should be truncated at some point because it exceeds the maximum length allowed for meta descriptions which is typically around 155 characters...</p>`
const snippet = extractSnippet(htmlContent, 155)
console.log('  Input HTML length:', htmlContent.length)
console.log('  Extracted snippet:', snippet)
console.log('  Snippet length:', snippet.length)
console.log('  ✓ Should be ~155 chars or less\n')

// Test 2: cleanCategoryLabel
console.log('2. Testing cleanCategoryLabel:')
const testLabels = [
  'Movie:Coolie',
  'Singer:Anirudh',
  'Song:Monica - Coolie',
  'Lyrics:Heisenberg',
  'Music:Devi Sri Prasad',
  'AlreadyClean'
]
testLabels.forEach(label => {
  console.log(`  "${label}" -> "${cleanCategoryLabel(label)}"`)
})
console.log('')

// Test 3: getMeaningfulLabels
console.log('3. Testing getMeaningfulLabels:')
const categories = [
  { term: 'Movie:Coolie' },
  { term: 'Singer:Anirudh' },
  { term: 'Lyrics:Heisenberg' },
  { term: 'Music:Anirudh Ravichander' },
  { term: 'Song:Monica' }
]
const labels = getMeaningfulLabels(categories)
console.log('  Input categories:', categories.map(c => c.term).join(', '))
console.log('  Extracted labels:', labels)
console.log('  ✓ Should extract movie, singer, lyricist, music\n')

// Test 4: generateSongDescription
console.log('4. Testing generateSongDescription:')
const testCases = [
  {
    title: 'Monica Song Lyrics',
    snippet: 'Kalangathe kanne enbayae en uyirin aadhi',
    movie: 'Coolie',
    singer: 'Anirudh'
  },
  {
    title: 'Uyirnaadi Nanbane Lyrics',
    snippet: 'Uyirnaadi nanbane en anbane',
    movie: 'Coolie',
    singer: 'Sai Smriti',
    lyricist: 'Heisenberg'
  },
  {
    title: 'Standalone Song Lyrics',
    snippet: 'This is a standalone song without movie',
    singer: 'Independent Artist'
  }
]

testCases.forEach((testCase, idx) => {
  const desc = generateSongDescription(testCase)
  console.log(`  Test ${idx + 1}:`)
  console.log(`    Title: ${testCase.title}`)
  console.log(`    Description: ${desc}`)
  console.log(`    Length: ${desc.length} chars`)
})
console.log('')

// Test 5: generateCategoryDescription
console.log('5. Testing generateCategoryDescription:')
const categoryTests = [
  { term: 'Movie:Coolie', count: 10 },
  { term: 'Singer:Anirudh', count: 25 },
  { term: 'Lyrics:Vairamuthu', count: 15 },
  { term: 'Music:A.R. Rahman', count: 50 },
  { term: 'OtherCategory:Test', count: 5 }
]

categoryTests.forEach(test => {
  const desc = generateCategoryDescription(test.term)
  console.log(`  ${test.term} (${test.count} songs):`)
  console.log(`    ${desc}`)
  console.log(`    Length: ${desc.length} chars`)
})
console.log('')

// Test 6: formatSEOTitle
console.log('6. Testing formatSEOTitle:')
const titleTests = [
  'Monica Song',
  'Uyirnaadi Nanbane Lyrics',
  'Song Title With Lyrics Already',
  ''
]

titleTests.forEach(title => {
  console.log(`  "${title}" -> "${formatSEOTitle(title)}"`)
})
console.log('')

console.log('=== All Tests Completed ===')
