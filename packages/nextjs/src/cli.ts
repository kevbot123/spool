#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join } from 'path';

const ROUTE_TEMPLATE = `import { createSpoolHandler } from '@spool/nextjs';

export const { GET, POST, PUT, DELETE } = createSpoolHandler({
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!,
});`;

const PAGES_ROUTE_TEMPLATE = `import { createSpoolHandler } from '@spool/nextjs';

const handler = createSpoolHandler({
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!,
});

export default handler;`;

const ENV_TEMPLATE = `# Add these to your .env.local file:
SPOOL_API_KEY=your_api_key_here
SPOOL_SITE_ID=your_site_id_here`;

async function createSpoolRoute() {
  const cwd = process.cwd();
  console.log(`🔎 Current working directory: ${cwd}`);

  // Detect project structure (root or src/)
  console.log('🔎 Checking for Next.js project structure...');
  let baseDir: string | null = null;
  
  const appPath = join(cwd, 'app');
  const pagesPath = join(cwd, 'pages');
  const srcAppPath = join(cwd, 'src', 'app');
  const srcPagesPath = join(cwd, 'src', 'pages');

  console.log(`   - Checking for: ${appPath}`);
  const hasAppDir = await fs.access(appPath).then(() => true).catch(() => false);
  
  console.log(`   - Checking for: ${pagesPath}`);
  const hasPagesDir = await fs.access(pagesPath).then(() => true).catch(() => false);
  
  console.log(`   - Checking for: ${srcAppPath}`);
  const hasSrcApp = await fs.access(srcAppPath).then(() => true).catch(() => false);
  
  console.log(`   - Checking for: ${srcPagesPath}`);
  const hasSrcPages = await fs.access(srcPagesPath).then(() => true).catch(() => false);

  if (hasAppDir) {
    baseDir = 'app';
  } else if (hasPagesDir) {
    baseDir = 'pages';
  } else if (hasSrcApp) {
    baseDir = join('src', 'app');
  } else if (hasSrcPages) {
    baseDir = join('src', 'pages');
  }
  
  if (baseDir) {
    console.log(`✅ Found Next.js directory: ${baseDir}`);
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
    await fs.writeFile(routeFile, PAGES_ROUTE_TEMPLATE);
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