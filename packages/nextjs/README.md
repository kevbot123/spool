# @spool/nextjs

The beautiful headless CMS for Next.js developers.

## Installation

```bash
npm install @spool/nextjs
```

## Quick Start

### 1. Run the setup command

```bash
# Option 1: Try the CLI command
npx spool-setup

# Option 2: If CLI doesn't work, use Node directly
node -e "require('@spool/nextjs').createSpoolRoute()"
```

This automatically creates the API route file for you! Or manually create it:

```typescript
// app/api/spool/[...route]/route.ts
import { createSpoolHandler } from '@spool/nextjs';

export const { GET, POST, PUT, DELETE } = createSpoolHandler({
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!
});
```

### 2. Set up environment variables

```bash
SPOOL_API_KEY=your_api_key_here
SPOOL_SITE_ID=your_site_id_here
```

### 3. Start using content

```typescript
import { getSpoolContent } from '@spool/nextjs';

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getSpoolContent(
    {
      apiKey: process.env.SPOOL_API_KEY!,
      siteId: process.env.SPOOL_SITE_ID!
    },
    'blog',
    params.slug
  );

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.body }} />
    </article>
  );
}
```

## Features

- ✅ Real-time content editing
- ✅ Beautiful admin interface  
- ✅ AI-native markdown content
- ✅ SEO optimization built-in
- ✅ Zero-config setup

## Documentation

Visit [docs.spool.dev](https://docs.spool.dev) for complete documentation.

## License

MIT 