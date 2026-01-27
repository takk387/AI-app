// Test script to call the layout analyze API and see what's returned
const fs = require('fs');
const path = require('path');

async function testAnalyzeAPI() {
  // Create a simple test image (1x1 red pixel PNG in base64)
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

  console.log('🧪 Testing Layout Analyze API...\n');

  try {
    const response = await fetch('http://localhost:3000/api/layout/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze-image',
        image: testImageBase64,
        instructions: 'Create a simple header and hero section'
      })
    });

    console.log('📡 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ API Response received');
    console.log('📊 Component Count:', Array.isArray(data) ? data.length : 'Not an array!');
    console.log('\n🔍 Full Response:');
    console.log(JSON.stringify(data, null, 2));

    // Check if components have required structure
    if (Array.isArray(data) && data.length > 0) {
      console.log('\n🧬 First Component Structure:');
      const first = data[0];
      console.log('  ✓ Has id:', !!first.id);
      console.log('  ✓ Has type:', !!first.type);
      console.log('  ✓ Has bounds:', !!first.bounds);
      console.log('  ✓ Has style:', !!first.style);
      if (first.bounds) {
        console.log('  ✓ Bounds:', first.bounds);
      }
    }

    // Save to file for inspection
    fs.writeFileSync(
      path.join(__dirname, 'api-response.json'),
      JSON.stringify(data, null, 2)
    );
    console.log('\n💾 Response saved to: api-response.json');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error(error.stack);
  }
}

testAnalyzeAPI();
