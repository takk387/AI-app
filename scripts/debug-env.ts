
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

console.log('--- Debug Env v2 ---');
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

console.log('Checking for .env.local at:', envLocalPath);
if (fs.existsSync(envLocalPath)) {
  console.log('Found .env.local');
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.log('MISSING: .env.local');
}

console.log('Checking for .env at:', envPath);
if (fs.existsSync(envPath)) {
    console.log('Found .env');
    dotenv.config({ path: envPath });
}

console.log('GOOGLE_API_KEY present:', !!process.env.GOOGLE_API_KEY);
console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);

// Also try loading via next/env if available (mocking next's behavior)
try {
    const { loadEnvConfig } = require('@next/env');
    const projectDir = process.cwd();
    loadEnvConfig(projectDir);
    console.log('Loaded via @next/env');
    console.log('GOOGLE_API_KEY (next):', !!process.env.GOOGLE_API_KEY);
    console.log('GEMINI_API_KEY (next):', !!process.env.GEMINI_API_KEY);
} catch (e) {
    console.log('Could not load @next/env:', e.message);
}
