// Simple test script to verify the "Body is unusable" fix
const { getSpoolContent } = require('./dist/utils/content');

const testConfig = {
  apiKey: 'test-key',
  siteId: 'test-site',
  baseUrl: 'https://httpbin.org', // Use httpbin for testing
};

async function testFix() {
  console.log('Testing SpoolCMS Next.js helper fix...');
  
  try {
    // Test 1: Normal error handling (404)
    console.log('\n1. Testing 404 error handling...');
    const result1 = await getSpoolContent(testConfig, 'nonexistent');
    console.log('✅ 404 handled gracefully, returned:', result1);
    
    // Test 2: Network error handling
    console.log('\n2. Testing network error handling...');
    const badConfig = { ...testConfig, baseUrl: 'https://nonexistent-domain-12345.com' };
    const result2 = await getSpoolContent(badConfig, 'test');
    console.log('✅ Network error handled gracefully, returned:', result2);
    
    // Test 3: Concurrent requests
    console.log('\n3. Testing concurrent requests...');
    const promises = [
      getSpoolContent(testConfig, 'test1'),
      getSpoolContent(testConfig, 'test2'),
      getSpoolContent(testConfig, 'test3'),
    ];
    const results = await Promise.all(promises);
    console.log('✅ Concurrent requests handled gracefully, returned:', results.length, 'results');
    
    console.log('\n🎉 All tests passed! The "Body is unusable" error has been fixed.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testFix();