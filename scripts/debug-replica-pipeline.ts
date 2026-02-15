

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getTitanPipelineService } from '../src/services/TitanPipelineService';
import type { AppContext, FileInput } from '../src/types/titanPipeline';

// FORCE LOAD .env.local
const envPath = path.resolve('c:/Users/willi/Projects/Ai-appy2/AI-app/.env.local');
if (fs.existsSync(envPath)) {
  console.log('Loading .env.local from:', envPath);
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.warn('WARNING: .env.local not found at', envPath);
}

// Mock minimal AppContext
const mockAppContext: AppContext = {
  name: 'Debug Replica',
  description: 'Debugging exact replica pipeline',
  features: [],
  technicalStack: {
    frontend: 'react',
    styling: 'tailwind',
    backend: 'none',
    database: 'none'
  }
};

async function runDebug() {
  try {
    console.log('--- Starting Debug Replica Pipeline ---');

    // 1. Load sample image
    const imagePath = path.resolve('node_modules/@codesandbox/sandpack-client/sandpack/static/img/logo.png');
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Sample image not found at ${imagePath}`);
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const fileInput: FileInput = {
      filename: 'logo.png',
      mimeType: 'image/png',
      base64: base64Image
    };

    console.log(`Loaded image: ${fileInput.filename} (${imageBuffer.length} bytes)`);

    // 2. Run Pipeline in CREATE mode with "Exact Replica" prompt
    console.log('Invoking TitanPipelineService.runPipeline...');
    
    const result = await getTitanPipelineService().runPipeline(
      {
        files: [fileInput],
        instructions: 'Make an exact replica of this logo. Pixel perfect.',
        currentCode: null,
        appContext: mockAppContext
      }
    );

    console.log('--- Pipeline Complete ---');
    console.log('Strategy Mode:', result.strategy.mode);

    // 3. Inspect Manifests for Assets
    if (result.manifests && result.manifests.length > 0) {
      const manifest = result.manifests[0];
      console.log('\n--- Manifest Analysis ---');
      console.log('Manifest Canvas:', manifest.canvas);
      
      const assets = manifest.global_theme?.assets || [];
      console.log(`Detected Assets Needed: ${assets.length}`);
      assets.forEach(a => console.log(` - ${a}`));

      // Check extracted assets if available (might process extracted assets internally)
      // The service merges them. Let's check the generated code for asset URLs.
    } else {
      console.log('\nNO MANIFESTS GENERATED');
    }

    // 4. Inspect Generated Code
    if (result.files && result.files.length > 0) {
      const appFile = result.files.find(f => f.path.endsWith('App.tsx'));
      if (appFile) {
        console.log('\n--- Generated App.tsx (Snippet) ---');
        console.log(appFile.content.substring(0, 500) + '...');
        
        // Scan for evidence of asset usage
        if (appFile.content.includes('<img')) {
          console.log('\n[SUCCESS] Found <img> tags in code.');
        } else {
           console.log('\n[WARNING] No <img> tags found in code.');
        }
        
        if (appFile.content.includes('extractedAssetUrl')) {
             console.log('[SUCCESS] Found extractedAssetUrl references.');
        }
      }
    } else {
      console.log('\nNO FILES GENERATED');
    }

  } catch (error) {
    console.error('Pipeline Failed:', error);
  }
}

runDebug();
