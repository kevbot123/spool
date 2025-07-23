/**
 * Test for smart markdown field functionality
 */

import { __testing__ } from '../utils/content';

const { flattenContentItem } = __testing__;

describe('Smart Markdown Fields', () => {
  it('should create smart markdown field objects', () => {
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

    // Markdown field should be a smart object
    expect(typeof flattened.body).toBe('object');
    expect(flattened.body.html).toBe('<h1>Hello World</h1><p>This is <strong>markdown</strong>.</p>');
    expect(flattened.body.markdown).toBe('# Hello World\n\nThis is **markdown**.');
    expect(flattened.body.raw).toBe('# Hello World\n\nThis is **markdown**.');

    // Default behavior should return HTML
    expect(String(flattened.body)).toBe('<h1>Hello World</h1><p>This is <strong>markdown</strong>.</p>');
    expect(flattened.body.toString()).toBe('<h1>Hello World</h1><p>This is <strong>markdown</strong>.</p>');

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

    // Should remain a regular string
    expect(typeof flattened.body).toBe('string');
    expect(flattened.body).toBe('# Hello World');
  });
});