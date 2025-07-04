import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import { ParsedContent, ContentMeta } from '@/types/cms';

export class MarkdownProcessor {
  private processor: any;

  constructor() {
    this.processor = remark()
      .use(remarkGfm)
      .use(remarkHtml);
  }

  async parse(content: string): Promise<ParsedContent> {
    const { data, content: markdownContent } = matter(content);
    
    return {
      data,
      content: markdownContent
    };
  }

  async processMarkdown(content: string): Promise<string> {
    const result = await this.processor.process(content);
    return result.toString();
  }

  stringify(meta: ContentMeta, content: string): string {
    // Clean meta object - remove undefined values and empty strings
    const cleanMeta = Object.entries(meta).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    return matter.stringify(content, cleanMeta);
  }

  validateFrontmatter(meta: ContentMeta, requiredFields: string[]): string[] {
    const errors: string[] = [];
    
    for (const field of requiredFields) {
      if (!meta[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate slug format
    if (meta.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) {
      errors.push('Slug must be lowercase letters, numbers, and hyphens only');
    }
    
    return errors;
  }

  extractExcerpt(content: string, maxLength: number = 160): string {
    // Remove markdown syntax
    const plainText = content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*|__/g, '') // Remove bold
      .replace(/\*|_/g, '') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Extract link text
      .replace(/```[^`]*```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/^[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
      .replace(/\n{2,}/g, ' ') // Replace multiple newlines with space
      .replace(/\n/g, ' ') // Replace single newlines with space
      .trim();
    
    if (plainText.length <= maxLength) {
      return plainText;
    }
    
    // Cut at last complete word
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
  }

  generateTableOfContents(content: string): Array<{ level: number; text: string; slug: string }> {
    const headings: Array<{ level: number; text: string; slug: string }> = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2];
      const slug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      
      headings.push({ level, text, slug });
    }
    
    return headings;
  }

  estimateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}

// Singleton instance
let markdownProcessor: MarkdownProcessor | null = null;

export function getMarkdownProcessor(): MarkdownProcessor {
  if (!markdownProcessor) {
    markdownProcessor = new MarkdownProcessor();
  }
  return markdownProcessor;
} 