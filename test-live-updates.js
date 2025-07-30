const { execSync } = require('child_process');

async function testLiveUpdates() {
  console.log('🧪 Testing live updates...\n');
  
  // Step 1: Get initial content
  console.log('1. Getting initial content...');
  try {
    const initialResponse = execSync('curl -s http://localhost:3000/blog', { encoding: 'utf8' });
    const initialCount = (initialResponse.match(/tryin sdgdfh/g) || []).length;
    console.log(`   Found ${initialCount} instances of test post\n`);
    
    // Step 2: Test revalidation endpoint
    console.log('2. Testing revalidation endpoint...');
    const revalidateResponse = execSync('curl -s -X POST "http://localhost:3000/api/revalidate?path=/blog"', { encoding: 'utf8' });
    console.log(`   Revalidation response: ${revalidateResponse}\n`);
    
    // Step 3: Check content after revalidation
    console.log('3. Checking content after revalidation...');
    setTimeout(() => {
      const afterResponse = execSync('curl -s http://localhost:3000/blog', { encoding: 'utf8' });
      const afterCount = (afterResponse.match(/tryin sdgdfh/g) || []).length;
      console.log(`   Found ${afterCount} instances of test post after revalidation\n`);
      
      // Step 4: Test multiple revalidations
      console.log('4. Testing multiple revalidations...');
      for (let i = 1; i <= 5; i++) {
        const resp = execSync(`curl -s -X POST "http://localhost:3000/api/revalidate?path=/blog&test=${i}"`, { encoding: 'utf8' });
        console.log(`   Revalidation ${i}: ${resp}`);
      }
      
      console.log('\n✅ Test completed. If live updates are working:');
      console.log('   - All revalidation calls should return "OK"');
      console.log('   - Content should remain consistent');
      console.log('   - No render phase errors should occur');
      console.log('\n📝 To test actual content changes:');
      console.log('   1. Edit the "tryin sdgdfh" post in your Spool admin');
      console.log('   2. Watch the browser page refresh automatically');
      console.log('   3. Verify changes appear within 5-10 seconds');
      
    }, 1000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLiveUpdates(); 