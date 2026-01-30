/**
 * Test suite for lyrics utilities
 * Tests content section parsing and sanitization
 */

import {
  parseContentSections,
  splitAndSanitizeSections,
  stripImagesFromHtml,
  htmlToPlainText,
  formatSnippetWithStars,
  buildHashtags,
  getSongCategory,
  DEFAULT_SANITIZE_OPTIONS
} from '../lyricsUtils';
import sanitizeHtml from 'sanitize-html';

describe('lyricsUtils', () => {
  describe('parseContentSections', () => {
    it('should parse all sections correctly', () => {
      const content = `<p>Immerse yourself in the vintage romance of <strong>Panimalare</strong>, the standout melody from the period drama <em>Kaantha</em>.</p>

<div class="easter-egg-list">
        <h3>5 Hidden Details You Missed! 🕵️‍♂️</h3>
        <ul>
            <li>Detail 1: The musical arrangement features live cello.</li>
<li>Detail 2: This song marks the first major collaboration.</li>
        </ul>
    </div>

Hey Panimalare ilam kulire suduvadhu theeya neeya<br>Hey valarpiraye pudhu mazhaye thoduvadhu neeya theeya<br><br>Yaarodum kooraadha inbangal nee thandhaai<br>Kaadhoram kelaadha mounathil neeye nindraai

<div class="faqs-section">
        <h3>Frequently Asked Questions</h3>
        <div class="faq-item">
        <h4>Who are the singers of Panimalare?</h4>
        <p>The song is sung by the popular playback singers Pradeep Kumar and Priyanka NK.</p>
      </div>
    </div>`;

      const sections = parseContentSections(content);

      expect(sections.intro).toContain('Immerse yourself in the vintage romance');
      expect(sections.intro).toContain('<strong>Panimalare</strong>');
      expect(sections.easterEgg).toContain('5 Hidden Details You Missed!');
      expect(sections.easterEgg).toContain('<li>Detail 1:');
      expect(sections.lyrics).toContain('Hey Panimalare ilam kulire');
      expect(sections.lyrics).toContain('Yaarodum kooraadha');
      expect(sections.faq).toContain('Frequently Asked Questions');
      expect(sections.faq).toContain('Who are the singers');
    });

    it('should handle content with only lyrics (no intro/easter-egg/faq)', () => {
      const content = `Hey Panimalare ilam kulire<br>Hey valarpiraye pudhu mazhaye<br><br>Yaarodum kooraadha inbangal`;

      const sections = parseContentSections(content);

      expect(sections.intro).toBe('');
      expect(sections.easterEgg).toBe('');
      expect(sections.lyrics).toBe(content);
      expect(sections.faq).toBe('');
    });

    it('should handle content with intro but no other sections', () => {
      const content = `<p>This is the intro paragraph.</p>

Hey Panimalare ilam kulire<br>Hey valarpiraye pudhu mazhaye`;

      const sections = parseContentSections(content);

      expect(sections.intro).toBe('<p>This is the intro paragraph.</p>');
      expect(sections.easterEgg).toBe('');
      expect(sections.lyrics).toContain('Hey Panimalare');
      expect(sections.faq).toBe('');
    });

    it('should handle content with FAQ but no intro/easter-egg', () => {
      const content = `Hey Panimalare ilam kulire<br>Hey valarpiraye pudhu mazhaye<br><br>Yaarodum kooraadha

<div class="faqs-section">
        <h3>FAQ</h3>
        <p>Answer here</p>
    </div>`;

      const sections = parseContentSections(content);

      expect(sections.intro).toBe('');
      expect(sections.easterEgg).toBe('');
      expect(sections.lyrics).toContain('Hey Panimalare');
      expect(sections.faq).toContain('FAQ');
    });

    it('should handle empty content', () => {
      const sections = parseContentSections('');

      expect(sections.intro).toBe('');
      expect(sections.easterEgg).toBe('');
      expect(sections.lyrics).toBe('');
      expect(sections.faq).toBe('');
    });
  });

  describe('splitAndSanitizeSections', () => {
    it('should sanitize all sections', () => {
      const content = `<p>Intro with <script>alert("xss")</script> text</p>

<div class="easter-egg-list">
        <h3>Easter Egg</h3>
        <ul><li>Item 1</li></ul>
    </div>

Lyrics content<br>More lyrics

<div class="faqs-section">
        <h3>FAQ</h3>
        <p>Answer</p>
    </div>`;

      const sections = splitAndSanitizeSections(content, sanitizeHtml);

      expect(sections.intro).toContain('Intro with');
      expect(sections.intro).not.toContain('<script>');
      expect(sections.easterEgg).toContain('Easter Egg');
      expect(sections.lyrics).toContain('Lyrics content');
      expect(sections.faq).toContain('FAQ');
    });

    it('should allow specified HTML tags', () => {
      const content = `<p>Intro with <strong>bold</strong> and <em>italic</em></p>

<div class="easter-egg-list">
        <h3>Title</h3>
        <ul><li>List item</li></ul>
    </div>

Lyrics<br>Content

<div class="faqs-section">
        <h4>Question</h4>
        <p>Answer</p>
    </div>`;

      const sections = splitAndSanitizeSections(content, sanitizeHtml);

      expect(sections.intro).toContain('<strong>bold</strong>');
      expect(sections.intro).toContain('<em>italic</em>');
      expect(sections.easterEgg).toContain('<h3>Title</h3>');
      expect(sections.easterEgg).toContain('<li>List item</li>');
      expect(sections.faq).toContain('<h4>Question</h4>');
    });
  });

  describe('stripImagesFromHtml', () => {
    it('should remove img tags', () => {
      const html = '<p>Text before</p><img src="image.jpg" alt="test"/><p>Text after</p>';
      const result = stripImagesFromHtml(html);
      expect(result).toBe('<p>Text before</p><p>Text after</p>');
    });

    it('should handle empty string', () => {
      expect(stripImagesFromHtml('')).toBe('');
    });
  });

  describe('htmlToPlainText', () => {
    it('should convert HTML to plain text', () => {
      const html = 'Line 1<br>Line 2<br><br>Line 3';
      const result = htmlToPlainText(html);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should remove HTML tags', () => {
      const html = '<strong>Bold</strong> and <em>italic</em>';
      const result = htmlToPlainText(html);
      expect(result).toBe('Bold and italic');
    });
  });

  describe('formatSnippetWithStars', () => {
    it('should add stars around text', () => {
      const result = formatSnippetWithStars('Test text');
      expect(result).toBe('⭐Test text⭐');
    });
  });

  describe('buildHashtags', () => {
    it('should build hashtags from categories', () => {
      const categories = [
        { term: 'Song:TestSong' },
        { term: 'Movie:TestMovie' },
        { term: 'Singer:TestSinger' }
      ];
      const result = buildHashtags(categories);
      expect(result).toContain('#TestMovie');
      expect(result).toContain('#TestSinger');
      expect(result).not.toContain('#TestSong'); // Song: categories are filtered out
    });

    it('should handle undefined categories', () => {
      const result = buildHashtags(undefined);
      expect(result).toBe('');
    });
  });

  describe('getSongCategory', () => {
    it('should find Song: category', () => {
      const categories = [
        { term: 'Movie:TestMovie' },
        { term: 'Song:TestSong' },
        { term: 'Singer:TestSinger' }
      ];
      const result = getSongCategory(categories);
      expect(result).toBe('Song:TestSong');
    });

    it('should return empty string if no Song: category', () => {
      const categories = [
        { term: 'Movie:TestMovie' },
        { term: 'Singer:TestSinger' }
      ];
      const result = getSongCategory(categories);
      expect(result).toBe('');
    });
  });
});
