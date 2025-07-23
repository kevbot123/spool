/**
 * MarkdownField class provides an intuitive interface for markdown fields
 * Defaults to HTML output but allows access to raw markdown
 */

export class MarkdownField {
  private _html: string;
  private _markdown: string;

  constructor(markdown: string, html?: string) {
    this._markdown = markdown || '';
    this._html = html || markdown || '';
  }

  /**
   * Default behavior: return HTML when field is used directly
   * This allows: <div dangerouslySetInnerHTML={{ __html: post.body }} />
   * Or even simpler: <div>{post.body}</div> (though this won't render HTML)
   */
  toString(): string {
    return this._html;
  }

  /**
   * Explicit HTML access
   */
  get html(): string {
    return this._html;
  }

  /**
   * Explicit markdown access
   */
  get markdown(): string {
    return this._markdown;
  }

  /**
   * For JSON serialization
   */
  toJSON(): string {
    return this._html;
  }

  /**
   * For template literal usage
   */
  valueOf(): string {
    return this._html;
  }

  /**
   * Check if field has content
   */
  get isEmpty(): boolean {
    return !this._markdown && !this._html;
  }

  /**
   * Get length of HTML content
   */
  get length(): number {
    return this._html.length;
  }
}

/**
 * Create a MarkdownField instance
 */
export function createMarkdownField(markdown: string, html?: string): MarkdownField {
  return new MarkdownField(markdown, html);
}

/**
 * Check if a value is a MarkdownField
 */
export function isMarkdownField(value: any): value is MarkdownField {
  return value instanceof MarkdownField;
}