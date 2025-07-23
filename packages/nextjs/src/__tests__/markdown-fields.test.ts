/**
 * Tests for smart markdown field functionality
 * Ensures intuitive developer experience for markdown fields
 */

import { getSpoolContent, __testing__ } from '../utils/content';

const { flattenContentItem } = __testing__;

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock environment to simulate development mode
jest.mock('../utils/environment', () => ({
  detectEnvironment: () => ({
    isServer: false,
    isClient: true,
    isDevelopment: true,
    isProduction: false,
    isReactStrictMode: true,
  }),
  getEnvironmentCacheKey: () => 'client-dev',
}));

describe('Smart Markdown Fields', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createMarkdownField functionality', () => {
    it('should create smart markdown field objects', () => {
      const item = {
        id: '123',
        slug: 'test-post',
        data: {
          title: 'Test Post',
          body: '# Hello World\n\nThis is **markdown** content.',
          body_html: '<h1>Hello World</h1><p>This is <strong>markdown</strong> content.</p>',
          description: 'Simple text field'
        }
      };

      const flattened = flattenContentItem(item);

      // Regular fields should work normally
      expect(flattened.title).toBe('Test Post');
      expect(flattened.description).toBe('Simple text field');

      // Markdown field should be a smart object
      expect(typeof flattened.body).toBe('object');
      >');
      expect(flattened.body.markdown).t
      expect(flattened.body.raw).toBe('# Hello World\n\nThis is **markdown** content.');

      // Default behavior should return HTML
);
      expect(flattened.body.toSt
      expect(flattened.body.valueOf()).toBe('<h1>Hello World</h1><p>This is <strong>markdown</strong> content.</;

      // JSON serialization should rML
      expect(JSON.stringify({ body: flattened.body })).toContain('<h1>Hello World</h1>');

t
      expect(flattened.body_html).toBeUndefined();
    });


      const item = {
        id: '123',
        data: {
          body:.'
          // No body_html field
        }
      };

item);

sts
      expect(typeof flattened.body).toBe('string');
      expect(flattened.body).toBe('# Hello World\n\
    });

() => {
      const item = {
        id: '123',
        data: {
          body:',
          body_html: '<h1>Main Co>',
          excerpt: '**Short description**',
          excerpt_html: '<p><strong>Short d
          title: 'Regular field'
        }
      };

);

cts
      expect(flattened.body.html).toBe('<h1>Main Cont);
      expect(flattened.body.markdown).toBe('# Main Content');
      
;
      expect(flattened.excerpt.markdown).toBe('**Short description**');

ged
      expect(flattened.title).toBe('Regulard');

oved
      expect(flattened.body_html).toBeU);
      expect(flattened.excerpt_html).toBeUndefined
    });
  });

 => {
    const config = {
      apiKey: 'test-key',
      siteId: 'test-site',
      baseUrl: 'http://loc00'
    };

c () => {
      const mockItem = {
        id: '123',
        slug: 'tes
        title: 'Test Post',
        data: {
          body:*.',
          body_html: '<h1>Hello World</h1><p>This is <str',
          author: 'John Doe'
        }
      };


        ok: true,
        json: jes,
        clone: jest.fn().mockReturnThis(),
      } as any);



lly
      expect(result.id).toBe('123');
      expect(result.title).toBe('Tes');
      expect(result.author).toBe('John Doe');

      // Markdown field should be smart object
      expect(result.body.html).toBe('<h1>Hello World</h1><p>T>');

      
      // Default behavior should return HTML
      expect(String(result.body)).toBe('<h1>Hello World</h1><p>This is <strong>markdown</strong>.</p>;
    });

=> {
      const mockItems = [
        {
          id: '1',
          slug:-1',
          data: {
            title: 'Post 1',
         ent',
        
   }
        },
        {
          id: '2',
          slug: 'post-2',
          data: {
2',
            body: '# Post 2 Content',

          }
        }
      ];

{
        ok: true,
        json: jest.fn().),
        clone: jesThis(),
      } as any);

      const result = await getSpoolCo);

      ex2);

      // Both items should have smart ms
      expect(resu
      expect(result[0].body.markdown).toBe('# Post 1;
      
      expect(res);
');
    });
;

  describe('Developer Experience Examples', () => {
    it('should provide intuitive usage patterns', async () => 
      c
     key',
e',
        baseUrl: 'http://localhost:3000'
      };

      const mockItem = {
        id: '123',
        slug: 'test-post',
        
og Post',
          body: '# Hello).',
          body_htm.</p>',
          excerpt: 'Short tion**',
          excerpt_html: '<p>Shp>'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        jckItem),
        s(),
y);

      const post 

      // ✅ New intuitive way - HTML by deft
      expect(Str1>');
>');

ess
      expect(post.body.html).toContain('<h1>He>');
      expect(post.excerpt.html).toContain('<strong>description</st


      expect(post.body.markdown
      expect(post.excerpt.markdown).toBe('Short **description**');

ccess
      expect(post.body.raw).toBe('#.');

      // This demonstrates the improved DX:

      // After:  <div dangerouslySetInnerHTML={{ __ />
      // Or even: <div>{post.body}</div> (fores)
    });

    it('should work with template literals ) => {
      const config = {
        apiKey: 'test-key',
        siteId: 'test-site',
       host:3000'


      const mockItem =
        id: '123',
        data: {
          body: '# Hello World',
        '
      }
      };

      mockFetch{
        ok: true,
        json: jest.fn().mockResolvedVtem),
        cis(),
      } s any);

      const post = await getSpoolConten);

      // Should work in template literals
      const htmlContent = `<div>${post.bod
      expect(htm

      // Should work with string concatenation
ody;
      expect(combined).toBe('Content: <h1>Hello World</h1>';

      // Should work with string methods (on HTML by defa)

      expect(post.body.length).toB);
    });
  });

  des
   );
});});
  }    >');
/h1ld<1>Hello Wor).toBe('<h_htmlt.data.bodyct(pos     expe);
 lo World'oBe('# Hel.body).tataect(post.d     exp
 bility)ompatikward crks for bacill woway (st/ Old       /

);ello World'toBe('# Hkdown).mardy..boexpect(post');
      h1></ld Worlo>Hel'<h1body)).toBe(String(post. expect(ded)
     y (recommen// New wa  
    
l: true });{ renderHtmt-post', tes'blog', 't(config, ntengetSpoolCo= await nst post     co

  any);   } as s(),
   rnThi().mockRetu: jest.fn       clonem),
 kIteedValue(mockResolvfn().mocst.on: jejse,
        : truok       ce({
 lueOndVaockResolvekFetch.m     moc     };

   }
 '
      World</h1>>Hello y_html: '<h1od     bld',
     o Wory: '# Hell       bod
    data: {      '123',
       id: = {
    mockItemconst    };

    0'
    :300st//localhol: 'http:   baseUre',
     d: 'test-sit   siteI   ',
  ey'test-k    apiKey: 
     = {nfigconst co     ) => {
 , async (ct'ata objelds in d_html fielity with mpatibi backward cod maintainit('shoul 