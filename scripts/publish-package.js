#!/usr/bin/env node

/**
 * Publish the @spoolcms/nextjs package
 * Usage: node scripts/publish-package.js [--dry-run]
 */

const { execSync } = require('child_process');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run');
const packageDir = path.join(__dirname, '../packages/nextjs');

console.log('📦 Publishing @spoolcms/nextjs package...\n');

try {
  // Change to package directory
  process.chdir(packageDir);
  
  console.log('🔍 Current directory:', process.cwd());
  console.log('📋 Package info:');
  
  // Show package info
  const packageJson = require(path.join(packageDir, 'package.json'));
  console.log(`   Name: ${packageJson.name}`);
  console.log(`   Version: ${packageJson.version}`);
  console.log(`   Description: ${packageJson.description}\n`);
  
  // Run tests
  console.log('🧪 Running tests...');
  execSync('npm test -- --testPathPattern=webhook.test.ts', { stdio: 'inherit' });
  console.log('✅ Tests passed!\n');
  
  // Build package
  console.log('🔨 Building package...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed!\n');
  
  // Check if already published
  console.log('🔍 Checking if version is already published...');
  try {
    const publishedInfo = execSync(`npm view ${packageJson.name}@${packageJson.version} version`, { encoding: 'utf8' });
    if (publishedInfo.trim() === packageJson.version) {
      console.log(`❌ Version ${packageJson.version} is already published!`);
      console.log('   Please update the version in package.json first.');
      process.exit(1);
    }
  } catch (error) {
    // Version not found, which is good - we can publish
    console.log('✅ Version not yet published, proceeding...\n');
  }
  
  if (isDryRun) {
    console.log('🔍 DRY RUN - Would publish with:');
    execSync('npm publish --dry-run', { stdio: 'inherit' });
    console.log('\n✅ Dry run completed successfully!');
    console.log('   Run without --dry-run to actually publish.');
  } else {
    // Publish package
    console.log('🚀 Publishing to npm...');
    execSync('npm publish', { stdio: 'inherit' });
    console.log('\n🎉 Package published successfully!');
    
    console.log('\n📚 Next steps:');
    console.log('1. Update integration guides with new version');
    console.log('2. Test the published package in a real project');
    console.log('3. Update documentation if needed');
    console.log('\n📦 Install the new version with:');
    console.log(`   npm install ${packageJson.name}@${packageJson.version}`);
  }
  
} catch (error) {
  console.error('\n❌ Error during publish process:');
  console.error(error.message);
  process.exit(1);
}