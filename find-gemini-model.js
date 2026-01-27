// Test different Gemini model names to find which one works
const { GoogleGenerativeAI } = require('@google/generative-ai');

const possibleModels = [
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
  'gemini-exp-1206',
  'gemini-flash',
  'gemini-pro-vision',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'models/gemini-2.0-flash-exp',
  'models/gemini-flash',
];

async function testModels() {
  // Read from .env.local
  const fs = require('fs');
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const apiKeyMatch = envContent.match(/GOOGLE_API_KEY=(.+)/);
  const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY not found in .env.local');
    return;
  }
  
  console.log('✅ Found API key in .env.local');

  console.log('🔍 Testing Gemini models with your API key...\n');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Simple test image (1x1 red pixel)
  const testImage = {
    inlineData: {
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      mimeType: 'image/png',
    },
  };

  for (const modelName of possibleModels) {
    try {
      console.log(`Testing: ${modelName}...`);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
      });
      
      const result = await model.generateContent([
        'Return JSON: {"test": "success"}',
        testImage
      ]);
      
      const response = result.response.text();
      console.log(`✅ SUCCESS: ${modelName} works!`);
      console.log(`   Response: ${response}\n`);
      
      // Found a working model, save it
      require('fs').writeFileSync('working-model.txt', modelName);
      console.log(`💾 Saved working model name to: working-model.txt\n`);
      break;
      
    } catch (error) {
      if (error.message.includes('API_KEY_INVALID')) {
        console.log(`❌ ${modelName} - API key invalid\n`);
      } else if (error.message.includes('not found')) {
        console.log(`❌ ${modelName} - model not found\n`);
      } else {
        console.log(`❌ ${modelName} - ${error.message}\n`);
      }
    }
  }
}

testModels().catch(console.error);
