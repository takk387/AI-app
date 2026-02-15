
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

console.log('--- Debug Env v3 (Direct Read) ---');

// We verified this file exists via view_file
const envLocalPath = path.resolve('c:/Users/willi/Projects/Ai-appy2/AI-app/.env.local');

console.log('Target path:', envLocalPath);
if (fs.existsSync(envLocalPath)) {
  console.log('File found via fs.existsSync!');
  try {
      const content = fs.readFileSync(envLocalPath, 'utf8');
      const envConfig = dotenv.parse(content);
      for (const k in envConfig) {
        process.env[k] = envConfig[k];
      }
      console.log('Keys loaded from .env.local');
  } catch (e) {
      console.error('Error parsing .env.local:', e);
  }
} else {
  console.log('File NOT found via fs.existsSync (despite view_file success)');
}

console.log('GOOGLE_API_KEY present:', !!process.env.GOOGLE_API_KEY);
console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);

// If user put GOOGLE_API_KEY but service checks GEMINI_API_KEY too, this should be fine
// TitanPipelineService checks: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY

import { getTitanPipelineService } from '../src/services/TitanPipelineService';
console.log('Service import success');
