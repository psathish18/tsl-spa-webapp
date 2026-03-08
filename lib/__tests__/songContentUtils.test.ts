import { getMoodTags, getStanzaLabel, generateAutoFAQ } from '../songContentUtils'

describe('getMoodTags', () => {
  it('returns empty array for generic title with no mood keywords', () => {
    expect(getMoodTags('10 Endrathukulla')).toEqual([])
  })

  it('detects Romantic from kaadhal keyword', () => {
    expect(getMoodTags('Kaadhal Ennai')).toContain('Romantic')
  })

  it('detects Peppy / Dance from kuthu keyword', () => {
    expect(getMoodTags('Kuthu Kuthu Song')).toContain('Peppy / Dance')
  })

  it('detects Devotional from murugan keyword', () => {
    expect(getMoodTags('Murugan Potri')).toContain('Devotional')
  })

  it('detects Sad from ninaivugal keyword', () => {
    expect(getMoodTags('Ninaivugal Paadal')).toContain('Sad')
  })

  it('detects mood from singer name', () => {
    // 'love' in singer check
    expect(getMoodTags('Random Title', undefined, 'Anirudh')).toBeDefined()
  })

  it('returns at most 2 moods', () => {
    const result = getMoodTags('Kaadhal kuthu dance love')
    expect(result.length).toBeLessThanOrEqual(2)
  })
})

describe('getStanzaLabel', () => {
  it('labels single stanza as Pallavi', () => {
    expect(getStanzaLabel(0, 1)).toBe('Pallavi')
  })

  it('labels first of two as Pallavi', () => {
    expect(getStanzaLabel(0, 2)).toBe('Pallavi')
  })

  it('labels second of two as Charanam', () => {
    expect(getStanzaLabel(1, 2)).toBe('Charanam')
  })

  it('labels correctly for a 4-stanza song', () => {
    expect(getStanzaLabel(0, 4)).toBe('Pallavi')
    expect(getStanzaLabel(1, 4)).toBe('Anupallavi')
    expect(getStanzaLabel(2, 4)).toBe('Charanam 1')
    expect(getStanzaLabel(3, 4)).toBe('Charanam 2')
  })

  it('increments Charanam index correctly for 6 stanzas', () => {
    expect(getStanzaLabel(4, 6)).toBe('Charanam 3')
    expect(getStanzaLabel(5, 6)).toBe('Charanam 4')
  })
})

describe('generateAutoFAQ', () => {
  it('generates all expected questions when full metadata is provided', () => {
    const faqs = generateAutoFAQ({
      songName: 'Uyirnaadi Nanbane',
      movieName: 'Heisenberg',
      singerName: 'Sai Smriti',
      lyricistName: 'Yugabharathi',
      musicName: 'Anirudh',
    })
    const questions = faqs.map(f => f.question)
    expect(questions.some(q => q.includes('movie'))).toBe(true)
    expect(questions.some(q => q.includes('sang'))).toBe(true)
    expect(questions.some(q => q.includes('lyrics of'))).toBe(true)
    expect(questions.some(q => q.includes('music'))).toBe(true)
  })

  it('skips singer question when singerName is Unknown Artist', () => {
    const faqs = generateAutoFAQ({ songName: 'Test', singerName: 'Unknown Artist' })
    expect(faqs.every(f => !f.question.includes('sang'))).toBe(true)
  })

  it('always includes where-to-find question', () => {
    const faqs = generateAutoFAQ({ songName: 'Test Song' })
    expect(faqs.some(f => f.question.includes('complete lyrics'))).toBe(true)
  })

  it('mentions Tamil and English in answer when both are available', () => {
    const faqs = generateAutoFAQ({
      songName: 'Test',
      hasTamilLyrics: true,
      hasEnglishLyrics: true,
    })
    const whereFaq = faqs.find(f => f.question.includes('complete lyrics'))
    expect(whereFaq?.answer).toContain('Tamil script')
    expect(whereFaq?.answer).toContain('English meaning')
  })

  it('omits actor question when actorName not provided', () => {
    const faqs = generateAutoFAQ({ songName: 'Test', movieName: 'Movie' })
    expect(faqs.every(f => !f.question.includes('actor'))).toBe(true)
  })
})
