#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join } from 'path';

const ROUTE_TEMPLATE = `import { createSpoolHandler } from '@spool/nextjs';

export const { GET, POST, PUT, DELETE } = createSpoolHandler({
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!
});`;

const ENV_TEMPLATE = `# Add these to your .env.local file:
SPOOL_API_KEY=your_api_key_here
SPOOL_SITE_ID=your_site_id_here`;

async function createSpoolRoute() {
  const cwd = process.cwd();
  
  // Detect if it's app router or pages router
  const hasAppDir = await fs.access(join(cwd, 'app')).then(() => true).catch(() => false);
  const hasPagesDir = await fs.access(join(cwd, 'pages')).then(() => true).catch(() => false);
  
  // Detect project structure (root or src/)
  let baseDir: string | null = null;
  if (hasAppDir) {
    baseDir = 'app';
  } else if (hasPagesDir) {
    baseDir = 'pages';
  } else {
    // Check src/ variant
    const hasSrcApp = await fs.access(join(cwd, 'src', 'app')).then(() => true).catch(() => false);
    const hasSrcPages = await fs.access(join(cwd, 'src', 'pages')).then(() => true).catch(() => false);

    if (hasSrcApp) baseDir = join('src', 'app');
    else if (hasSrcPages) baseDir = join('src', 'pages');
  }

  if (!baseDir) {
    console.error('❌ This doesn\'t appear to be a Next.js project. Make sure you\'re in the project root (app/ or pages/ folder not found).');
    process.exit(1);
  }

  const isAppRouter = baseDir.endsWith('app');
  const routeDir = isAppRouter
    ? join(cwd, baseDir, 'api', 'spool', '[...route]')
    : join(cwd, baseDir, 'api', 'spool');

  await fs.mkdir(routeDir, { recursive: true });

  if (isAppRouter) {
    const routeFile = join(routeDir, 'route.ts');
    await fs.writeFile(routeFile, ROUTE_TEMPLATE);
    console.log(`✅ Created ${baseDir}/api/spool/[...route]/route.ts`);
  } else {
    const routeFile = join(routeDir, '[...route].ts');
    const pagesTemplate = ROUTE_TEMPLATE.replace('export const { GET, POST, PUT, DELETE }', 'export default');
    await fs.writeFile(routeFile, pagesTemplate);
    console.log(`✅ Created ${baseDir}/api/spool/[...route].ts`);
  }
  
  // Show environment setup
  console.log('\n📝 Environment Setup:');
  console.log(ENV_TEMPLATE);
  console.log('\n🎉 Spool API route created! Start your dev server and visit your admin dashboard.');
}

// Check if called directly
if (require.main === module) {
  createSpoolRoute().catch(console.error);
}

export { createSpoolRoute }; 