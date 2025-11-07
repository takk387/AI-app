/**
 * Token Count Verification Script
 * Measures actual token usage of Phase 3 optimized prompts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Approximate token counter (chars / 4 is a reasonable estimate for English text)
function estimateTokens(text) {
  return Math.round(text.length / 4);
}

// Extract exported constant from TypeScript file
function extractExportedConst(filePath, constName) {
  const content = readFileSync(join(projectRoot, filePath), 'utf-8');
  const regex = new RegExp(`export const ${constName} = \`([\\s\\S]*?)\`\\.trim\\(\\);`, 'm');
  const match = content.match(regex);
  if (!match) {
    throw new Error(`Could not extract ${constName} from ${filePath}`);
  }
  return match[1].trim();
}

// Build the modify prompt manually
function buildModifyPrompt(baseInstructions) {
  const COMPONENT_SYNTAX_RULES = extractExportedConst('src/prompts/common/component-syntax.ts', 'COMPONENT_SYNTAX_RULES');
  const AST_OPERATIONS_COMPRESSED = extractExportedConst('src/prompts/modify/ast-operations-compressed.ts', 'AST_OPERATIONS_COMPRESSED');
  const MODIFICATION_EXAMPLES = extractExportedConst('src/prompts/modify/examples-compressed.ts', 'MODIFICATION_EXAMPLES');
  
  return `${baseInstructions}

${COMPONENT_SYNTAX_RULES}

${AST_OPERATIONS_COMPRESSED}

${MODIFICATION_EXAMPLES}

CRITICAL REMINDERS:
- Only JSON output (no conversational text)
- Minimal changes (surgical edits only)
- Exact searchFor patterns
- Preserve existing code unless explicitly requested
`.trim();
}

// Build the full-app prompt manually
function buildFullAppPrompt(baseInstructions, includeImageContext = false, isModification = false) {
  const COMPONENT_SYNTAX_RULES = extractExportedConst('src/prompts/common/component-syntax.ts', 'COMPONENT_SYNTAX_RULES');
  const DELIMITER_FORMAT = extractExportedConst('src/prompts/common/response-format.ts', 'DELIMITER_FORMAT');
  const FRONTEND_RULES_COMPRESSED = extractExportedConst('src/prompts/full-app/frontend-rules-compressed.ts', 'FRONTEND_RULES_COMPRESSED');
  const FULLSTACK_RULES_COMPRESSED = extractExportedConst('src/prompts/full-app/fullstack-rules-compressed.ts', 'FULLSTACK_RULES_COMPRESSED');
  const FULLAPP_EXAMPLES_COMPRESSED = extractExportedConst('src/prompts/full-app/examples-compressed.ts', 'FULLAPP_EXAMPLES_COMPRESSED');
  
  const imageContext = includeImageContext ? `
🎨 IMAGE-INSPIRED DESIGN:
Analyze uploaded image for colors, style, patterns. Apply aesthetic to app design using Tailwind CSS.
` : '';

  const modificationContext = isModification ? `
MODIFICATION MODE:
- Check conversation history for ===INTERNAL_PLAN===
- Maintain consistency with existing architecture
- Classify as MAJOR_CHANGE or MINOR_CHANGE
- Update INTERNAL_PLAN with completed features
- Use exact same delimiter format as new apps
`.trim() : '';

  return `${baseInstructions}
${imageContext}
${modificationContext ? '\n' + modificationContext + '\n' : ''}

${COMPONENT_SYNTAX_RULES}

${DELIMITER_FORMAT}

APPLICATION TYPE DETECTION:
- FRONTEND_ONLY: UI components, calculators, games, dashboards (preview sandbox)
- FULL_STACK: Database, auth, API routes, file uploads (local dev required)

${FRONTEND_RULES_COMPRESSED}

${FULLSTACK_RULES_COMPRESSED}

${FULLAPP_EXAMPLES_COMPRESSED}

REMEMBER:
- Complete code (never truncate mid-line/tag/string)
- Tailwind CSS for styling
- Include setup instructions
`.trim();
}

console.log('🔍 Phase 3 Token Count Verification\n');
console.log('='.repeat(70));

// ============================================================================
// 1. MODIFY ROUTE VERIFICATION
// ============================================================================
console.log('\n📝 MODIFY ROUTE');
console.log('-'.repeat(70));

const modifyBaseInstructions = `You are an expert code modification assistant. Generate MINIMAL, TARGETED changes to existing code - NOT rewrite entire files.

CRITICAL RULES:
1. Change ONLY what user explicitly requested
2. Preserve ALL existing code not mentioned
3. Use surgical edits, not rewrites
4. Think: "What's the SMALLEST change?"

DIFF FORMAT:
- Respond in exact JSON diff format
- NO conversational text, NO markdown, ONLY valid JSON
- Each change must be precise and targeted

CHANGE TYPES: ADD_IMPORT, INSERT_AFTER, INSERT_BEFORE, REPLACE, DELETE, APPEND

SEARCH PATTERNS:
- Use unique, exact code snippets for searchFor
- Include enough context to be unambiguous
- Use actual code from file, not summaries

RESPONSE FORMAT:
\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Brief description",
  "files": [{
    "path": "src/App.tsx",
    "action": "MODIFY",
    "changes": [
      {"type": "ADD_IMPORT", "content": "import { useState } from 'react';"},
      {"type": "INSERT_AFTER", "searchFor": "export default function App() {", "content": "  const [count, setCount] = useState(0);"},
      {"type": "REPLACE", "searchFor": "old code", "replaceWith": "new code"}
    ]
  }]
}
\`\`\`

STAGED MODIFICATIONS:
When conversation history shows "Complex Modification Detected" + user approved:
1. Read ===INTERNAL_PLAN=== from history
2. Plan stages mentally (2-4 stages)
3. Implement ONLY current stage
4. Include stagePlan in response with currentStage, totalStages, nextStages

Current App State:
{"files": [{"path": "src/App.tsx", "content": "sample"}]}`;

const modifyPrompt = buildModifyPrompt(modifyBaseInstructions);
const modifyTokens = estimateTokens(modifyPrompt);

console.log('Base Instructions:', estimateTokens(modifyBaseInstructions), 'tokens');
console.log('Complete Prompt:', modifyTokens, 'tokens');
console.log('Documented Claim: 2,000 tokens');
console.log('Difference:', modifyTokens - 2000, 'tokens');
console.log('Accuracy:', Math.round((Math.min(modifyTokens, 2000) / Math.max(modifyTokens, 2000)) * 100) + '%');

// ============================================================================
// 2. FULL-APP ROUTE VERIFICATION
// ============================================================================
console.log('\n📱 FULL-APP ROUTE');
console.log('-'.repeat(70));

const fullAppBaseInstructions = `You are an expert FULL-STACK Next.js application architect. Generate complete, production-ready applications with both frontend AND backend capabilities.

APPLICATION TYPE DETECTION:
- FRONTEND_ONLY: UI components, calculators, games (preview sandbox)
- FULL_STACK: Database, auth, API routes (local dev required)

COMPLEX APPS - STAGING STRATEGY:
- Target 8K-10K tokens for Stage 1 (core architecture + 2-3 features)
- Build complete apps through conversation, not simplified versions
- NEVER truncate code mid-line/tag/string/function
- Stage 1: Solid foundation, invite extensions
- Conversational descriptions: "I've created your [app]! Want to add [X], [Y], [Z]?"

INTERNAL_PLAN SYSTEM (Hidden from user):
- Track architecture, completed features, deferred features
- Update on modifications for consistency
- Reference when extending app`;

// Test different configurations
const fullAppPromptNew = buildFullAppPrompt(fullAppBaseInstructions, false, false);
const fullAppPromptWithImage = buildFullAppPrompt(fullAppBaseInstructions, true, false);
const fullAppPromptModification = buildFullAppPrompt(fullAppBaseInstructions, false, true);

const fullAppTokensNew = estimateTokens(fullAppPromptNew);
const fullAppTokensImage = estimateTokens(fullAppPromptWithImage);
const fullAppTokensMod = estimateTokens(fullAppPromptModification);

console.log('Configuration: New App (no image)');
console.log('  Complete Prompt:', fullAppTokensNew, 'tokens');
console.log('  Documented Claim: 2,800 tokens');
console.log('  Difference:', fullAppTokensNew - 2800, 'tokens');
console.log('  Accuracy:', Math.round((Math.min(fullAppTokensNew, 2800) / Math.max(fullAppTokensNew, 2800)) * 100) + '%');

console.log('\nConfiguration: New App (with image)');
console.log('  Complete Prompt:', fullAppTokensImage, 'tokens');

console.log('\nConfiguration: Modification');
console.log('  Complete Prompt:', fullAppTokensMod, 'tokens');

// ============================================================================
// 3. MODULE BREAKDOWN
// ============================================================================
console.log('\n📦 MODULE BREAKDOWN');
console.log('-'.repeat(70));

const COMPONENT_SYNTAX_RULES = extractExportedConst('src/prompts/common/component-syntax.ts', 'COMPONENT_SYNTAX_RULES');
const DELIMITER_FORMAT = extractExportedConst('src/prompts/common/response-format.ts', 'DELIMITER_FORMAT');
const AST_OPERATIONS_COMPRESSED = extractExportedConst('src/prompts/modify/ast-operations-compressed.ts', 'AST_OPERATIONS_COMPRESSED');
const MODIFICATION_EXAMPLES = extractExportedConst('src/prompts/modify/examples-compressed.ts', 'MODIFICATION_EXAMPLES');
const FRONTEND_RULES_COMPRESSED = extractExportedConst('src/prompts/full-app/frontend-rules-compressed.ts', 'FRONTEND_RULES_COMPRESSED');
const FULLSTACK_RULES_COMPRESSED = extractExportedConst('src/prompts/full-app/fullstack-rules-compressed.ts', 'FULLSTACK_RULES_COMPRESSED');
const FULLAPP_EXAMPLES_COMPRESSED = extractExportedConst('src/prompts/full-app/examples-compressed.ts', 'FULLAPP_EXAMPLES_COMPRESSED');

console.log('\nCommon Modules:');
console.log('  component-syntax.ts:', estimateTokens(COMPONENT_SYNTAX_RULES), 'tokens');
console.log('    (Used in all routes)');
console.log('  response-format.ts:', estimateTokens(DELIMITER_FORMAT), 'tokens');
console.log('    (Used in full-app route)');

console.log('\nModify Modules:');
console.log('  ast-operations-compressed.ts:', estimateTokens(AST_OPERATIONS_COMPRESSED), 'tokens');
console.log('    (Header claim: ~1200 tokens, Doc claim: 800 tokens)');
console.log('  examples-compressed.ts:', estimateTokens(MODIFICATION_EXAMPLES), 'tokens');
console.log('    (Doc claim: 400 tokens)');

console.log('\nFull-App Modules:');
console.log('  frontend-rules-compressed.ts:', estimateTokens(FRONTEND_RULES_COMPRESSED), 'tokens');
console.log('    (Doc claim: 350 tokens)');
console.log('  fullstack-rules-compressed.ts:', estimateTokens(FULLSTACK_RULES_COMPRESSED), 'tokens');
console.log('    (Doc claim: 200 tokens)');
console.log('  examples-compressed.ts:', estimateTokens(FULLAPP_EXAMPLES_COMPRESSED), 'tokens');
console.log('    (Doc claim: 600 tokens)');

// ============================================================================
// 4. SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('📊 VERIFICATION SUMMARY\n');

const modifyAccurate = Math.abs(modifyTokens - 2000) < 200;
const fullAppAccurate = Math.abs(fullAppTokensNew - 2800) < 300;

console.log('Modify Route:');
console.log('  Claimed: 2,000 tokens');
console.log('  Actual:', modifyTokens, 'tokens');
console.log('  Status:', modifyAccurate ? '✅ ACCURATE' : '⚠️ NEEDS UPDATE');

console.log('\nFull-App Route:');
console.log('  Claimed: 2,800 tokens');
console.log('  Actual:', fullAppTokensNew, 'tokens');
console.log('  Status:', fullAppAccurate ? '✅ ACCURATE' : '⚠️ NEEDS UPDATE');

console.log('\n' + '='.repeat(70));
console.log('\n✅ Verification Complete - See results above for documentation updates needed\n');
