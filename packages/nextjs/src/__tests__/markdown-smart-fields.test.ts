/**
 * Test for smart markdown field functionality
 */

import { __testing__ } from '../utils/content';

const { flattenContentItem } = __testing__;

describe('Smart Markdown Fields', () => {
  it('should create React-serializable markdown fields', () => {
    const item = {
      id: '123',
      data: {
        body: '# Hello World\n\nThis is **markdown**.',
        body_html: '<h1>Hello World</h1><p>This is <strong>markdown</strong>.</p>',
        title: 'Regular field'
      }
    };

    const flattened = flattenContentItem(item);

    // Regular field should work normally
    expect(flattened.title).toBe('Regular field');

    // Markdown field should default to HTML (React-serializable string)
    expect(typeof flattened.body).toBe('string');
    expect(flattened.body).toBe('<h1>Hello World</h1><p>This is <strong>markdown</strong>.</p>');

    // Raw markdown should be accessible via _markdown field
    expect(flattened.body_markdown).toBe('# Hello World\n\nThis is **markdown**.');

    // The _html field should be removed
    expect(flattened.body_html).toBeUndefined();
  });

  it('should handle fields without HTML version', () => {
    const item = {
      id: '123',
      data: {
        body: '# Hello World'
        // No body_html field
      }
    };

    const flattened = flattenContentItem(item);

    // Should remain a regular string with raw markdown
    expect(typeof flattened.body).toBe('string');
    expect(flattened.body).toBe('# Hello World');
    expect(flattened.body_markdown).toBeUndefined();
  });
});