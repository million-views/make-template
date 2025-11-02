/**
 * Unit Tests for PlaceholderFinder
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PlaceholderFinder } from '../../src/lib/analyzers/placeholder-finder.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('PlaceholderFinder', () => {
  let finder;
  let tempDir;

  it('should instantiate PlaceholderFinder', () => {
    finder = new PlaceholderFinder();
    assert.ok(finder, 'PlaceholderFinder should be instantiated');
  });

  describe('JSX Content Extraction', () => {
    it('should extract text content from JSX', async () => {
      const jsxContent = `
        <div>
          <h1>Company Name</h1>
          <p>This is a tagline</p>
          <blockquote>"This is a quote"</blockquote>
        </div>
      `;

      finder = new PlaceholderFinder();
      const placeholders = [];
      await finder.extractTextContent(jsxContent, 'test.jsx', placeholders, '{{NAME}}');

      assert.ok(placeholders.length > 0, 'Should extract text placeholders');
      const companyPlaceholder = placeholders.find(p => p.name === 'COMPANY_NAME');
      assert.ok(companyPlaceholder, 'Should identify company name');
      assert.strictEqual(companyPlaceholder.value, 'Company Name');
      assert.strictEqual(companyPlaceholder.category, 'text');
      assert.match(companyPlaceholder.location, /line \d+, column \d+/);
    });

    it('should extract image sources', async () => {
      const jsxContent = `
        <img src="https://example.com/logo.png" alt="Logo" />
        <img src="/images/banner.jpg" />
      `;

      finder = new PlaceholderFinder();
      const placeholders = [];
      await finder.extractImageSources(jsxContent, 'test.jsx', placeholders, '{{NAME}}');

      assert.strictEqual(placeholders.length, 2, 'Should extract 2 image sources');
      const logoPlaceholder = placeholders.find(p => p.name === 'LOGO_URL');
      assert.ok(logoPlaceholder, 'Should identify logo URL');
      assert.strictEqual(logoPlaceholder.value, 'https://example.com/logo.png');
      assert.strictEqual(logoPlaceholder.category, 'image');
    });

    it('should extract link URLs', async () => {
      const jsxContent = `
        <a href="https://example.com">Link</a>
        <a href="/about">About</a>
      `;

      finder = new PlaceholderFinder();
      const placeholders = [];
      await finder.extractLinkUrls(jsxContent, 'test.jsx', placeholders, '{{NAME}}');

      assert.strictEqual(placeholders.length, 2, 'Should extract 2 link URLs');
      assert.ok(placeholders.some(p => p.value === 'https://example.com'), 'Should extract first link');
      assert.ok(placeholders.some(p => p.value === '/about'), 'Should extract second link');
      assert.strictEqual(placeholders[0].category, 'link');
    });

    it('should extract alt text', async () => {
      const jsxContent = `
        <img src="logo.png" alt="Company Logo" />
        <img src="icon.png" alt="Icon" />
      `;

      finder = new PlaceholderFinder();
      const placeholders = [];
      await finder.extractAltText(jsxContent, 'test.jsx', placeholders, '{{NAME}}');

      assert.strictEqual(placeholders.length, 2, 'Should extract 2 alt texts');
      assert.ok(placeholders.some(p => p.value === 'Company Logo'), 'Should extract first alt');
      assert.ok(placeholders.some(p => p.value === 'Icon'), 'Should extract second alt');
      assert.strictEqual(placeholders[0].category, 'alt');
    });

    it('should exclude dynamic content in text extraction', async () => {
      const jsxContent = `
        <h1>{dynamicTitle}</h1>
        <p>Static text</p>
      `;

      finder = new PlaceholderFinder();
      const placeholders = [];
      await finder.extractTextContent(jsxContent, 'test.jsx', placeholders, '{{NAME}}');

      // Should only extract "Static text", not the dynamic one
      assert.strictEqual(placeholders.length, 1, 'Should exclude dynamic content');
      assert.strictEqual(placeholders[0].value, 'Static text');
    });

    it('should exclude short or whitespace-only text', async () => {
      const jsxContent = `
        <span>Hi</span>
        <div>   </div>
        <p>Good content</p>
      `;

      finder = new PlaceholderFinder();
      const placeholders = [];
      await finder.extractTextContent(jsxContent, 'test.jsx', placeholders, '{{NAME}}');

      assert.strictEqual(placeholders.length, 1, 'Should exclude short/whitespace text');
      assert.strictEqual(placeholders[0].value, 'Good content');
    });
  });

  describe('Placeholder Name Generation', () => {
    it('should generate appropriate names for text content', () => {
      finder = new PlaceholderFinder();

      assert.strictEqual(finder.generateTextPlaceholderName('ABC Corp Inc', 0), 'COMPANY_NAME');
      assert.strictEqual(finder.generateTextPlaceholderName('Short tagline', 0), 'TAGLINE');
      assert.strictEqual(finder.generateTextPlaceholderName('"A great quote"', 0), 'QUOTE_0');
      assert.strictEqual(finder.generateTextPlaceholderName('This is some longer content that should not be short', 1), 'TEXT_CONTENT_1');
    });

    it('should generate appropriate names for images', () => {
      finder = new PlaceholderFinder();

      assert.strictEqual(finder.generateImagePlaceholderName('/logo.png', 0), 'LOGO_URL');
      assert.strictEqual(finder.generateImagePlaceholderName('/banner.jpg', 1), 'IMAGE_URL_1');
    });
  });
});